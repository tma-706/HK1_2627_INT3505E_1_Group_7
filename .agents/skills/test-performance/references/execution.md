# Run performance suites and analyze results

Use this reference when asked to execute a suite or analyze results. Read the existing suite and configuration. Verify the entry point, synthetic data, authorization, URL, actual build, and environment limits. Check [measurement and stop conditions](run-validation.md) before generating load. For in-scope CI work, read the [gate integration guide](ci-pre-deploy.md).

Save HTML, CSV, commands, and effective configuration by run ID and profile in the suite's results directory or CI artifacts. Reuse existing paths when rerunning a suite. For Lost & Found, store results by revision outside Git.

## Verify scripts and run smoke checks

- When implementing a Locust generator, create or update `locustfile.py` with `HttpUser`, journeys, and wait times from the selected profile. For token-based APIs, acquire tokens in `on_start`, set timeouts, handle login failures and expiration according to the contract, and group login separately. Set `name` to group dynamic URLs by route template.
- Use `catch_response=True` to verify status and required data. Mark an expected business response as valid only when the test context, status, and error body match the specification. Record its count and how each SLI treats it. Record unexpected business errors, authentication errors, network errors, timeouts, 5xx responses, and contract mismatches.
- Provide a reproducible CLI command using `--headless`, `--csv`, and `--html`. Run smoke checks on the planned target. For pre-deployment CI, wait for the ephemeral build to become ready, then run smoke and the project's regression profiles. On staging, verify the version and run smoke before increasing load. Save HTML, CSV, and the executed command. Record required-flow smoke results separately from the gate result. Fix script, authentication, or data issues and retry until required flows are verified or a specific blocker remains.

## Execute load tests

- After smoke verifies required flows, run the planned profiles within environment limits. If smoke is valid and a gate reports a performance failure, check for overload before increasing load. When a stop condition triggers, save results, time, load level, triggering metric, and reason. Verify recovery before the next run.
- Enforce runtime stop thresholds for spike, stress, and breakpoint tests according to the [measurement and validation rules](run-validation.md). Test the threshold and stop branches before using them on staging. If the permitted load ceiling is reached before the breakpoint, record the highest verified level and the range explored.
- Save CSV and HTML by profile and run ID. Record the deployed version, effective configuration, phase boundaries, request count, actual RPS, and generator health. Remove secrets and sensitive data from saved commands, logs, and reports. Draw conclusions from the correct measurement window. Record sources and calculation methods if the full-session HTML and the gate use different windows.
- Collect CPU, RAM, database slow-query logs, and connection-pool metrics where available, including active connections, queued requests, wait time, and timeouts. Record each source and time window and flag missing sources.
- For long runs, use the project's slow-query threshold, if available, to compare query durations with latency and connection-pool metrics.

## Analyze results and identify bottlenecks

- Write `analysis.md` by endpoint and profile. Record target and actual load, measurement window, sample count, p95, error rate, thresholds, conclusions, and data sources. Assess valid measurements against `slo.yml`. Record insufficient evidence when thresholds, samples, or load are missing, the measurement window is wrong, the generator is saturated, or setup errors affect results. Report a valid endpoint breach even if another endpoint has insufficient evidence.
- Record Apdex, T, and measurement scope when the profile has an Apdex threshold. Classify errors and correlate anomalies with telemetry, traces, queries, and source. For confirmed bottlenecks, cite code paths or configuration keys, evidence, and proposed fixes. For hypotheses, specify a measurement or control run that can test them. Report business metrics and profile-specific criteria for each executed profile.

## Optimize and integrate CI/CD gates

- Apply code or configuration changes within scope. Rerun the same profile with equivalent data, target load, observation window, and environment conditions. Add a before-and-after table to `analysis.md` with versions, RPS, sample counts, p95, error rates, absolute or percentage changes, and comparison limits. Mark the comparison pending if a post-optimization run is unavailable.
- When asked to integrate CI/CD, add steps to the existing workflow or create `perf.yml` for the project platform. Require fast checks, smoke, and selected regression profiles on the ephemeral build before deploying to staging. Wire deployment only when the environment, release policy, and scope are clear. Verify staging serves that exact build before running staging profiles. If the project has a production release process, tie the corresponding build's release to the staging gate result. Follow the [pre- and post-deployment CI workflow](ci-pre-deploy.md) to wire commands and verify failure paths.
- Source staging secrets from CI. Retain HTML, CSV, SLO reports, and gate metadata even when tests fail. Budget CI time for setup, ramp-up, steady-state measurement, in-flight requests, and artifact uploads.
- Use the same `slo.yml` and measurement rules in reports and CI. Use the evaluator's exit code for the CI result and retain Locust's original exit code. Distinguish request failures counted against the SLO budget from script, setup, or worker failures. Test the cases in the CI section of the [measurement and validation rules](run-validation.md).
