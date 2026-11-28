---
name: compose-uc-spec
description: Draft or review use case specifications and UX scenarios from written use cases, API contracts, and applicable SEC/PERF requirements. Trace acceptance scenarios and deliver screen and state illustrations using the Lost & Found UI guidelines.
---

# Compose Lost & Found use case specifications

## Establish sources and scope

Read the [Lost & Found project context](../../lost-and-found-context.md) for the current contract, architecture boundaries, and delivery scope.

- Use the current UC description as the source of business behavior. Read its goal, actors, preconditions, trigger, flows, postconditions, and acceptance criteria. The description may come from the user's request or a text-based SRS. Read the revised API contract and its notes to identify operations, permissions, data, and client-observable outcomes. Read applicable SEC/PERF analysis, approved decisions, and architecture when available.
- For a UC with a user interface, read the [Lost & Found UI guidelines](../../../docs/design/ui-guidelines.md) before planning UX scenarios. Use the specified version or the repository draft and record its approval status. When no images are available, design from the UC description, API contract, and UI guidelines. If existing screens or reference images are available, reuse elements that fit the current behavior and design.
- Pin sources according to `docs/skill-workflow.md` when available. If the current branch lacks that convention, record each source path and version or commit. For a description supplied in chat, identify the source and relevant request. Trace requirements using existing IDs. If the description has no REQ IDs, cite the specific section, step, or criterion.
- Identify variants and dependencies within the agreed scope. Distinguish internal business changes, API responses, and UI outcomes. If sources conflict, record the applicable decision or open question and its owner when known, along with the affected behavior and SCNs. Use existing code and run records to compare implementation or recover approved decisions. Record test results in the run record.

## Write the specification

Update `docs/use-cases/<slug>.md` in this order.

1. **Goal, scope, and sources.** Identify actors, permissions, in-scope and deferred work, and dependencies on other UCs.
2. **Main Flow, Alternative Flows, and Exception Flows.** Use separate sections. For each main journey, record its trigger, preconditions, numbered steps by actor or layer, and observable postconditions. For each branch, record the journey and branch point, condition, resulting data or state, continuation or endpoint, and relevant SCNs. For concurrent requests, identify the context in which a response still applies. Explain when a branch type does not apply.
3. **Companion UI.** For UCs with an interface, deliver both the UC specification and the UI document below. Link each step or branch involving visible information or user interaction to its illustration anchor. Link each relevant state when a step has multiple outcomes. Record handoff and return points for third-party interfaces.
4. **Implementation handoff.** Identify the relevant Mobile, Core API, Worker, Matching, storage, or infrastructure boundaries, authorization rules, and shared data and states. Core owns authorization and business state. Show where a request is accepted and where an asynchronous outcome becomes observable when the UC depends on both. Link to operations, schemas, and examples in the pinned OpenAPI version. Explain which behavior belongs to the UI or internal processing. Keep full payloads, policies, and decisions in their authoritative sources.
5. **Acceptance scenarios and open items.** Retain existing SCN IDs. For each SCN, record the actor, preconditions, action, observable outcome, operation or layer, requirement and decision references, applicable SEC/PERF criteria, and pass criteria. Use flows to describe behavior, SCNs to describe verification, and the contract for schemas and examples. Identify what is ready for implementation or measurement design and what still needs a decision or acceptance condition.

## Companion UI document

1. **Plan UX scenarios from flows and SCNs.** Before illustrating, follow the main, alternative, and exception flows to identify each screen or state, entry conditions, what the user sees and can do, which response triggers a transition, and where the user goes next. Record the scenarios in the UI document. Inventory all in-scope screens owned by the app and every state that changes content, actions, or navigation. Use the existing SCR ID or the parent screen's SCR ID. For a screen or test destination without an SCR ID, record that status and use an anchor based on its purpose. For proposed behavior awaiting a decision, record the assumption, reviewer when known, and affected step or SCN.
2. **Build and export illustrations.** Use sample data and reuse illustrations that fit the scope. Prefer editable frames using the appropriate Figma skill. Export frame images, embed them in Markdown, and link to the corresponding Figma nodes. Build and export locally when requested or when Figma is unavailable. Record sources, how the images were made, and limitations compared with the running app. Shared states may reuse the same image file across UCs.
3. **Naming and versioning.** Save the UI document as `docs/use-cases/<slug>-ui.md`. Keep the filename and increment the UI version whenever content or images change. Record the version and approval status in the UI document and link to that version from the UC specification. Link to the UI guidelines and record the version used. Save images in `docs/use-cases/ui/<uc-id>/` and name them after their anchors.
4. **Anchors and captions.** Place a stable ASCII anchor immediately before each illustration heading, for example `<a name="scr-03-found-empty"></a>`. Link from the flow using `<slug>-ui.md#scr-03-found-empty`. Preserve anchors while the meaning of the state remains the same. Include the SCR ID, state name, embedded image, key content or action, and any review items. Link back to the UC specification and identify the corresponding step or SCN.
5. **Review status.** Mark new or revised UC specifications and UI documents **Pending approval**. Mark them **Approved** only once the user confirms the version, and record the date and scope of approval. Record verification limits and open decisions separately.

## Validate the handoff

- Trace flows, source requirements, and applicable SEC/PERF criteria to SCNs, operations, or enforcing layers. Trace each SCN back to its sources. Check IDs, permissions, schemas, and outcomes against the contract. Check branch points and postconditions against the SCNs.
- For UCs with UI, check the UX scenarios and illustrations against the flows, SCNs, observable API outcomes, and UI guidelines version. Verify transitions, endpoints, and applicable data visibility limits. Open the documents to check that images render and remain legible, relative paths work, anchors are unique, incoming and return links resolve, and Figma nodes are correct where applicable.
- Hand off links to both documents, the completed specification version, ready and blocked SCNs, relevant suites or code, review items, and verification limits. Update active input references after confirming compatibility. Preserve pinned versions in run records and historical evidence.
