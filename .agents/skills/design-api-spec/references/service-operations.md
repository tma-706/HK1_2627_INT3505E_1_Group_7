# Service operation — security and monitoring

For each important trust boundary, connect a risk to a control, the caller-visible result, evidence for the operator and an acceptance check. Fit the level of detail to the data and the scope of the request.

## Access and resource protection

| Decision | What the specification should settle |
| --- | --- |
| Who can act on what | For each sensitive operation, state the principal, role/scope, object or tenant predicate and writable/readable fields. Apply policy on collection filters, nested resources, status and download links as well as individual records. Test allowed and denied cases with synthetic fixtures. |
| Credential lifecycle | Specify TLS, credential issuance, validation, expiry, rotation and revocation as applicable. Identify the owner of each responsibility when it is known. Validate claims at the trusted boundary. Keep access tokens, keys and sensitive payload fields out of URLs, logs, examples and error details. |
| Resource limits and dependencies | Bound page/body/batch sizes and costly work. State how quota is scoped, measured and presented to clients. Document 429 and retry guidance for throttling, timeouts and the client-visible result of transient dependency failure. Retry only eligible operations with bounded backoff. For external integrations define the trust/validation boundary. |
| Audit and response | Specify which security-sensitive actions produce audit events, who may read them and which identifiers may be retained. Distinguish audit trails from diagnostic telemetry. For an actionable event, name an owner or role, first diagnostic step and containment or recovery action. Mark unconfirmed retention periods and contacts as TBD. |

## Observability from a user journey

1. Identify the unit of work, measurement boundary and eligible events. For asynchronous work measure admission and eventual completion separately. Define completion latency from acceptance to terminal outcome and how unfinished jobs are detected.
2. Define traffic, errors, latency and saturation where relevant. For availability, express successful eligible requests divided by eligible requests, including the treatment of expected 4xx, quota errors and dependency failures. For latency, give the eligible distribution, percentile or fraction under a threshold. Each SLO needs a target, window and measurement source. Preserve a supplied target. Label a missing value TBD or an explicitly requested proposal. An SLA requires a real service commitment.
3. Select metric dimensions with bounded cardinality, e.g. method, route **template** and status class. Put request/trace IDs in access-controlled structured logs or spans. Avoid raw paths, individual IDs or tokens as metric labels. Correlate one failing operation across service calls and asynchronous processing where needed.
4. For a user-visible failure, specify dashboard signal, alert condition, observation window, recipient role and first response. When a target exists, consider error-budget burn over short and long windows. For sparse traffic choose a meaningful signal such as a synthetic critical journey. Treat alert thresholds as proposals when the service has no agreed objectives.
5. If deployment is in scope, keep liveness cheap and local. Readiness indicates whether the instance can serve its intended traffic. Limit probe detail and access according to audience. Keep infrastructure probes off the public API inventory unless explicitly exposed to consumers.

Example for a report export: an accepted request counts toward admission success. An export stuck in the queue still harms the user. Monitor age of the oldest pending job, terminal failure fraction and time to a downloadable result. Route a sustained backlog to the service operator to inspect worker capacity and dependency failures.

Use [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) for risk selection, [Google SRE monitoring](https://sre.google/sre-book/monitoring-distributed-systems/) and [SLO alerting](https://sre.google/workbook/alerting-on-slos/) for signal and alert design, and [OpenTelemetry HTTP metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) for HTTP instrumentation.
