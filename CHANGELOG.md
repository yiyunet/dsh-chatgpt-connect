# Changelog

Only versions published from this fork are listed here. Upstream releases under the
previous package name `dsh-codex-connect` are historical records and remain in
[INSTALL.md](INSTALL.md) and `docs/release-notes/`; they are not this package.

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
