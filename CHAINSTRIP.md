# chainstrip dependency gating

This repo gates its dependencies with [chainstrip](https://github.com/chainstrip):
every third-party package of the web app is reduced to the surface the app
actually uses, validated against the jest suite and a production webpack build,
and any later change to a dependency is classified and gated in CI before it
can merge.

The chainstrip target is `webapp/` (the React web app). The Go server and the
e2e suites are out of scope for the CI gate.

## The two workflows

The work is split by cost, so PRs stay fast:

| Workflow | Runs on | Does | Cost |
|---|---|---|---|
| **`chainstrip-baseline.yml`** | push to `master` | full `chainstrip run` → builds the hardened artifact, caches the ~270 MB gate baseline keyed on `webapp/package-lock.json` | hours (larger runner) |
| **`chainstrip-gate.yml`** | PRs touching deps | restores that baseline, runs the update scan, **fails the check on a risky change** | minutes |

The baseline is valid across any commit that doesn't change dependency *usage*,
so most PRs are a near no-op diff. A PR that bumps or adds a dependency is
compared against the cached baseline and classified:

- `no-usage-impact` — the change doesn't touch the used surface → PASS
- `retained-surface-changed` — the used surface changed → surfaced for review
- `validation-regression` — the change breaks a mapped test → **BLOCK**
- `capability-escalation` — the dep gained a dangerous primitive (fs / net /
  child_process / env) → **BLOCK**
- `expanded-usage-vulnerable` — new code reaches a known-CVE symbol → **BLOCK**
- `new-dependency` — a brand-new package entered the tree → **BLOCK**

Which classes **block** is set in `chainstrip.config.json` under `update.block`.

## Waiving a block (human override)

When the gate blocks a change a reviewer knows is safe:

```sh
chainstrip update approve <dep>@<version> --reason "audited the diff"
```

This writes `chainstrip-approvals.json`. Commit it to the PR — the waiver is now
part of the reviewed diff (with the approver and reason), `git blame`-auditable,
and the gate re-runs green. The approval binds to the change's *fingerprint*, so
any later change to that dep produces a new fingerprint and the gate re-blocks —
a waiver never silently carries over.

## How the CLI gets here (no secrets in this repo)

This repo is **public and token-free**. It never touches chainstrip's source.
`setup-chainstrip` installs a **prebuilt CLI** — `@chainstrip/cli` on GitHub
Packages — using only the workflow's ambient `GITHUB_TOKEN` (`packages: read`).
The package is built and published from chainstrip's own (private) repo with
*its* ambient token; no personal access token exists anywhere in the chain.

## Prerequisites (set once)

- **Repo/org variable `CHAINSTRIP_LARGE_RUNNER`** → the label of a larger runner
  for the baseline job (e.g. `ubuntu-latest-8-cores`). The webapp build + jest
  suite is heavy for a stock 2-core runner. The PR gate stays on free standard
  runners.
- **(optional) variable `CHAINSTRIP_CLI_VERSION`** → pin an exact
  `@chainstrip/cli` version instead of `latest` (recommended for a reproducible
  demo).
- **Package read access** → once, grant this repo access to `@chainstrip/cli`
  (make the package public, or add this repo under the package's *Manage Actions
  access*), so the ambient `GITHUB_TOKEN` can install it.
- The webapp build and test suite need **no secrets and no services** — the CI
  config runs them as-is.

## What CI does NOT run

The committed `chainstrip.config.json` is the CI subset of the pipeline. Two
evidence stages run only in a local full-pipeline setup, because they need a
built Mattermost server and its docker services (and, for probe generation, an
LLM key): e2e coverage (`cove2e`, with browser coverage) and generated evidence
probes (`witness`). Their evidence widens what can be trimmed; CI's gate
verdicts never depend on them.
