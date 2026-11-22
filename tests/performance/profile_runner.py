"""Run a named local profile and save its Locust reports."""

import argparse
import csv
import hashlib
import json
import os
import ssl
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
from uuid import uuid4

import yaml


def main(suite):
    root = suite.parents[2]
    config = suite / "workloads.yml"
    suite_config = yaml.safe_load(config.read_text(encoding="utf-8"))
    profiles = suite_config["profiles"]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", choices=profiles)
    parser.add_argument("--host", default="https://127.0.0.1:8443")
    parser.add_argument("--sessions", required=True, type=Path)
    parser.add_argument("--ca", type=Path, required=True)
    parser.add_argument("--build", required=True, help="Identifier of the Core build actually under test")
    parser.add_argument("--environment", required=True, help="Gateway and database configuration under test")
    args = parser.parse_args()
    target = urlsplit(args.host)
    if (target.scheme, target.hostname) != ("https", "127.0.0.1") or target.path or target.query or target.fragment or target.username:
        parser.error("Use the isolated loopback HTTPS origin, without a path or credentials")

    profile = profiles[args.profile]
    fixture_bytes = args.sessions.read_bytes()
    fixture = json.loads(fixture_bytes.decode("utf-8"))
    fingerprint = hashlib.sha256(fixture_bytes).hexdigest()
    suite_revision = hashlib.sha256()
    shared = suite.parent
    for path in (shared / "profile_runner.py", shared / "locust_reports.py", shared / "locust_phases.py", shared / "requirements.txt",
                 suite / "locustfile.py", config):
        suite_revision.update(hashlib.sha256(path.read_bytes()).digest())
    suite_fingerprint = suite_revision.hexdigest()
    if fixture["origin"] != args.host:
        parser.error("Fixture origin must match the target")
    sessions = fixture["sessions"]
    if len({entry["token"] for entry in sessions}) != len(sessions) or len(sessions) < profile["users"]:
        parser.error("Provide at least one distinct fixture session per user")
    tabs = suite_config.get("fixture_tabs", [])
    if tabs:
        allowed_sizes = {profile.get("items_per_tab", 21)}
        if args.profile == "smoke":
            allowed_sizes.update(candidate["items_per_tab"] for candidate in profiles.values() if "items_per_tab" in candidate)
        tab_sizes = {len(entry.get("items", {}).get(tab, [])) for entry in sessions for tab in tabs}
        if len(tab_sizes) != 1 or not tab_sizes <= allowed_sizes:
            parser.error(f"All fixture accounts and tabs must have the same item count in {sorted(allowed_sizes)}")

    results = root / "dist/performance" / suite.name
    if profile.get("requires_smoke", False):
        prior_smoke = sorted(results.glob("*/smoke/run.json"), reverse=True)
        if not any(
            report["status"] == "smoke-passed" and report["target"] == args.host
            and report["build"] == args.build and report["fixture_sha256"] == fingerprint
            and report.get("suite_sha256") == suite_fingerprint
            for report in (json.loads(path.read_text(encoding="utf-8")) for path in prior_smoke)
        ):
            parser.error("Run smoke successfully with the same suite, build, origin and fixture first")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:8]
    out = results / run_id / args.profile
    out.mkdir(parents=True)
    relative_out = out.relative_to(root)
    command = [
        sys.executable, "-m", "locust", "-f", str((suite / "locustfile.py").relative_to(root)),
        "--host", args.host, "--headless", "--only-summary",
        "--stop-timeout", str(profile["stop_timeout_seconds"]), "--csv", str(relative_out / "locust"),
        "--html", str(relative_out / "locust.html"),
    ]
    phases = profile.get("phases")
    if phases:
        if sum(phase["seconds"] for phase in phases) != profile["run_seconds"] or max(phase["users"] for phase in phases) != profile["users"]:
            parser.error("Phase durations and peak users must agree with the profile")
    else:
        command.extend(["--users", str(profile["users"]), "--spawn-rate", str(profile["spawn_rate"]),
                        "--run-time", f"{profile['run_seconds']}s"])
    env = os.environ | {
        "LF_PERF_PROFILE": args.profile, "LF_PERF_SESSIONS": str(args.sessions.resolve()),
        "LF_PERF_CA": str(args.ca.resolve()),
        "PYTHONPATH": os.pathsep.join(filter(None, (str(shared), os.environ.get("PYTHONPATH")))),
    }
    report = {
        "target": args.host, "build": args.build, "environment": args.environment,
        "fixture_sha256": fingerprint, "suite_sha256": suite_fingerprint,
        "uc": suite.name.upper(), "profile": args.profile, "config": profile, "command": ["python", *command[1:]],
        "status": "setup-failed", "slo_status": "insufficient_evidence", "locust_exit_code": None,
        "stats_file": "locust_final_stats.csv",
        "start_utc": datetime.now(timezone.utc).isoformat(),
    }
    try:
        with urlopen(args.host + "/api/health/ready", context=ssl.create_default_context(cafile=args.ca), timeout=5) as ready:
            if ready.geturl() != args.host + "/api/health/ready" or json.load(ready).get("database") != "ok":
                raise RuntimeError("Core readiness did not confirm the fixture database")
        with (out / "locust.log").open("wb") as log:
            report["status"] = "execution-failed"
            report["locust_exit_code"] = subprocess.run(
                command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT,
                timeout=profile["run_seconds"] + profile["stop_timeout_seconds"] + 30,
            ).returncode
        with (out / report["stats_file"]).open(encoding="utf-8", newline="") as stats_file:
            rows = {row["Name"]: row for row in csv.DictReader(stats_file)}
        total = rows["Aggregated"]
        report["requests"] = int(total["Request Count"])
        report["failures"] = int(total["Failure Count"])
        report["missing_request_groups"] = [
            name for name in profile["required_requests"] if name not in rows or int(rows[name]["Request Count"]) == 0
        ]
        report["p95_ms"] = float(total["95%"])
        report["requests_per_second"] = float(total["Requests/s"])
        enough_samples = report["requests"] == profile.get("required_total_requests", report["requests"])
        if phases:
            phase_file = out / "locust_phases.json"
            phase_report = json.loads(phase_file.read_text(encoding="utf-8"))
            report["phases_file"] = phase_file.name
            report["early_stop"] = phase_report["early_stop"]
            report["incomplete_windows"] = [
                phase["name"] for phase in phase_report["phases"] if not phase["ticks"] or (
                    "min_samples" in phase and (
                        max(tick["users"] for tick in phase["ticks"]) != phase["users"] or any(
                            phase["requests"].get(name, {}).get("count", 0) < phase["min_samples"]
                            for name in profile["required_requests"]
                        )
                    )
                )
            ]
            enough_samples = phase_report["completed"] and not report["incomplete_windows"]
            if report["early_stop"]:
                report["status"] = "guard-stopped"
        if report["locust_exit_code"] == 0 and report["failures"] == 0 and not report["missing_request_groups"] and enough_samples:
            report["status"] = {"smoke": "smoke-passed", "local-pilot": "pilot-completed"}.get(args.profile, "scenario-completed")
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as exc:
        report["error"] = str(exc)
    finally:
        report["end_utc"] = datetime.now(timezone.utc).isoformat()
        (out / "run.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"{report['uc']} {args.profile} {report['status']}: {relative_out}", flush=True)
    return int(report["status"] not in ("smoke-passed", "pilot-completed", "scenario-completed"))
