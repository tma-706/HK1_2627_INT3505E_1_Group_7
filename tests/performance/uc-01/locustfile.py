"""UC-01 session journeys using the local Google identity fixture."""

import json
import os
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import gevent
import yaml
from locust import HttpUser, task
from locust.exception import StopUser

import locust_reports  # Registers the final CSV writer.
from locust_phases import MeasuredShape

CREATE = "/api/auth/sessions"
REVOKE = CREATE + "/current"
VALIDATE = REVOKE + "/validate"
PROFILE_NAME = os.environ["LF_PERF_PROFILE"]
PROFILES = yaml.safe_load(Path(__file__).with_name("workloads.yml").read_text(encoding="utf-8"))["profiles"]
PROFILE = PROFILES[PROFILE_NAME]
IDENTITIES = iter(json.loads(Path(os.environ["LF_PERF_SESSIONS"]).read_text(encoding="utf-8"))["sessions"])


if "phases" in PROFILE:
    class SessionReconnectShape(MeasuredShape):
        phases = PROFILE["phases"]
        guard = PROFILE["stop_threshold"]


def active_session(body):
    if not isinstance(body, dict) or not isinstance(body.get("accountId"), str) or not body["accountId"]:
        return False
    try:
        return datetime.fromisoformat(body["expiresAt"]) > datetime.now(timezone.utc)
    except (KeyError, TypeError, ValueError):
        return False


class SessionUser(HttpUser):
    def on_start(self):
        self.identity = next(IDENTITIES, None)
        if self.identity is None:
            raise RuntimeError("A distinct fixture identity is required for each user")
        self.client.verify = os.environ["LF_PERF_CA"]

    def request(self, method, path, status, validate, *, label=None, payload=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        with self.client.request(
            method, path, name=label or path, json=payload, headers=headers,
            allow_redirects=False, timeout=PROFILE["request_timeout_seconds"], catch_response=True,
        ) as response:
            if response.status_code != status or response.headers.get("Cache-Control") != "no-store":
                response.failure(f"Unexpected status or cache header (HTTP {response.status_code})")
                return None
            try:
                body = response.json() if status != 204 else response.content
            except ValueError:
                response.failure("Response is not JSON")
                return None
            if not validate(body, response.headers):
                response.failure("Response does not match the UC-01 contract or fixture session")
                return None
            response.success()
            return body

    def login(self, attempt, *, device="android", label=None, matches=None, other=None):
        def valid(body, _headers):
            if not active_session(body) or not re.fullmatch(r"[A-Za-z0-9_-]{43}", str(body.get("sessionToken"))):
                return False
            if matches is not None:
                return body == matches
            if other is not None:
                return body["accountId"] == other["accountId"] and body["sessionToken"] != other["sessionToken"]
            return True

        return self.request("POST", CREATE, 200, valid, label=label, payload={
            "idToken": self.identity["token"], "deviceType": device, "attemptId": str(attempt),
        })

    def validate(self, session, *, revoked=False, label=None):
        def valid(body, headers):
            if revoked:
                return body == {"code": "SESSION_INVALID"} and headers.get("WWW-Authenticate") == "Bearer"
            return active_session(body) and body["accountId"] == session["accountId"] and "sessionToken" not in body

        return self.request("POST", VALIDATE, 401 if revoked else 200, valid,
                            label=label, token=session["sessionToken"])

    def revoke(self, session, label=None):
        self.request("DELETE", REVOKE, 204, lambda body, _headers: body == b"",
                     label=label, token=session["sessionToken"])

    @task
    def journey(self):
        attempt = uuid4()
        primary = self.login(attempt)
        if primary is None:
            raise StopUser()

        if PROFILE_NAME == "smoke":
            self.login(attempt, label=CREATE + " [replay]", matches=primary)
            other = self.login(uuid4(), device="ios", label=CREATE + " [second-device]", other=primary)
            self.validate(primary)
            self.revoke(primary)
            self.revoke(primary, label=REVOKE + " [replay]")
            self.validate(primary, revoked=True, label=VALIDATE + " [revoked]")
            if other is not None:
                self.validate(other, label=VALIDATE + " [other-device]")
                self.revoke(other)
            raise StopUser()

        for _ in range(random.randint(*PROFILE["reopens_per_session"])):
            gevent.sleep(random.uniform(*PROFILE["wait_between_actions_seconds"]))
            if self.validate(primary) is None:
                break
        self.revoke(primary)
        gevent.sleep(random.uniform(*PROFILE["wait_between_actions_seconds"]))
