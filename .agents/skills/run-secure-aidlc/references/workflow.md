# Workflow and run record

To start a run, supply the product or research UC, the applicable API contract and the implementation scope. To resume, give `$run-secure-aidlc` the existing record path or an unambiguous UC/run ID. Keep the recorded scope and destination on resume. Reuse project artifact locations when compatible. For product runs, the requester serves as the approver wherever the workflow calls for researcher approval.

## Downstream boundaries

The orchestrator owns draft review, source generation, repair scheduling, every audit delegation, and Docker acceptance. Use downstream skills only for the assigned phase when they support that scope.

- Use `$gen-security-coding-resource` and `$gen-coding-prompt` for drafting when they accept the UC and proposed scope. Otherwise, where project rules permit, prepare the drafts directly from the UC, applicable API spec, project constraints and available catalog or templates. For each selected criterion, record the SEC or catalog ID, affected scenario and operation or enforcement layer, rationale, expected behavior and evidence needed. If no catalog is available, use the relevant SEC already linked from the UC and propose additional criteria only when grounded in the supplied sources. Keep each selected criterion traceable to an auditable SR in Prompt E. Carry unresolved product policies as open decisions into the approval review. Persist approval of the final bundle.
- Use `$gen-source-code` only for the initial implementation, and `$bug-fixing-sub-prompt` only for one evidenced repair, when they support execution without invoking their own audit, repair loop or deployment. Otherwise use their applicable technical guidance and the FE/BE skills directly, subject to project instructions.
- Delegate `$audit-generation-metrics` for source-based SR assessment only when it supports this run record. Otherwise give the auditor the project's applicable scoring rubric and evidence requirements and record results in the simplified contract below.
- Use `$docker-deployment run` for authorized Docker checks when it is available and compatible. Otherwise use the project's authorized Docker procedure directly. Tie build, health, UI/API reachability and the approved UC trigger, main flow, success and exception checkpoints to the source revision. A stale image cannot provide runtime acceptance. Independent scanner observations stay outside Prompt E scoring and the repair loop.

Check these boundaries before opening a new run or making further changes on resume. If a project's mandatory instructions or validator require a different workflow or incompatible artifacts, identify the exact requirement and affected phase. Continue permitted independent work and request reconciliation at the conflicting gate. A skill's work instructions do not override the target project's binding rules.

## Drafting without project templates

Use this outline when the downstream drafting skills and project templates do not cover the run. Pre-existing approved bundles retain their original roles and formats.

- **A · Scope.** Record the versioned UC and API sources, scenarios, decisions and boundaries of the requested work.
- **B · Design.** Map scenarios to operations and enforcement layers. State roles, field access, outcomes and the rules for any applicable data or schema changes.
- **C · Security scope.** Record the selected criteria and rationale, including source IDs and expected evidence.
- **D · Source generation.** Specify the destination, entry points, project constraints, approved behaviors and permitted verification.
- **E · Audit.** Give each selected criterion a stable SR, expected behavior and evidence needed. Assess each SR as `met` when the required evidence supports it, `unmet` when evidence shows a discrepancy, or `not_evaluable` when required evidence is missing. For a conditional criterion, state whether its condition was observed and what the evidence supports.
- **F · Repair and acceptance.** State how to make a minimal change for an evidenced defect, re-audit affected SRs, and verify acceptance on the final revision under the rules below.

Present A–F and the selected security scope as one approval bundle with applicable schema decisions. Record source versions and the approved bundle for the audit and any resume.

## Checkpoints and resume

Record the UC/run ID, approved security scope, schema and Prompts A–F with exact paths and versions, the approval reference, project constraint sources and model assignments actually used. Record model details only when known. Maintain this record throughout the run, including any blocked status and next action. Reuse one canonical structured record, with links to supporting artifacts.

For new runs also record the implementation destination and applicable API contract and notes used for approval, along with the versioned UC and scenario scope. Earlier records can resume from their verified checkpoint, using the sources and destination approved at the time. On repair, use the approved UC and applicable API spec to decide whether a discrepancy belongs to source code or to a decision the contract owner needs to resolve.

- After approval, record the initial source revision and permitted checks. Before the first repair, freeze `first_pass_security` with one evidence-backed `met`, `unmet` or `not_evaluable` result for each approved Prompt E SR and corresponding counts. Retain evidence gaps and the initial revision. Later evidence belongs to subsequent assessments.
- For each repair, register its next ID (`repair-001`, etc.), defect evidence, affected requirements, starting revision and any additional authorization before editing. Record whether execution began, outcome, resulting revision, checks and focused re-audit. Count each started attempt once, including failed or interrupted attempts. Read-only screening counts as zero.
- On resume, compare current source with the last recorded revision and inspect any in-progress repair. Reconcile the existing attempt and capture missing checks or re-audit before opening another ID. Preserve the first-pass snapshot. If the source changed and the initial snapshot is missing, recover the exact first-pass revision and its available evidence. If it cannot be recovered, record the blocker and continue checks that do not depend on it.
- Finalize against the revision verified by the required runtime checks. For generated research FE/BE, use the Docker-verified revision. Record one final result or researcher exclusion for each frozen SR, evidence for applicable project constraints, and any remaining findings. If final audit or runtime exposes an actionable defect, return it to repair before finalizing when the permitted scope and budget allow.

## Repair authorization and stop conditions

The default limit is **10 started repair attempts per run**, across all defect categories. At that point report remaining findings. Start `repair-011` or later only when the researcher explicitly requests or approves additional repair on the identified run. Persist the approval reference, which findings it covers, and the number of extra attempts authorized. A request for one additional repair authorizes one attempt. A broader request with no count authorizes one additional attempt by default. Count extras in the same sequence and keep prior attempts and first-pass evidence. A new attempt after exhausting the extension requires new approval. Repair approval does not itself approve scope changes, schema changes or destructive actions.

Screen candidates using reproducible evidence. If evidence is insufficient, or the same defect remains after three consecutive attempts, pause that defect and record what new evidence or decision would allow progress. Continue independent checks and other actionable defects within the allowed budget. A `not_evaluable` result without an actionable cause is an evidence gap, not a reason to consume an attempt.

A run is `complete` when required final runtime checks pass, the final assessment covers every frozen SR, and required scope decisions are recorded. Only the researcher may exclude an SR under the project's scoring rules. Below 10 attempts, an unresolved, non-excluded SR leaves the run `repair_required` while an authorized, actionable repair is available, or `blocked` when progress needs new evidence, authorization or a researcher decision. At or above 10, remaining non-met SRs may be recorded at completion once the repair loop stops. Any technical/runtime blocker continues to block completion. When starting an authorized extension on a completed run, reopen the same record as `repair_required` and retain the prior assessment as evidence for its source revision. Verify the resulting revision before restoring `complete`.
