---
name: design-api-spec
description: Review and incrementally revise an existing API contract against a written use case, acceptance criteria, and applicable SEC/PERF requirements. Identify conflicts, update affected operations, and assess compatibility and versioning.
---

# Review and revise API contracts

## Establish the baseline

For Lost & Found, start with the [project context](../../lost-and-found-context.md), the current written UC or SRS, and the existing Core REST v1 contract at `docs/api/core/v1/openapi.yaml`. Read the referenced paths and components, adjacent notes, and the UC-to-operation map. Use the current working contract, including any existing edits, and record its source path, version, and relevant revision. Include applicable SEC/PERF analysis and approved decisions when available. Keep readiness and internal Worker and Matching interfaces outside the public operation inventory unless the agreed scope exposes them.

Outside Lost & Found, use the supplied contract and sources. If the expected baseline is missing, locate it or report which changes cannot be grounded. Design a new contract when the user requests one.

## Review the UC against the contract

1. Map each relevant flow, alternative, exception, and acceptance criterion to existing operations using `x-use-cases` and the actual definitions. Check actor and effective authorization, inputs and schemas, responses and headers, errors, timing and limits, and observable state transitions. Identify requirements enforced by Core or another layer, including background processing and UI behavior.
2. Record each mismatch or gap with its UC step or criterion, operation or enforcing layer, source evidence, and affected callers or other UCs. Distinguish internal business outcomes from what the API exposes. For example, rejecting creation of a duplicate account can coexist with a generic acceptance response. Establish whether the UC also requires an explicit caller-visible error before proposing a contract change.
3. Identify the smallest supported edits and any open decisions. Use the [criteria selection guide](references/service-operations.md#select-criteria-for-each-operation) for relevant SEC/PERF obligations. When the UC and contract give conflicting caller-visible guarantees and the intended behavior is unclear, surface the decision and continue independent changes. Apply unambiguous changes when the request calls for edits. For a review-only request, report findings and proposed edits. Draft an Execution Prompt when requested or when the work needs a separately approved handoff.

## Assess compatibility and versioning

- Compare the proposed contract with the working baseline for existing consumers, including Mobile types and shared schemas. Check paths and operation IDs, required fields, validation, response fields and enums, status codes, permissions, ordering and defaults, and observable behavior. A change can affect consumers even when the YAML schema stays the same.
- For incremental pre-release revisions, keep the current path and `info.version` by default. Record the UC, changed operations, decisions, and Git revision when available. If changes are uncommitted, identify the working diff without assigning it a new commit. Follow any established release policy for a published revision or intentional version bump.
- When a breaking change affects a supported consumer, identify the affected behavior and consumers. Prefer a compatible evolution when it satisfies the requirement. If consumers need the old and new contracts to coexist, propose a new API version and a migration and retirement plan. Implement that version only when the decision is in scope. Use [lifecycle guidance](references/api-product.md) for the handoff. The root `openapi` field identifies the specification format and changes only when intentionally migrating that format.

## Apply and verify

- Update the affected Core v1 paths, components, examples, and relevant notes or UC mappings in place. Check all operations that reuse a changed component. Add an operation only for a requirement that existing operations cannot reasonably cover. Preserve stable interfaces outside the requested change.
- Trace changed behavior back to the UC or decision and test impacted references, schemas, examples, permissions, and operation IDs. Use the repository's OpenAPI lint and bundle commands where available. Check the diff for compatibility and keep fixture or mock evidence scoped to contract behavior.
- Hand off the findings, files and operations changed, verification results, compatibility and versioning decision, and unresolved points. Identify the exact revised contract and revision for downstream UC specification work.
