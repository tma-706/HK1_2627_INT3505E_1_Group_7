# Measurement and result validation rules

## Check generated load configuration

- For each profile, verify demand units, phased load, SLO scope, test data, and environment budget. Compare expected endpoint sample counts with that endpoint's RPS multiplied by measurement duration. For bursts, align observation windows with the event and record recovery time. For long runs, cover the relevant business or resource cycle.
- Record total runtime separately from measurement duration. Locust `--run-time` includes ramp-up. For steady-state objectives, start measuring once the target load is reached and confirm the hold period is long enough. For events or batches, start at the specified business milestone, track work still pending after load generation stops, and check final outcomes against the completion deadline.
- Verify positive values and units, ordered user and wait-time ranges, whether ramp-up fits the budget, and staging load and time limits. When reducing load, record the business target and effective load. If staging cannot reach the load required to answer the question, record what remains unverified.

## Select data for evaluation

- Record the route template, phase, actual user count, effective configuration, time, version, and metric calculations. Define the scope for business traffic, login and setup, expected business responses, and cleanup requests. Check setup errors separately. Choose and record sampling rules for p95, error rate, and Apdex.
- Compute p95 from samples or a sufficiently detailed histogram for the correct window and scope. Prefer raw request timings near SLO thresholds because Locust's default histogram rounds values. Merge histograms by sample counts before calculating percentiles. Specify how requests are assigned to windows, for example by start time, then wait for those requests up to their timeout. Report insufficient evidence if outstanding samples could change the conclusion.
- Calculate error rate as `100 × failures / attempts` for the defined scope. Compare it with percentage values such as `1.0` for 1%. For Apdex, use the project's T and the same unit for T and response times. Under the standard formula, successful samples at or below T are satisfied, successful samples above T and at or below 4T are tolerating, and all others, including failures, are frustrated. The score is `(satisfied + 0.5 × tolerating) / total samples`.
- Record the required gate metrics. If Apdex is required by the project or user, missing T or insufficient samples means insufficient gate evidence. Apply the same scope and calculations to distributed runs. For soak tests, aggregate by window using counters or histograms to bound generator memory.

## Stop conditions

- Set the observation window, scope, and minimum sample count for each stop threshold. Evaluate during the run and independently check worker loss, missing signals, and setup failures. When workers report metrics, decide from aggregated data for the full scope. Record the reason and preserve measurements when stopping.
- For profiles with stop thresholds, read the metric, unit, operator, threshold, window, and action from the project plan. If a stop condition depends on an SLO, use the matching SLO scope. Verify behavior below, at, and above the threshold. For capacity exploration, record the last passing load level and triggering signal.

## Validate the CI gate

- Verify the version in the measured environment, actual load, measurement window, sample count, and report completion before concluding. Retain Locust's exit code and logs. When using a separate request-error code via `--exit-code-on-error`, continue to SLO evaluation only with evidence that execution completed, request failures were captured in the metrics, and script, setup, and workers were valid. Check task errors separately, for example through `user_error` or exception reports, because Locust can use the same exit code for request and task errors.
- Return exit code 0 when every required metric passes. Distinguish SLO breaches, insufficient evidence, and execution failures in logs or reports. Retain both results when one valid metric breaches its threshold and another lacks samples. Verify artifact retention on failed gates.
- At minimum, test passing, request errors within budget, values exactly at and above thresholds, insufficient samples or load, missing T when Apdex is required, task failures or data loss, and artifact retention when the gate fails.
