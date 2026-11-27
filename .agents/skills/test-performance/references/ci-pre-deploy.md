# Pre-deployment and post-deployment checks

## Execution order

| Stage | Action | Condition to proceed |
| --- | --- | --- |
| Fast verification | Run unit, integration, and OpenAPI contract checks with project tools | Required checks pass |
| CI before staging | Build the candidate, start the API and dependencies in an ephemeral environment, wait for readiness, then run smoke and selected regression profiles | Smoke passes and the gate has sufficient evidence that regression SLOs pass |
| After staging deployment | Deploy the exact build that passed the ephemeral CI gate. Verify the deployed version, readiness, and smoke on staging, then run staging business workload profiles | The candidate passes the staging gate under the defined expected load |
| Production release | Follow the project's release and approval process | Release only the candidate that passed the staging gate |

- Use dedicated ephemeral CI test environments, data, and accounts. Wait for the API and dependencies with a bounded readiness timeout. Use the same URL for smoke and Locust. Reuse an existing smoke suite, such as Newman for a project that uses Postman.
- Read the `pre-deploy` and `staging` profile lists from project workload configuration. For each profile, run the agreed journeys and load curve, apply the [measurement and validation rules](run-validation.md), and save effective configuration and reports in a directory named for the ID. A gate passes only when every required profile has sufficient evidence and meets its SLO. When only exploratory runs exist or load is unrepresentative, record that staging has yet to verify the release objective.
- Use an immutable version such as an image digest or build ID to bind results to the release. Transfer the tested build through an artifact or registry. Verify staging serves that build before the staging gate and after every completed staging gate run, including failures. Hold the same lock from deployment through measurement. Within one repository, use a shared concurrency group for workflows that touch staging. For multiple repositories or deployments outside CI, use the deployment system's shared lock.
- Run exploratory workloads with objectives and budgets outside CI separately. If the project lacks a staging deployment path, complete the ephemeral gate and record the staging gap. When a production release process exists, preserve its approvals and link the staging gate outcome to the exact build being released.

## GitHub Actions template integration

Use the [workflow template](../assets/pre-deploy.yml) for projects using Docker Compose on GitHub-hosted runners. If the repository already has CI or CD, integrate steps into the corresponding jobs and reuse existing commands. Adapt branch names, Docker build paths, services, required secrets, and job budgets to the project.

| Template component | Integration contract |
| --- | --- |
| `ci/fast-verification.sh` | Run project unit, integration, and lint or contract checks. Fail when a required check fails. |
| `ci/compose.ephemeral.yml` | The `api` service uses the newly built `${CANDIDATE_IMAGE}`. Publish the API at `127.0.0.1:18080`, configure a health check that confirms it can serve requests, and prepare smoke fixtures. |
| `ci/smoke.sh <url> <output-dir>` | Run smoke and write JUnit or an equivalent report. Fail when a required flow fails. |
| `ci/performance-gate.sh <stage> <url> <output-dir>` | Load pinned dependencies and read the stage's profile group (`pre-deploy` or `staging`) from the candidate's `workloads.yml` or equivalent configuration. Fail on missing groups or profiles. Run Locust for each ID and record HTML, CSV, the original exit code, and the evaluator result. Exit 0 only with sufficient evidence and all required metrics passing. |
| `ci/deploy-staging.sh <image> <commit> <release-file>` | Publish or deploy the gated image using the project mechanism. Write JSON with a one-line immutable `release_id`, such as an image digest. Write only non-sensitive metadata to this file. |
| `ci/verify-staging.sh <url> <release-file>` | Wait for readiness and verify the serving build matches `release_id`. Log the expected and observed versions. Fail if verification is unavailable. |

- Set `STAGING_URL` and secrets for deployment, smoke, and Locust in the staging environment configuration. Map the required secrets to each relevant step. Pull requests use ephemeral fixtures.
- Within the same workflow, make the existing production job depend on `staging-load-gate` and consume its `release_id` output for the release. With a separate production workflow, obtain the approval artifact from a successful run of the configured workflow on the release branch. Verify `release_id` against the chosen release and the commit, run, and attempt metadata. Preserve that ID from approval through deployment.
- Before completing integration, check failures in fast verification, readiness, smoke, the ephemeral CI gate, and the staging gate, plus staging version mismatches. Confirm post-check steps retain generated reports. Verify pull requests run only the ephemeral gate and only pushes to the release branch can deploy to staging. Verify the full pipeline on the project runner once deploy commands and environment variables are available.
