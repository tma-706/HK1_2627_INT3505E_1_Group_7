---
name: test-performance
description: When explicitly invoked, design performance workloads and suites from a UC specification, or run and analyze an existing suite using Locust or repository tools. Covers workload design, baseline, spike, stress, soak, breakpoint, and CI SLO checks.
---

# Design and run performance tests

Choose the entry point based on the request. Use the [Lost & Found project context](../../lost-and-found-context.md) to pin the UC and contract versions, identify the local and CI plan, and verify what is runnable in the checkout. Use the OpenAPI mock for contract or routing smoke. Use the real candidate behind Nginx with its actual dependencies for performance claims. Verify staging and existing gates before planning to run them.

## Design a suite

1. Read the UC specification first. Use SCN/PERF to select journeys and the contract to identify operations. If the UC is missing, identify the missing inputs and the exploratory design possible with the sources available.
2. Map the UC question to signals and load profiles using applicable PERF requirements and the project acceptance criteria. For Lost & Found, distinguish HTTP status and latency, PostgreSQL-backed behavior, Worker backlog, retry and DEAD counts, and end-to-end time to a visible result when the journey crosses those layers. Follow the [workload design guide](references/dynamic-workloads.md) to select data, journey mix, arrival rates or concurrent users, phases, sample counts, and limits. Record measurement timing, scope, formulas, error accounting, criteria, and sources for each threshold. For image processing, record request acceptance time and time to a visible result separately when the UC requires both. If thresholds are missing, design the measurement and record that evidence is insufficient for an SLO conclusion.
3. Save the design in `tests/performance/<slug>/`, including the UC version and mapping from profile to SCN/PERF and then to an operation or a signal outside the API. Reuse the existing layout when an existing suite is specified. The design can be handed off before code or staging is available. Record the runner, fixtures, and setup still needed to execute it.

## Run a suite or analyze a run

Use an identified suite, profile, build, and available environment. Read the [Locust execution, analysis, and CI guide](references/execution.md) for the assigned work. If a target is unavailable, continue preparing the design or analyzing existing evidence. Report a profile as executed only when you have the command and result. Record smoke checks, measurements, and conclusions separately for the environment used. Configure a gate or deployment only within the assigned scope using sourced thresholds and valid measurement conditions. Select Locust or the verified project runner. Treat the Docker Compose GitHub Actions template as an integration option and verify the corresponding jobs and commands before use.
