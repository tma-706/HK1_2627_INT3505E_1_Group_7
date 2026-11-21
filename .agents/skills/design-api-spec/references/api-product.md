# API as a product

Start with the consumer's job and the first action that delivers value. Use one short consumer journey for an internal API. Expand to onboarding, support and lifecycle detail when multiple teams, partners or public developers rely on the interface.

| Consumer question | Deliverable in the approved design |
| --- | --- |
| Who is this for and what can I achieve? | Identify consumer segments grounded in the SRS, the job for each, the value received and a measurable successful outcome. Record relevant limits on data use and supported environments. |
| How do I start? | Specify discovery, access request, credential and minimum scope, test fixture, first call and expected result. Use the contract's operation ID, actual method/path or native query, a placeholder credential and a synthetic example. Describe sandbox or mock availability honestly. For an asynchronous workflow, show how to reach the useful result after acceptance. |
| What can I rely on? | Give supported versions, access and quota rules, error/retry behavior and service commitments already agreed. Consider tiers or monetization only when explicitly in scope. Record a missing commitment or channel as TBD. |
| Who helps me, and how does feedback influence changes? | Name the known owner or responsible role, support route, incident/change communication and a way to report integration friction. Describe who reviews feedback and what product decision it can inform. |
| How will the team know this is working? | Choose a metric tied to the job. Define the cohort, start/end event, observation window, data source and target if known. Record minimal telemetry. Identify a decision the measure can guide. |
| What happens when behavior changes? | Identify affected consumers. Publish a changelog and migration example. Define coexistence, compatibility tests, notice channel, usage-based exit criteria and rollback if a prior contract exists. Use provider-approved dates and support periods. |

## Select a metric that measures the journey

- **Time to first value.** For a partner integration, measure time from credential issuance to the first completed business action. Define whether test traffic counts. For a report product the action might be retrieving the first completed report. Record integrations that have yet to reach the milestone so the result does not hide drop-off.
- **Activation.** Divide distinct eligible integrations that complete the defined first action within the selected window by all new eligible integrations in the same cohort with enough follow-up. Segment by onboarding step to find where developers are blocked.
- **Repeat adoption.** Count distinct activated integrations that complete a meaningful action in a later period. State the period and identity unit. Use request counts for demand or cost analysis.
- **Evolution.** For an existing version, count active integrations using retiring operations and track migration of affected workflows. Base the retirement decision on the actual notice policy and exit criteria.

For HTTP lifecycle signaling, document the Deprecation structured date, a migration link and, when retirement is scheduled, the Sunset HTTP-date. Only show example dates as illustrative. Include the replacement operation and an old-to-new request or response example where behavior changes.

See the UK Government guidance on [API discovery](https://www.gov.uk/guidance/managing-your-api-discovery) and [API management and developer experience](https://www.gov.uk/guidance/defining-an-api-management-strategy), [NHS England's API product ownership guidance](https://digital.nhs.uk/developer/guides-and-documentation/api-policies-and-best-practice), [RFC 9745 on Deprecation](https://www.rfc-editor.org/rfc/rfc9745.html) and [RFC 8594 on Sunset](https://www.rfc-editor.org/rfc/rfc8594.html).
