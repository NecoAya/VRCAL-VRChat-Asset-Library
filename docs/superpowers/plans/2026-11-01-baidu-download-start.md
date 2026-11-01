# Baidu download startup repair

> Execute with isolated synthetic profiles and the existing regression commands. Existing user authorization requests direct implementation without repeated design approval.

**Goal:** Repair the proven deadline inconsistency and make failures diagnosable at the actual share page.

**Architecture:** Keep one fixed 45-second armed startup deadline shared by page actions, polling, navigation and native download acceptance. Preserve exact file/view/origin checks. A user-invoked verification action temporarily displays the existing sandboxed share view in an owned native window; normal downloads remain in the app's background flow. Closing this window detaches the view for reuse. Stop/logout disposes it.

**Scope:** No additional providers, private APIs, client invocation, CDN allowlist expansion, source-library scanning or downloads of real large packages. Login at the netdisk home does not establish successful share downloading. Real probes stay outside the public repository, omit credentials/signed URLs, and use the previously authorized isolated test session.

- [x] Reproduce original deadline rejection with synthetic timers and a valid late download event; implement and pass six startup regressions.
- [x] Verify original 1.4.0 with the previously authorized 164 KB image and the user's failing share. Image completed; the latter produced an accepted 28.4 MB native task, immediately cancelled by the probe. User's current-session failure remains unconfirmed.
- [x] Write failing tests for explicitly showing the existing share view, reuse, close/detach, network guard and stop cleanup.
- [x] Implement `BaiduDownloads.openVerification()`, fixed `openBaiduDownloadVerification` IPC/preload contract and the error-panel action. No automatic diagnostic window.
- [x] Run native synthetic window lifecycle checks, startup/verification/security tests, type checks and full suite. Four native checks and 1303 regression tests pass. Existing GUI acceptance scripts were updated for the collapsed appearance controls, category dropdown and data-driven contributor count.
- [x] Prepare a clearly labelled diagnostic preview with notes distinguishing proven fixes from the unresolved current-session failure. Include contributor credit already on main; do not merge pending PR #3.
- [ ] Build and validate packages, publish corresponding preview/source/guides/checksums to GitHub after checks; keep 1.4.0 stable assets intact.
