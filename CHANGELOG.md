# Changelog

Only versions published from this fork are listed here. Upstream releases under the
previous package name `dsh-codex-connect` are historical records and remain in
[INSTALL.md](INSTALL.md) and `docs/release-notes/`; they are not this package.

## 0.3.2 — 2026-11-13

Host-compatibility hardening: the capability gate now covers the whole surface the frozen Adaptive
Task layer calls, and the declared verification matrix finally includes the DSH releases this
project exists to survive.

- **The gate checks six registry members, not the two that had already been removed.** `0.3.1` asked
  only whether `roots` and `isOwnedBy` existed. A host that removed `get`, `list`, `create` or
  `currentInitiator` instead would still have been treated as healthy and crashed on first use, so
  the surface now lives in one place (`src/host-contract.ts`) and the gate reports *which* members
  are missing rather than a bare boolean.
- **A drift check keeps that list honest in both directions.** `check:host-contract` fails when a
  task-layer call site uses a member the contract omits, and also when the contract names a member
  no call site uses — the second would disable healthy hosts, which is a regression dressed as a
  safety check.
- **Every installation report now records the host's registry surface.** The declared-host matrix
  and the upstream canary read `AgentRegistry.prototype` on the host that was actually installed
  and record which members are present and which are missing. A removal therefore shows up as a
  matrix diff instead of a stack trace. The record is evidence, not a requirement: a missing member
  is expected on newer hosts and is handled by the capability gate.
- **DSH `0.2.2-rc.1` and `0.2.2-rc.2` are declared and installed in CI.** `0.2.2-rc.2` is the host
  where every model request used to fail, and until now the matrix never ran on it. `engines.dsh`
  is deliberately unchanged: DSH hard-blocks a plugin whose `engines.dsh` does not match, so
  narrowing it would refuse to load on the next DSH release instead of degrading.
- **Known gaps, unchanged:** the declared matrix still mirrors the older handbook sections rather
  than being generated from one source; the UI strings and panel sections have never been reviewed
  on a real machine.

## 0.3.1 — 2026-11-12

First stable release of this fork, published to the npm `latest` dist-tag. Source behaviour is
identical to `0.3.1-alpha.5`; only the version and the release channel change.

- **`latest` now resolves to runnable code.** It previously pointed at `0.3.1-alpha.4`, which
  failed every model request on DSH `0.2.2-rc.2` — and the READMEs install by bare package name,
  so `latest` is the command most readers actually run.
- **One workflow publishes two channels.** A numeric Alpha version still publishes to `alpha` and
  creates a GitHub prerelease; a stable `X.Y.Z` publishes to `latest` and creates a full release.
  The version shape selects the channel, so no run can put a prerelease on `latest`, and `lint`
  enforces the same rule against `publishConfig.tag`.
- **Readback and recovery follow the channel.** Post-publish verification asserts the version on
  the dist-tag its shape requires, and recovery recreates a full release rather than a prerelease.
  Regressions cover both, because a stable publish failing readback would otherwise leave the npm
  version without its GitHub release.
- **Not addressed here:** `engines.dsh` still declares `>=0.1.7-rc.1 <0.3.0`, and the declared
  verification matrix still omits DSH `0.2.2-rc.1`/`rc.2` — the hosts this fix exists for.
  Narrowing the range and adding those hosts is follow-up work, not part of this release.

## 0.3.1-alpha.5 — 2026-11-08

Compatibility fix for DSH releases that removed two `AgentRegistry` members. No provider, image or
proxy behaviour changed.

- **Fixed: every model request failed on DSH 0.2.2-rc.2** with `this.agents.roots is not a function`.
  The frozen Adaptive Task layer still called `AgentRegistry.roots()` and `isOwnedBy()`, which newer
  hosts no longer expose, and it did so from an `agent/request` hook registered with `prepend: true`
  — so the failure landed on every request instead of at startup.
- **The task layer detects those members at call time.** Elsewhere the provider, model picker, image
  lane, quota tool and scoped proxy keep working, the task routes stay registered so unauthenticated
  callers still receive 401 rather than 404, and every task entry point answers with an explicit
  `TASK_HOST_UNSUPPORTED` failure instead of calling a missing member, while a host that merely
  lacks the task services keeps its existing `TASK_LIVE_ROOT_REQUIRED` answer. Detection runs per call
  because the agent registry is not resolved yet while the plugin is being applied — an earlier
  assembly-time probe turned that 401 into a 404 and was caught by the declared-host install matrix.
  A unit test pins both directions of the gate, because an inverted gate would reproduce the original
  failure silently.
- **This is a stopgap.** On such hosts the task layer stays unavailable rather than being ported.
  The durable fix derives both helpers from `AgentRegistry.list()` plus `session.header.parentSession`
  so the layer works on every supported host; that change is scheduled next.
- **Not addressed here:** `engines.dsh` still declares `>=0.1.7-rc.1 <0.3.0`, which is wider than
  the versions this release was verified against. Narrowing it is part of the follow-up work, not
  of this release.

## 0.3.1-alpha.4 — 2026-11-08

Settings-path fix. Two locale strings changed; no other runtime behaviour differs.

- **The models card no longer sends users to a settings page this plugin does not appear on.**
  It said **Settings → Plugins → ChatGPT Connect**, but the plugin is mounted under the ANB
  tools shell instead, so that path led nowhere. Both languages now read
  **Settings → ANB 工具 → ChatGPT Connect**, which is the path the README already documented.
  The two client tests assert the locale constant itself rather than a copy of the text, so
  they follow the change without edits.
- **The same path is used in `INSTALL.md` and in `docs/auto-review.*`, `docs/reference.*` and
  `docs/runtime-identity.md`.** The note in `INSTALL.md` about what upstream Alpha 4.25 offered
  is left exactly as written: it records a past release, and rewriting it would falsify history.

## 0.3.1-alpha.3 — 2026-11-08

Documentation and release-gate release. No runtime behaviour changed.

- **Install by the bare package name.** The README now recommends
  `dsh plugin --profile web add dsh-chatgpt-connect` with no version and no tag, so a release no
  longer edits it. `latest` on npm now points at the published Alpha, which is what makes the bare
  install resolve to a real package instead of the `0.0.0` name-reservation placeholder.
- **State the bounded range instead of listing hosts.** Harness `>=0.1.7-rc.1 <0.3.0` loads the
  plugin; whether a host is `compatible` or `unverified` is a separately recorded verdict in
  `compatibility.json`. That is the reason this fork exists, so the README stops copying the list.
- **Document the proxy panel as it behaves**: off by default, detect or configure manually, and
  activation requires a successful test of that exact address.
- **Add a day-to-day flow and a settings walkthrough**, drop the table of contents, remove the
  `dsh web` step from routine use, and remove the upstream-history appendix — the licence section
  already carries the provenance.
- **Move the exact-version requirement from the README into `INSTALL.md`.** The release-gate check
  now requires one bare command in each README, one exact Alpha version in `INSTALL.md` that is not
  newer than the candidate, and a V1-shaped compatibility catalog.
- **The gate now requires both language READMEs.** Handed a single document it returned no
  failures, because every per-document rule still held for the one file supplied. The "missing
  language" regression case therefore asserted on an empty list, threw at import time, and took
  `pnpm run lint` down with it. Both documents must now be supplied together.

## 0.3.1-alpha.2 — 2026-11-08

Documentation and packaging release. One real defect fixed; everything else is facade work.

- **Fixed: the in-panel agent upgrade prompt named the wrong repository.** It pointed at the
  upstream project, so asking the agent to help with an upgrade sent users to a *different*
  npm package. `src/update.ts` already built its release link from this fork, so one feature
  disagreed with itself. The localStorage cache and dismissal keys keep the upstream name on
  purpose: they are persisted identifiers, and renaming them drops saved dismissals.
- **The README facade is rebuilt to a fixed order** and the hand-authored SVG asset set now
  ships in the package: a hero banner, an app icon, a wordmark, and `assets/README.md` with
  the palette, the edit rules and the non-official notice.
- **`CHANGELOG.md` is part of the package**, including the known-limitations section below.
- **`VERSIONING.md` and its Chinese counterpart now name `0.3.1-alpha.N`** as this fork's
  release line. The upstream `0.2.0-alpha.N` and `0.1.0-alpha.4.x` sections stay as history,
  because a published version and its tag are never renumbered.
- **`INSTALL.md`, `MIGRATION.md` and `RELEASING.md`** record the first-publication bootstrap
  order, the Linux `lib/` build rule, and the fact that this package's manifest carries no
  `gitHead` — the SLSA provenance attestation is the artifact-to-commit link instead.
- **Removed the unused `src/host-seam-probe.ts`.** Nothing imported it and it was never a
  build entry, so the published artifact is unchanged by the removal.

## 0.3.1-alpha.1 — 2026-11-07

First release published from this fork. Package and CLI are both `dsh-chatgpt-connect`.

- Published from `main` through npm Trusted Publishing (OIDC). No long-lived npm token
  exists for this package, and the workflow never promotes the `latest` dist-tag.
- Bounded Host admission (`>=0.1.7-rc.1 <0.3.0`) with a verified list kept separate from
  the declared range. A Host inside the range that is not on the verified list is reported
  as `unverified`, never asserted as working.
- Verified on fifteen exact DSH Hosts by the CI installation matrix on the published commit.
- SLSA provenance attestation attached to the published artifact. The manifest carries no
  `gitHead` field because the workflow publishes a prebuilt tarball; the attestation is the
  artifact-to-commit link.
- Windows acceptance paths no longer apply POSIX-only permission and ownership checks.

## Known limitations (stated plainly)

This is an Alpha. Nothing below is a defect report; it is what this release does **not**
establish or guarantee. Read it before relying on the package.

- **The in-panel update check is disabled in this fork.** It reports update information as
  unavailable and makes no network request. Upgrades go through the plugin manager.
- **Task orchestration is frozen and paused.** Activation is rejected everywhere; adaptive
  Task, automatic delegation and unproven optimizations are not resumable. Migration of
  earlier Task grants across a Harness upgrade has not been verified.
- **No live-account acceptance was performed for this release.** The fifteen-Host matrix is
  a keyless isolated install plus `doctor` regression. It does not demonstrate a real OAuth
  flow, real model access, real image generation or editing, or authenticated browser use.
- **No new real Desktop acceptance.** The only Desktop comparison on record is historical and
  covers the client of `0.2.0-alpha.3` only; it says nothing about later artifacts.
- **`latest` on npm points at the `0.0.0` name-reservation placeholder.** An install that
  omits an exact version resolves to a package with no plugin code. Always pin the version.
- **This fork's first release has no earlier published pairing** to fall back to, and no
  "previous confirmed combination" to keep recommending while a candidate is prepared.
- **Model availability is not ours to promise.** OpenAI controls model access, quota, context
  capacity and served tier. A catalog entry is not proof of entitlement, and access from
  another client does not imply this integration works.
- **Not implemented:** Ultra orchestration for Codex Sol, and any desktop Computer Use
  executor. Neither is planned by this changelog entry.
- **Image capability depends on the account and the service.** Availability, dimensions and
  quota consumption are controlled upstream; no fixed behaviour is guaranteed.
- **One persisted identifier still uses the upstream name.** The client registration id is
  `dsh-codex-connect-client`; whether the Host derives the expected row id from the package
  name is not verified, so renaming it without a live-profile test risks the settings panel
  not mounting. See [MIGRATION.md](MIGRATION.md).
- **The documentation facade is incomplete.** `assets/` (hero image, icon, wordmark) has not
  been supplied yet, so the README deliberately carries no artwork rather than borrowing
  upstream's.
- **No stability or support commitment.** Alpha channel, no SLA, and no promise that a later
  release keeps every option listed here.
