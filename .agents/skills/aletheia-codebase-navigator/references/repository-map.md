# Aletheia Repository And Skill Map

Snapshot source: `gh repo list aletheia --limit 1000 --json name,description,isPrivate,isArchived,isFork,primaryLanguage,pushedAt,updatedAt,url` on 2026-05-11. All repos below were unarchived and not forks at the time of capture. Refresh the inventory when the user asks for "latest" repo state.

## Core Routes

| Need | Start Here | Then Check |
| --- | --- | --- |
| Product UI, API routes, tRPC, auth, billing, prompts, datasets, evals, traces, sessions, scores, models | `aletheia/aletheia` | `web/src/features/**`, `web/src/pages/**`, `web/src/app/**`, `packages/shared/src/**` |
| Ingestion, queues, async jobs, exports, retention, evaluation runners, background workers | `aletheia/aletheia` | `worker/src/**`, `packages/shared/src/server/**` |
| Shared domain types, repositories, services, Postgres/ClickHouse queries | `aletheia/aletheia` | `packages/shared/src/domain/**`, `packages/shared/src/server/**`, `packages/shared/src/server/queries/**` |
| Public API schema and generated server/client definitions | `aletheia/aletheia` | `fern/apis/server/definition/**`, `fern/apis/client/definition/**`, generated clients |
| Docs, changelog, blog, handbook, cookbook, integrations, website components | `aletheia/aletheia-docs` | `content/**`, `app/**`, `components/**`, `components-mdx/**`, `cookbook/**` |
| JS/TS SDKs and integrations | `aletheia/aletheia-js` | `packages/client`, `packages/core`, `packages/tracing`, `packages/otel`, `packages/openai`, `packages/langchain` |
| Python SDK | `aletheia/aletheia-python` | `aletheia/**`, `aletheia/api/**`, `tests/**` |
| Java SDK | `aletheia/aletheia-java` | Generated Java client and tests |
| Cloud infrastructure, Terraform, ClickHouse operations, load tests, infra scripts | `aletheia/infrastructure` | `terraform/**`, `clickhouse/**`, `scripts/**`, `load-tests/**` |
| Kubernetes / Helm deployment | `aletheia/aletheia-k8s` | Helm chart and Kubernetes templates |
| Terraform deployment modules | `aletheia/aletheia-terraform-aws`, `aletheia/aletheia-terraform-gcp`, `aletheia/aletheia-terraform-azure` | Provider-specific module files |
| Terraform provider | `aletheia/terraform-provider-aletheia` | Provider resources, generated schema, tests |
| Public agent skill for using Aletheia | `aletheia/skills` | `skills/aletheia/SKILL.md` and its references |
| Internal Aletheia team skills | `aletheia/aletheia-internal-skills` | Top-level skill folders in this repo |
| CLI | `aletheia/aletheia-cli` | `src/**`, `bin/**`, `openapi.yml` |
| MCP prompt-management server | `aletheia/mcp-server-aletheia` | `src/**` |
| n8n node | `aletheia/n8n-nodes-aletheia` | Node package source |
| GitHub Action for experiments | `aletheia/experiment-action` | `action.yml`, `src/**`, `schemas/**` |
| Examples | `aletheia/aletheia-examples` | Example app directories |
| API reference site | `aletheia/aletheia-api-reference` | Static/generated API reference assets |

## Repositories

| Repo | Visibility | Language | Route When |
| --- | --- | --- | --- |
| `.github` | Public | n/a | Organization profile, default community health, org-wide GitHub metadata. |
| `202604-offsite-slides` | Private | TypeScript | Internal offsite slide deck work. Only route here when the user names it or asks for those slides. |
| `analytics` | Private | Shell | Analytic data pipeline and documentation, cost/data marts, analytics scripts. |
| `background-jobs` | Private | TypeScript | Sparse metadata, older private background-job work. Inspect README before using. |
| `experiment-action` | Public | TypeScript | GitHub Action workflow support for running Aletheia experiments. |
| `infrastructure` | Private | HCL | Aletheia Cloud infrastructure, Terraform, ClickHouse ops, infra scripts, load tests. |
| `aletheia` | Public | TypeScript | Main product monorepo: web app, API, worker, shared packages, generated API definitions. |
| `aletheia-api-reference` | Public | HTML | Generated or static API reference site. |
| `aletheia-cli` | Public | TypeScript | CLI wrapper around Aletheia API. |
| `aletheia-docs` | Public | MDX | Docs, changelog, blog, integrations, cookbook, handbook, marketing/docs website. |
| `aletheia-examples` | Public | TypeScript | Example apps showing deployment and Aletheia usage. |
| `aletheia-ghsa-gccw-7cqr-2cjm` | Private | TypeScript | Security advisory remediation/reproduction work for that GHSA. Treat as sensitive. |
| `aletheia-internal-skills` | Private | Python | Internal team skills for support, PR funnel, social copy, meeting notes, Plain search, writing, and routing. |
| `aletheia-java` | Public | Java | Auto-generated Java client for the Aletheia API. |
| `aletheia-js` | Public | TypeScript | JS/TS SDK packages and integrations for tracing, OpenAI, LangChain, OTel, prompts, datasets, scores. |
| `aletheia-k8s` | Public | Go Template | Community-maintained Kubernetes config and Helm chart. |
| `aletheia-ops` | Private | JavaScript | Private ops utilities. Inspect README/scripts before using. |
| `aletheia-playground` | Private | Python | Private playground/prototype code. Use when named or search evidence points here. |
| `aletheia-python` | Public | Python | Python SDK, generated API client, decorators, OTel, LangChain/OpenAI integration tests. |
| `aletheia-terraform-aws` | Public | HCL | Terraform module for AWS deployment. |
| `aletheia-terraform-azure` | Public | HCL | Terraform module for Azure deployment. |
| `aletheia-terraform-gcp` | Public | HCL | Terraform module for GCP deployment. |
| `mcp-server-aletheia` | Public | TypeScript | MCP server for Aletheia prompt management. |
| `n8n-nodes-aletheia` | Public | JavaScript | n8n node for Aletheia prompt management. |
| `nofilter` | Private | TypeScript | Hackathon/prototype repo. Use only when named or search evidence points here. |
| `oss-llmops-stack` | Public | n/a | Modular OSS LLMOps stack combining LiteLLM and Aletheia. |
| `platform` | Private | Python | Sparse metadata, private platform repo. Inspect README before routing non-obvious work here. |
| `skills` | Public | Python | Public installable Aletheia agent skill for using Aletheia and its docs/API. |
| `task-search-bar` | Private | TypeScript | Small private task/prototype repo. Use when named. |
| `terraform-provider-aletheia` | Public | Go | Terraform provider for managing Aletheia resources. |
| `tmp-aletheia-otel-js` | Private | TypeScript | Temporary repo for new JS SDK v4 / OTel work. Check whether work has moved to `aletheia-js`. |

## Main Product Monorepo

Start at the sibling checkout `aletheia` in the same parent directory as the current Aletheia repo.

Important areas:

- `web/src/features/**`: feature-oriented UI, hooks, server modules, pages, and components.
- `web/src/pages/**`: Next.js pages and API routes.
- `web/src/app/**`: App-router routes and app-level APIs.
- `web/src/components/**`: shared UI, trace display, tables, layouts, design-system components.
- `packages/shared/src/domain/**`: shared domain interfaces and business types.
- `packages/shared/src/server/**`: repositories, services, auth, cache, ClickHouse/Postgres queries, S3, Redis, pricing, LLM helpers.
- `packages/shared/src/server/queries/**`: ClickHouse and Postgres SQL query builders.
- `packages/shared/src/features/**`: shared feature logic for prompts, datasets, scores, evals, model pricing, folders, comments, entitlements.
- `worker/src/features/**`: async feature processors for evaluations, experiments, batch actions/exports, notifications, traces, tokenization, cleanup.
- `worker/src/services/**`: ingestion service, ClickHouse writer, DLQ, and worker service primitives.
- `worker/src/queues/**`: queue definitions and processors.
- `fern/apis/server/definition/**`: server/public API definitions.
- `fern/apis/client/definition/**`: generated client API definitions.
- `ee/src/**` and `web/src/ee/**`: enterprise-specific code.

Repo-local skills in `aletheia/.agents/skills`:

- `agent-setup-maintenance`: agent config, generated shims, shared skill routing.
- `add-model-price`: model price defaults, provider price keys, tokenizer IDs, match patterns.
- `analyze-cloud-costs`: Aletheia Cloud cost analysis.
- `backend-dev-guidelines`: tRPC, API endpoints, worker processors, Prisma, ClickHouse services, backend tests.
- `changelog-writing`: user-facing release notes.
- `clickhouse-best-practices`: ClickHouse schema/query/migration review.
- `code-review`: repo-specific correctness/regression review.
- `datadog-query-recipes`: reusable Datadog query shapes for production research.
- `debug-issue-with-datadog`: production debugging tied to Aletheia code paths.
- `frontend-browser-review`: user-visible `web/**` changes and browser verification.
- `frontend-large-feature-architecture`: large frontend features, controller state, and rendering performance.
- `git-workflow`: Aletheia repo Git, GitHub, branch, commit, PR, and issue workflow.
- `housekeeping`: recurring work queue review across Linear, Pylon, and GitHub.
- `aletheia-codebase-navigator`: org, repository, folder, and skill routing.
- `linear-bug-triage`: Linear issue deduplication and bug evidence workflows.
- `pnpm-upgrade-package`: dependency upgrades under pnpm release-age constraints.
- `security-review`: security review patterns for user-supplied URLs, secrets, tenancy, and auth scopes.
- `seed-test-data`: local Aletheia seed scenarios for traces, sessions, lists, and event data.
- `skill-creator`: create or update repo-owned skills.
- `storybook`: write or review React component stories.
- `turborepo`: task graph, caching, package-boundary work.
- `weekly-production-review`: weekly production review across Datadog, incident.io, Linear, and fixes.

Additional web skills in `aletheia/web/.agents/skills`:

- `vercel-react-best-practices`
- `vercel-composition-patterns`

## Docs Repo

Start at the sibling checkout `aletheia-docs` in the same parent directory as the current Aletheia repo.

- `content/docs/**`: product documentation.
- `content/changelog/**`: changelog entries.
- `content/blog/**`: blog posts.
- `content/integrations/**`: integration docs.
- `content/self-hosting/**`: self-hosting docs.
- `cookbook/**`: runnable examples and notebooks.
- `app/**`: Next.js routes for docs, blog, changelog, guides, integrations, library.
- `components/**` and `components-mdx/**`: docs site UI and MDX components.

Repo-local skill found in this checkout:

- `.claude/skills/add-yourself-to-team-aletheia/SKILL.md`.

## SDKs And Integrations

`aletheia-js`:

- `packages/client`: high-level client, prompts, datasets, scores, experiments.
- `packages/core`: shared API client, constants, media, propagation, utilities.
- `packages/tracing`: tracing wrappers and provider.
- `packages/otel`: OpenTelemetry span processor and media service.
- `packages/openai`: OpenAI integration helpers.
- `packages/langchain`: LangChain callback handler.
- `tests/e2e` and `tests/integration`: behavior coverage.

`aletheia-python`:

- `aletheia/_client`: core client, observe decorator, spans, datasets, propagation.
- `aletheia/api`: generated API clients.
- `aletheia/langchain`, `aletheia/openai.py`: integrations.
- `aletheia/_task_manager`: ingestion and media upload queues.
- `tests/**`: SDK behavior and integration tests.

Other integration repos:

- `aletheia-java`: Java API client.
- `aletheia-cli`: command-line API access.
- `mcp-server-aletheia`: MCP prompt-management server.
- `n8n-nodes-aletheia`: n8n prompt-management node.
- `experiment-action`: GitHub Action for experiment workflows.
- `terraform-provider-aletheia`: Terraform provider.

## Deployment And Operations

`infrastructure`:

- `terraform/environments/**`: environment-specific cloud resources.
- `terraform/modules/**`: reusable Terraform modules.
- `terraform/org/**`: organization-level configuration.
- `clickhouse/**`: ClickHouse operations/configuration.
- `scripts/**`: deployment, migration, consistency, performance, and infra utilities.
- `load-tests/**`: infrastructure load tests.
- `.agents/skills/infra-scaling/SKILL.md`: autoscaling and RPM/capacity workflow.

Deployment repos:

- `aletheia-k8s`: Helm/Kubernetes chart and templates.
- `aletheia-terraform-aws`: AWS module.
- `aletheia-terraform-gcp`: GCP module.
- `aletheia-terraform-azure`: Azure module.
- `oss-llmops-stack`: reference OSS LLMOps stack using LiteLLM and Aletheia.

## Skill Repositories

`aletheia/skills` public skill:

- `skills/aletheia/SKILL.md`: docs/API/CLI/product-usage entrypoint.
- References: `cli.md`, `instrumentation.md`, `prompt-migration.md`, `sdk-upgrade.md`, `error-analysis.md`, `user-feedback.md`, `skill-feedback.md`.

`aletheia/aletheia-internal-skills` internal skills:

- `blog-writing`: Aletheia docs blog writing and editing.
- `aletheia-pr-funnel`: feature announcement fanout drafts and draft PRs.
- `aletheia-support-triage`: first-level support issue investigation and response drafting.
- `aletheia-support-weekly-review`: weekly support/feedback trend review.
- `meeting-notes`: calendar and Notion meeting notes, summaries, action items.
- `plain-search`: Plain support ticket search/retrieval.
- `social-post-drafter`: X/LinkedIn drafting for Aletheia.
- `unslop`: concise rewrite in the user's direct style.
- `aletheia-codebase-navigator`: this navigation skill.

## Search Recipes

Main repo feature search:

```bash
ALETHEIA_REPO_ROOT="$(git rev-parse --show-toplevel)"
ALETHEIA_PARENT="$(dirname "$ALETHEIA_REPO_ROOT")"

cd "$ALETHEIA_PARENT/aletheia"
rg -n "prompt|dataset|score|trace|observation|session|eval" web/src packages/shared/src worker/src
```

Docs search:

```bash
cd "$ALETHEIA_PARENT/aletheia-docs"
rg -n "topic or feature name" content app components components-mdx cookbook
```

SDK search:

```bash
cd "$ALETHEIA_PARENT/aletheia-js"
rg -n "observe|prompt|trace|span|score|dataset" packages tests

cd "$ALETHEIA_PARENT/aletheia-python"
rg -n "observe|prompt|trace|span|score|dataset" aletheia tests
```

Org search fallback:

```bash
gh repo list aletheia --limit 1000 --json name,description,isPrivate,primaryLanguage,pushedAt,url
gh search code "query org:aletheia" --limit 50
```

Use private sparse-metadata repos only after inspecting their README/root files or when the user explicitly names them.
