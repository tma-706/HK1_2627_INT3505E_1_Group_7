# Project context for each UC

Use the UC as the functional scope and the target project's existing documents and implementation as the shared technical context. The researcher may provide paths or decisions with the UC, or point to a maintained context/index document. Otherwise inspect `PROJECT_CONTEXT.md`, applicable `AGENTS.md` instructions, relevant architecture and database documents, configuration, schemas/migrations and existing code. Follow their references selectively; do not scan unrelated material or require a new document when suitable sources already exist.

Extract only constraints relevant to the UC, recording their source paths and, where useful, section or version. Consider:

- Architecture: system boundaries, components, layers, communication, API contracts, integration points and established patterns.
- Database: database engine, existing schema and ownership, relationships, migrations, transactions and data constraints.
- Project setup: language and framework versions, repository layout, dependency/build configuration, environment configuration, deployment assumptions and applicable security conventions.

If the researcher supplies information that is not yet recorded, include it in the prompt with its attribution; update a maintained project context file only when appropriate to the request and project conventions. Never put secrets or credential values into the prompt or generated artifacts: refer to the required configuration names or secret mechanism instead.

Distinguish binding decisions from examples, plans and assumptions. Respect applicable instruction hierarchy; do not silently choose between materially conflicting requirements. If a source is missing, stale or ambiguous, inspect another authoritative source or ask the researcher for the specific decision when it would materially change implementation. A UC-specific exception to a project constraint needs an explicit decision; don't silently override either. If no established decision exists and a reasonable implementation choice suffices, document the assumption and proceed.

Provide the sub-agent with the relevant project constraints and source paths for its drafts. Before the approval gate, include an actionable project-constraints section in the generated security coding prompt, with source paths, relevant decisions, approved exceptions and consequential assumptions. The orchestrator checks it against the UC, security scope, schema and source documents. Pass this section and source paths to `$gen-source-code`, FE/BE skills, `$audit-generation-metrics` and `$bug-fixing-sub-prompt` as applicable; do not rely on another skill automatically rediscovering context. Verify generated code, configuration and any schema changes against the constraints with proportionate source/build/runtime evidence. Report discrepancies and address evidenced defects through the existing repair workflow.

For a resumed run, inspect its approved prompt and referenced sources first. Preserve the approved baseline for reproducibility; if relevant project context has changed, identify the difference and obtain the necessary decision or renewed prompt approval before applying changes that would alter that baseline.

## API contract and scenario scope

For Lost & Found product work, use the [shared project context](../../../lost-and-found-context.md) to resolve the product contract, implementation and infrastructure baseline, and source versions. For research, use the approved research sources and record any product references explicitly. In other projects, follow the UC and applicable repo conventions. For each in-scope scenario, resolve the actual operation ID, effective authorization and ownership, input, visible results, and relevant errors. Include linked UI, Worker, Matching, and operational requirements when applicable.

If a referenced operation or contract is missing, stale or conflicts with the UC, record the source, scenario and affected behavior. Continue independent drafting and hold approval or implementation of the affected behavior until the contract owner resolves it or the requester explicitly narrows the approved scope. For a scenario that has no API interaction, record where the behavior is enforced and verified. For a resumed run, consult the approved baseline before interpreting any new API input.
