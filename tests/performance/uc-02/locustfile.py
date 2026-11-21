"""UC-02 against an isolated fixture Core gateway."""

import json
import os
import random
from pathlib import Path

import gevent
import yaml
from locust import HttpUser, task
from locust.exception import StopUser

import locust_reports  # Registers the final CSV writer.

TAB_NAMES = ("lost", "found", "claims")
PROFILE_NAME = os.environ["LF_PERF_PROFILE"]
PROFILES = yaml.safe_load(Path(__file__).with_name("workloads.yml").read_text(encoding="utf-8"))["profiles"]
PROFILE = PROFILES[PROFILE_NAME]
SESSIONS = iter(json.loads(Path(os.environ["LF_PERF_SESSIONS"]).read_text(encoding="utf-8"))["sessions"])


class MyAreaUser(HttpUser):
    def on_start(self):
        self.fixture = next(SESSIONS, None)
        if self.fixture is None:
            raise RuntimeError("A distinct fixture session is required for each user")
        self.client.headers["Authorization"] = f"Bearer {self.fixture['token']}"
        self.client.verify = os.environ["LF_PERF_CA"]

    def wait_time(self):
        return random.uniform(*PROFILE["wait_between_journeys_seconds"])

    def think(self):
        if PROFILE_NAME != "smoke":
            gevent.sleep(random.uniform(*PROFILE["wait_between_actions_seconds"]))

    def read(self, path, label, valid, params=None):
        with self.client.get(
            path, name=label, params=params, allow_redirects=False,
            timeout=PROFILE["request_timeout_seconds"], catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"Unexpected HTTP status {response.status_code}")
                return None
            try:
                body = response.json()
            except ValueError:
                response.failure("Response is not JSON")
                return None
            if not isinstance(body, dict) or response.headers.get("Cache-Control") != "no-store" or not valid(body):
                response.failure("Response does not match UC-02 fixture or contract")
                return None
            return body

    def profile(self):
        return self.read("/api/me/profile", "/api/me/profile", lambda body: (
            set(body) == {"email", "displayName", "avatarUrl"}
            and body["email"] == self.fixture["email"]
            and isinstance(body["displayName"], str) and 1 <= len(body["displayName"]) <= 100
            and (body["avatarUrl"] is None or isinstance(body["avatarUrl"], str))
        ))

    def page(self, tab, action, cursor=None, page_index=0):
        params = {"tab": tab}
        if cursor is not None:
            params["cursor"] = cursor
        offset = 20 * page_index

        def valid(body):
            expected = self.fixture["items"][tab]
            expected_ids = expected[offset:offset + 20]
            items = body.get("items")
            if body.get("tab") != tab or not isinstance(items, list):
                return False
            if not all(isinstance(item, dict) for item in items):
                return False
            if [item.get("id") for item in items] != expected_ids:
                return False
            fields = ("title", "status", "sentAt" if tab == "claims" else "postedAt")
            if not all(isinstance(item.get(field), str) and item[field] for item in items for field in fields):
                return False
            if tab == "claims" and any(item.get("role") not in ("sent", "received") for item in items):
                return False
            next_cursor = body.get("nextCursor")
            if len(expected) > offset + 20:
                return isinstance(next_cursor, str) and bool(next_cursor)
            return "nextCursor" in body and next_cursor is None

        return self.read("/api/me/items", f"/api/me/items [{tab}/{action}]", valid, params)

    def read_all_tabs(self):
        if self.profile() is None:
            return
        for tab in TAB_NAMES:
            cursor = None
            for index, _ in enumerate(range(0, len(self.fixture["items"][tab]), 20)):
                self.think()
                page = self.page(tab, "next" if index else "first", cursor, index)
                if page is None:
                    return
                cursor = page["nextCursor"]

    @task
    def journey(self):
        if PROFILE_NAME == "smoke":
            self.profile()
            for tab in TAB_NAMES:
                first = self.page(tab, "first")
                if first and first["nextCursor"]:
                    self.page(tab, "next", first["nextCursor"], 1)
                self.page(tab, "refresh")
            raise StopUser()

        if PROFILE_NAME == "local-deep-pagination":
            self.read_all_tabs()
            raise StopUser()

        weights = PROFILE["weights"]
        journey = random.choices(list(weights), weights=list(weights.values()))[0]
        if self.profile() is None or journey == "profile_only":
            return
        self.think()
        first = self.page("lost", "first")
        if first is None:
            return
        if journey == "paginate":
            self.think()
            if first["nextCursor"]:
                self.page("lost", "next", first["nextCursor"], 1)
            return

        self.think()
        tab = random.choice(TAB_NAMES[1:])
        if self.page(tab, "first") is not None and random.random() < 0.5:
            self.think()
            self.page(tab, "refresh")
