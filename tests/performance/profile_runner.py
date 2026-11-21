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
    parser.add_argument("--ca", type=Path, default=root / "dist/uc01-local/tls/ca.crt")
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
    for path in (shared / "profile_runner.py", shared / "locust_reports.py", shared / "requirements.txt",
                 suite / "locustfile.py", config):
        suite_revision.update(hashlib.sha256(path.read_bytes()).digest())
    suite_fingerprint = suite_revision.hexdigest()
    if fixture["origin"] != args.host:
        parser.error("Fixture origin must match the target")
    sessions = fixture["sessions"]
    if len({entry["token"] for entry in sessions}) != len(sessions) or len(sessions) < profile["users"]:
        parser.error("Provide at least one distinct fixture session per user")
    tabs = suite_config.get("fixture_tabs", [])
    if any(len(entry.get("items", {}).get(tab, [])) != 21 for entry in sessions for tab in tabs):
        parser.error("Each session must have an account with exactly 21 fixture items per tab")

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
        "--host", args.host, "--headless", "--only-summary", "--users", str(profile["users"]),
        "--spawn-rate", str(profile["spawn_rate"]), "--run-time", f"{profile['run_seconds']}s",
        "--stop-timeout", str(profile["stop_timeout_seconds"]), "--csv", str(relative_out / "locust"),
        "--html", str(relative_out / "locust.html"),
    ]
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
    }
    try:
        with urlopen(args.host + "/api/health/ready", context=ssl.create_default_context(cafile=args.ca), timeout=5) as ready:
            if ready.geturl() != args.host + "/api/health/ready" or json.load(ready).get("database") != "ok":
                raise RuntimeError("Core readiness did not confirm the fixture database")
        with (out / "locust.log").open("wb") as log:
            report["status"] = "execution-failed"
            report["locust_exit_code"] = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
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
        if report["locust_exit_code"] == 0 and report["failures"] == 0 and not report["missing_request_groups"]:
            report["status"] = "smoke-passed" if args.profile == "smoke" else "pilot-completed"
    except (OSError, ValueError, KeyError, RuntimeError) as exc:
        report["error"] = str(exc)
    finally:
        (out / "run.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"{report['uc']} {args.profile} {report['status']}: {relative_out}", flush=True)
    return int(report["status"] not in ("smoke-passed", "pilot-completed"))
