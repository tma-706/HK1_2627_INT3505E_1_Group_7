---
name: design-api-spec
description: Draft an API design Execution Prompt for approval and execute the approved version. Use when turning an SRS and SEC/PERF analysis into an API contract or extending an existing contract from supplied requirements and constraints.
---

# Design API contracts

## Inputs

For Lost & Found, read the [project context](../../lost-and-found-context.md), the current written UC or SRS, the existing interface contract and notes, and any applicable SEC/PERF analysis. Use the Core REST v1 contract and scope map as the product baseline. Keep readiness and internal Worker and Matching interfaces outside the public operation inventory unless the approved scope explicitly exposes them. Record source versions. If analysis is unavailable, record the constraints supported by current sources and the operations still affected.

Use applicable project or supplied security and performance criteria to identify candidates for each operation. Trace actors, data, permissions, dependencies, and workload to specific risks or measurement goals. Use the [criteria selection and mapping guide](references/service-operations.md#select-criteria-for-each-operation) to identify what belongs in OpenAPI and what needs a handoff. For criteria that lack enough evidence for a commitment, record the question, reference source, and affected operations.

Outside the project workflow, use the supplied requirements, user stories, contracts, and constraints.

## 1. Draft the Execution Prompt for approval

- Write a self-contained prompt in a Markdown code block with enough context for a new chat. Record source content and versions, API consumers, resource model, interactions, target format, permissions, observable outcomes, and required checks. Save it to a user-specified file when requested.
- For each selected criterion, record its ID, source, status, proposed operation, rationale, observable behavior, and verification method. Identify where it belongs in OpenAPI and the handoff destination for enforcement or measurement. Use project REQ/SEC/PERF IDs and cite catalog IDs when available. For open SLOs, specify the measurement scope and method. Commit to error codes, limits, and responses only when supported by the approved scope.
- When choosing an approach, use the [SOA and format guide](references/soa-course.md), [interaction patterns](references/design-patterns.md), [authorization and measurement](references/service-operations.md), or [API integration and lifecycle](references/api-product.md), as appropriate. For REST, choose an OpenAPI version compatible with existing tools and interfaces. Use the appropriate native format for other interfaces.
- Present the exact prompt for approval or revision. Wait for approval before generating the full contract. A new chat can receive the prompt and an approval that explicitly identifies that version.

## 2. Execute the approved prompt

- For Core v1, update `docs/api/core/v1/` and its adjacent notes. Preserve the split entry point, paths, and shared components and keep `x-use-cases` mappings aligned. For other interfaces, use the approved location and reuse shared contracts. For each operation, specify its ID, inputs, permissions, outcomes, supported errors, and appropriate examples. Keep mappings and rules that the machine-readable format cannot express alongside the contract. Include SRS and analysis versions, the classification of internal requirements, and open questions in the handoff.
- Compare the SRS and analysis against the contract and notes. Check that each in-scope REQ/SEC/PERF item maps to an operation and observable behavior, or has a reason and handoff destination for another layer. Trace back from the contract to detect added permissions, states, or errors. If sources change after approval, identify the affected scope and seek approval for material changes to the prompt.
- Use available tools to verify IDs, schemas, effective operation permissions, including inheritance and overrides, and examples. Deliver a synchronized contract and notes with the approved scope, verification performed, and open UC items.
