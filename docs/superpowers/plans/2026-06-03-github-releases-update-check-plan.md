# GitHub Releases Update Check Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Releases-based update detection to the current Tauri desktop application, with startup silent checks, a manual check entry point, and a prompt that takes users to the GitHub release download page instead of downloading or installing updates inside the app.

**Architecture:** Keep the implementation entirely on the frontend. A dedicated update service will call the public GitHub Releases API for the configured repository, normalize the latest release payload, compare it against the local Tauri app version, and return a stable result. A lightweight update state layer will handle throttling, manual and silent flows, and user-visible outcomes. The existing global app shell, modal system, and toast system will host the UI.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, existing shared modal and toast primitives

---

### Task 1: Add GitHub release types and update service

**Files:**
- Add: `src/shared/model/update.ts`
- Add: `src/shared/lib/github-update-service.ts`
- Add or Modify: update-related tests under `tests/`

- [ ] **Step 1: Define the GitHub release and update result types**

Add stable frontend types:

```ts
export type GithubReleaseInfo = {
  version: string
  tagName: string
  notes: string
  publishedAt: string
  releaseUrl: string
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "check-failed"

export type UpdateCheckResult =
  | { status: "up-to-date"; currentVersion: string }
  | {
      status: "update-available"
      currentVersion: string
      release: GithubReleaseInfo
    }
  | {
      status: "check-failed"
      currentVersion: string | null
      message: string
    }
```

- [ ] **Step 2: Add strict version parsing and comparison helpers**

Support only three-part semver values and normalize optional `v` prefixes:

- accept `1.2.3`
- accept `v1.2.3`
- reject anything else

Expected helper shape:

```ts
normalizeVersionTag(version: string): string | null
parseStrictSemver(version: string): [number, number, number] | null
compareSemver(left: string, right: string): -1 | 0 | 1
```

- [ ] **Step 3: Implement the GitHub update service**

Create `checkForUpdates({ silent })` that:

- reads the local app version from the Tauri app API
- requests `https://api.github.com/repos/{owner}/{repo}/releases/latest`
- extracts `tag_name`, `html_url`, `body`, and `published_at`
- normalizes `tag_name` into the comparable version string
- returns:
  - `up-to-date` when the latest GitHub release is not newer
  - `update-available` when the GitHub release is newer
  - `check-failed` on invalid payloads, invalid versions, or request errors

Ignore draft and prerelease handling because the `latest` endpoint should target the latest published release for this phase.

- [ ] **Step 4: Cover the service with tests**

Add tests for:

- local `0.1.0` vs remote `0.1.1`
- local `0.1.0` vs remote `v0.1.0`
- local `0.1.1` vs remote `0.1.0`
- invalid `tag_name`
- missing `html_url` or `published_at`
- GitHub request failure
- invalid local version

---

### Task 2: Add update state, throttling, and result handling

**Files:**
- Add: `src/shared/model/use-update-store.ts` or equivalent state module
- Add or Modify: update state tests

- [ ] **Step 1: Add a dedicated update state shape**

Include:

- `status`
- `isChecking`
- `lastCheckedAt`
- `availableRelease`
- `errorMessage`
- `isPromptOpen`

Actions should include:

- `runStartupUpdateCheck()`
- `runManualUpdateCheck()`
- `dismissUpdatePrompt()`
- `openReleasePage()`

- [ ] **Step 2: Add 24-hour silent-check throttling**

Persist the last completed update check timestamp under one stable storage key:

```ts
const LAST_GITHUB_UPDATE_CHECK_AT_STORAGE_KEY =
  "payroll:github-update-last-checked-at"
```

Rules:

- startup silent checks skip network calls if the previous completed check is within 24 hours
- startup silent checks resume after the throttle window expires
- manual checks ignore throttling completely

- [ ] **Step 3: Separate silent and manual behaviors**

Implement:

- startup silent check:
  - runs on app shell mount
  - no toast for “already latest”
  - no toast for failures
  - opens the update prompt when a newer release is found
- manual check:
  - sets visible loading state
  - shows success toast when already latest
  - shows error toast on failures
  - opens the update prompt when a newer release is found

- [ ] **Step 4: Add state tests**

Cover:

- startup checks are skipped within 24 hours
- startup checks run again after 24 hours
- manual checks always run
- update results open the prompt
- silent checks suppress informational and failure prompts
- manual checks emit the expected toast-driven feedback

---

### Task 3: Add the global UI entry point and release prompt

**Files:**
- Modify: `src/app/app-shell.tsx`
- Add: `src/shared/ui/update-available-dialog.tsx`
- Modify if needed: shared UI helpers used by the dialog

- [ ] **Step 1: Add a manual update-check control to the global header**

Place the control in the existing shell header so it is available from both `工资` and `人员` views. The control should:

- trigger the manual update check
- show disabled/loading state while checking
- not interfere with the current view switcher layout

- [ ] **Step 2: Add the update-available dialog**

The dialog should show:

- current version
- latest version
- published time
- release notes

Actions:

- `稍后再说`
- `前往下载`

Reuse the existing modal shell patterns and keep the content plain text.

- [ ] **Step 3: Wire the download action to GitHub**

When the user clicks `前往下载`, open the GitHub release page using the release `html_url`. Keep this action behind a dedicated UI/state method so it can later evolve into a richer updater path without changing callers.

- [ ] **Step 4: Reuse the toast system for manual outcomes**

Use the existing toast layer for:

- manual “already latest”
- manual failure

Do not show extra toast noise for startup silent checks.

---

### Task 4: Centralize repository configuration

**Files:**
- Add or Modify: frontend config/constants module
- Add: optional documentation note if local setup needs a repository override

- [ ] **Step 1: Add one repository configuration source**

Do not hardcode the repository in multiple files. Use one config wrapper for:

- `repoOwner`
- `repoName`
- optional `releasePageOverrideUrl`

Prefer a Vite env wrapper or a dedicated constants module so deployment changes are obvious and localized.

- [ ] **Step 2: Keep the configuration compatible with future updater work**

Do not couple the app to GitHub asset filenames, installer selection logic, or platform-specific package picking in this phase. The only required output is the release page URL plus latest comparable version metadata.

- [ ] **Step 3: Keep the feature independent from backend and routing**

Do not introduce:

- Rust-side update commands
- frontend routing dependencies
- coupling with payroll or personnel business stores

The only integration point should remain the app shell.

---

### Task 5: Verify end-to-end behavior

**Files:**
- Modify: relevant test files only if required

- [ ] **Step 1: Run update-service and state tests**

Verify version parsing, GitHub response handling, throttling, and prompt opening behavior.

- [ ] **Step 2: Run existing frontend and Rust tests**

Confirm the shell-level integration does not regress current payroll or personnel behavior.

- [ ] **Step 3: Manually validate the main scenarios**

Validate:

- a newer GitHub release opens the prompt
- no newer release shows only the manual success toast
- bad repository or network failure shows only the manual error toast

- [ ] **Step 4: Validate the throttle window**

Confirm:

- first launch performs a silent check
- repeated launch within 24 hours skips the request
- manual checks still request GitHub during the throttle window

---

## Assumptions and Defaults

- The release repository is public, so the client can call GitHub directly.
- This phase only checks for updates and redirects users to GitHub to download them.
- The app uses GitHub’s `latest release` endpoint as the single source of truth.
- Release notes are rendered as plain text.
- `前往下载` opens the GitHub release page instead of directly downloading platform-specific assets.
- The current app version continues to come from the Tauri app version, not `package.json`.
- If the project later upgrades to in-app download and installation, that will be a separate phase using Tauri updater and signed artifacts.
