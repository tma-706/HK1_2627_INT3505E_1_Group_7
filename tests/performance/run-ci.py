"""Run the accumulated UC profiles against one isolated Core build."""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import yaml


def main():
    directory = Path(__file__).resolve().parent
    root = directory.parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", required=True)
    parser.add_argument("--environment", default="compose-ci")
    parser.add_argument("--port", type=int, default=int(os.environ.get("UC01_HTTPS_PORT", "8443")))
    parser.add_argument("--ca", type=Path, default=root / "dist/uc01-local/tls/ca.crt")
    parser.add_argument("--fixture-dir", type=Path, help="Use pre-provisioned <uc>.json fixtures for an isolated local build")
    args = parser.parse_args()

    manifest = yaml.safe_load((directory / "ci.yml").read_text(encoding="utf-8"))["pre-deploy"]
    if not manifest:
        parser.error("Register at least one pre-deploy UC suite in ci.yml")
    for uc, profiles in manifest.items():
        if not profiles or profiles[0] != "smoke" or len(set(profiles)) != len(profiles):
            parser.error(f"{uc} must start with smoke and register each profile once")

    args.ca = args.ca.resolve()
    origin = f"https://127.0.0.1:{args.port}"
    env = os.environ | {"NODE_EXTRA_CA_CERTS": str(args.ca), "UC01_HTTPS_PORT": str(args.port)}
    report = {"build": args.build, "target": origin, "environment": args.environment, "profiles": []}

    for uc, profiles in manifest.items():
        suite = directory / uc
        try:
            if args.fixture_dir:
                fixture = (args.fixture_dir / f"{uc}.json").resolve(strict=True)
            else:
                output = subprocess.run(
                    ["node", str(suite / "fixture.mjs")], cwd=root, env=env,
                    stdout=subprocess.PIPE, text=True, check=True,
                ).stdout.strip()
                fixture = (root / output).resolve(strict=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            print(f"{uc}: fixture setup failed: {exc}", file=sys.stderr, flush=True)
            report["profiles"].extend({"uc": uc, "profile": profile, "status": "fixture-failed"} for profile in profiles)
            continue

        smoke_passed = True
        for profile in profiles:
            entry = {"uc": uc, "profile": profile, "status": "smoke-failed"}
            report["profiles"].append(entry)
            if not smoke_passed:
                print(f"{uc} {profile}: skipped after smoke failure", flush=True)
                continue
            result = subprocess.run([
                sys.executable, str(suite / "run.py"), profile, "--host", origin, "--ca", str(args.ca),
                "--sessions", str(fixture), "--build", args.build, "--environment", args.environment,
            ], cwd=root)
            entry["status"] = "completed" if result.returncode == 0 else "failed"
            entry["exit_code"] = result.returncode
            if profile == "smoke":
                smoke_passed = result.returncode == 0

    path = root / "dist/performance" / f"ci-{uuid4().hex}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(path.relative_to(root), flush=True)
    return int(any(row["status"] != "completed" for row in report["profiles"]))


if __name__ == "__main__":
    sys.exit(main())
