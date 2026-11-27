# Service operation — security and monitoring

For each important trust boundary, connect a risk to a control, the caller-visible result, evidence for the operator and an acceptance check. Fit the level of detail to the data and the scope of the request.

## Select criteria for each operation

1. Identify the caller, credential and trust boundary, resources and fields read or changed, inputs and outputs, downstream dependencies, and work triggered by the operation. Start with the applicable requirements and existing contract. Consult relevant catalog entries when these details give the criterion a concrete trigger and consequence. A criterion about session cookies applies where the operation uses those cookies. A list scoped to the signed-in caller calls for authorization and data filtering checks.
2. Tie each selected criterion to a requirement, an agreed decision or an existing contract obligation. Preserve the source status. A relevant risk with an unsettled policy belongs in the Execution Prompt as a decision or question, with the operation affected and the remaining evidence needed. When considering an indirect performance requirement, identify the user journey, the operation's contribution and which layer can measure the stated outcome.
3. Choose how to express the resulting obligation. Use `securitySchemes` and the operation's effective `security` for credentials, parameter or body schemas for accepted inputs, and response schemas, headers and grounded error cases for observable outcomes. State ownership, cursor binding and other behavioral rules in operation descriptions or linked contract notes, with acceptance checks. Put internal controls and instrumentation in linked handoff notes. For user-journey SLOs, carry forward the measurement boundary, target status and verification owner. Commit an endpoint latency budget, quota or retry response only with a source for that specific behavior. [OpenAPI 3.1.0](https://spec.openapis.org/oas/v3.1.0.html#operation-object)

### Example from Lost & Found

For UC08, Core v1 exposes listMyPosts at GET /api/v1/me/posts. The operation requires CoreSession, limits results to posts created by the caller, and supports a Lost or Found type filter and cursor pagination. The shared limit parameter defaults to 20 and permits up to 50. Verify authorization and filtering with distinct account fixtures. Use UC08 and its applicable PERF source to decide whether to measure time until the list is visible in Mobile. Core response latency is one contributing signal. [Core posts contract](../../../../docs/api/core/v1/paths/posts.yaml) · [Page limit](../../../../docs/api/core/v1/components/parameters/Limit.yaml)

## Access and resource protection

| Decision | What the specification should settle |
| --- | --- |
| Who can act on what | For each sensitive operation, state the principal, role/scope, object or tenant predicate and writable/readable fields. Apply policy on collection filters, nested resources, status and download links as well as individual records. Test allowed and denied cases with synthetic fixtures. |
| Credential lifecycle | Specify TLS, credential issuance, validation, expiry, rotation and revocation as applicable. Identify the owner of each responsibility when it is known. Validate claims at the trusted boundary. Keep access tokens, keys and sensitive payload fields out of URLs, logs, examples and error details. |
| Resource limits and dependencies | Document applicable bounds on page, body, batch sizes and costly work. Where policy defines throttling, document the quota scope, how callers see it and any 429 and retry behavior. Describe applicable timeouts and the client-visible result of transient dependency failure. Retry only eligible operations with bounded backoff. For external integrations define the trust/validation boundary. |
| Audit and response | Specify which security-sensitive actions produce audit events, who may read them and which identifiers may be retained. Distinguish audit trails from diagnostic telemetry. For an actionable event, name an owner or role, first diagnostic step and containment or recovery action. Mark unconfirmed retention periods and contacts as TBD. |

## Observability from a user journey

1. Identify the unit of work, measurement boundary and eligible events. For asynchronous work measure admission and eventual completion separately. Define completion latency from acceptance to terminal outcome and how unfinished jobs are detected.
2. Define traffic, errors, latency and saturation where relevant. For availability, express successful eligible requests divided by eligible requests, including the treatment of expected 4xx, quota errors and dependency failures. For latency, give the eligible distribution, percentile or fraction under a threshold. Each SLO needs a target, window and measurement source. Preserve a supplied target. Label a missing value TBD or an explicitly requested proposal. An SLA requires a real service commitment.
3. Select metric dimensions with bounded cardinality, e.g. method, route **template** and status class. Put request/trace IDs in access-controlled structured logs or spans. Avoid raw paths, individual IDs or tokens as metric labels. Correlate one failing operation across service calls and asynchronous processing where needed.
4. For a user-visible failure, specify dashboard signal, alert condition, observation window, recipient role and first response. When a target exists, consider error-budget burn over short and long windows. For sparse traffic choose a meaningful signal such as a synthetic critical journey. Treat alert thresholds as proposals when the service has no agreed objectives.
5. If deployment is in scope, keep liveness cheap and local. Readiness indicates whether the instance can serve its intended traffic. Limit probe detail and access according to audience. Keep infrastructure probes off the public API inventory unless explicitly exposed to consumers.

Example for a report export: an accepted request counts toward admission success. An export stuck in the queue still harms the user. Monitor age of the oldest pending job, terminal failure fraction and time to a downloadable result. Route a sustained backlog to the service operator to inspect worker capacity and dependency failures.

Use [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) for risk selection, [Google SRE monitoring](https://sre.google/sre-book/monitoring-distributed-systems/) and [SLO alerting](https://sre.google/workbook/alerting-on-slos/) for signal and alert design, and [OpenTelemetry HTTP metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) for HTTP instrumentation.
