# Desktop Update Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add desktop update detection to the current Tauri application with both startup auto-check and manual check entry points, while only notifying users about updates in this phase and not downloading or installing them.

**Architecture:** Keep the feature entirely on the frontend for now. A dedicated update service will read the local app version, fetch a custom remote release manifest, compare semver versions, and return a normalized result. A lightweight update state layer will coordinate startup throttling, manual checks, and user-facing status. The global app shell will host the manual trigger and the update prompt dialog, reusing the existing toast and modal primitives.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, existing shared modal/toast primitives, existing test runner patterns

---

### Task 1: Add the update domain model and service

**Files:**
- Add: `src/shared/model/update.ts`
- Add: `src/shared/lib/update-service.ts`
- Add or Modify: `tests/` update-related test file

- [ ] **Step 1: Define the public update types**

Add stable frontend types for the remote manifest and normalized check results:

```ts
export type RemoteReleaseInfo = {
  version: string
  notes: string
  publishedAt: string
  downloadUrl: string
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "check-failed"

export type UpdateCheckResult =
  | {
      status: "up-to-date"
      currentVersion: string
    }
  | {
      status: "update-available"
      currentVersion: string
      release: RemoteReleaseInfo
    }
  | {
      status: "check-failed"
      currentVersion: string | null
      message: string
    }
```

- [ ] **Step 2: Implement semver comparison helpers**

Add strict `major.minor.patch` parsing and comparison helpers that:

- accept only three-part numeric semver values
- reject invalid local or remote version strings
- compare `major`, then `minor`, then `patch`

Expected helper shape:

```ts
parseStrictSemver(version: string): [number, number, number] | null
compareSemver(left: string, right: string): -1 | 0 | 1
```

- [ ] **Step 3: Implement the remote update service**

Create `checkForUpdates({ silent })` that:

- reads the current app version from the Tauri app API
- fetches the remote JSON manifest from a single configured URL
- validates the manifest shape
- compares current version to remote version
- returns a normalized `UpdateCheckResult`

Rules:

- invalid remote payload returns `check-failed`
- request failure returns `check-failed`
- equal or lower remote version returns `up-to-date`
- higher remote version returns `update-available`
- the `silent` flag is accepted at the service boundary so callers use one stable interface even though silent/manual differences are handled by the state layer

- [ ] **Step 4: Cover the service with focused tests**

Add tests for:

- local version lower than remote version
- local version equal to remote version
- invalid remote version string
- missing remote fields
- fetch failure
- invalid local version

---

### Task 2: Add lightweight update state and startup throttling

**Files:**
- Add: `src/shared/model/use-update-store.ts` or equivalent frontend state module
- Add or Modify: update state tests

- [ ] **Step 1: Add update state shape**

Create a small dedicated update state with:

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
- `openDownloadPage()`

- [ ] **Step 2: Add 24-hour startup throttling**

Persist the last completed check time in a single `localStorage` key. Startup checks should:

- skip network calls if the last completed check happened less than 24 hours ago
- still allow future startup checks after the window expires
- never block manual checks

Use one stable key, for example:

```ts
const LAST_UPDATE_CHECK_AT_STORAGE_KEY = "payroll:update-last-checked-at"
```

- [ ] **Step 3: Define silent vs manual behavior**

Implement behavior differences in the state layer:

- startup auto-check:
  - runs silently on shell mount
  - does not show “already latest” feedback
  - does not show failure toasts
  - opens the update prompt when a new version is found
- manual check:
  - sets visible loading state
  - shows “already latest” notice when no update exists
  - shows error feedback when check fails
  - opens the update prompt when a new version is found

- [ ] **Step 4: Add state tests**

Cover:

- startup checks are skipped within 24 hours
- startup checks run again after 24 hours
- manual checks ignore throttling
- update results open the prompt
- silent checks suppress success and error prompts
- manual checks emit success and error feedback

---

### Task 3: Add global UI entry points and update prompt

**Files:**
- Modify: `src/app/app-shell.tsx`
- Add: `src/shared/ui/update-available-dialog.tsx`
- Modify if needed: shared UI helpers used by the prompt

- [ ] **Step 1: Add a manual “check for updates” entry to the app shell**

Place the entry in the existing global header so it is available from all current views. The control should:

- trigger the manual update check action
- show a loading/disabled state while checking
- avoid disrupting the existing payroll/personnel view switcher

- [ ] **Step 2: Add the update prompt dialog**

Create a dedicated dialog component that shows:

- current version
- latest version
- published date
- update notes

Actions:

- `稍后再说`
- `前往下载`

The dialog should reuse the existing modal shell patterns rather than introducing a new dialog system.

- [ ] **Step 3: Wire download-page navigation**

When the user clicks `前往下载`, open the remote `downloadUrl` in the system browser. Keep this action isolated behind the update state or UI action handler so later downloader/updater work can replace it cleanly.

- [ ] **Step 4: Reuse existing toast feedback for manual check outcomes**

Use the existing toast system for:

- manual no-update success
- manual check failure

Do not show toast noise for silent startup checks.

---

### Task 4: Configure environment and keep the implementation extensible

**Files:**
- Modify: frontend config or constants module for the remote manifest URL
- Modify if needed: Tauri capability/config files only if required by the chosen browser-open API
- Add: developer-facing documentation if configuration needs to be set locally

- [ ] **Step 1: Introduce a single manifest URL configuration point**

Do not scatter the endpoint in UI code. Use one configuration source, such as:

- a frontend constant
- a Vite env variable wrapper

The implementation should make it obvious where to replace the URL for production deployment.

- [ ] **Step 2: Keep the boundary compatible with future updater work**

Do not introduce installer-specific assumptions into the service result. The current abstraction should remain usable if the project later switches from “open download page” to “download and install”.

- [ ] **Step 3: Avoid route or backend coupling**

Keep this feature independent from:

- frontend routing
- Rust-side update commands
- current payroll/personnel business stores

The only global integration point should be the app shell.

---

### Task 5: Verify behavior end-to-end

**Files:**
- Modify: relevant test files only if needed

- [ ] **Step 1: Run frontend tests for the update service and state**

Verify the new comparison, fetch, throttling, and prompt behavior with automated tests.

- [ ] **Step 2: Run the existing workspace test suite**

Confirm the new shell-level update logic does not regress current payroll/personnel flows.

- [ ] **Step 3: Manually validate the three core scenarios**

Use a mock manifest to verify:

- remote version higher than local version opens the prompt
- remote version equal to local version shows only the manual success notice
- network or payload failure shows only the manual error notice

- [ ] **Step 4: Validate startup throttling**

Confirm:

- first startup performs one silent check
- repeated startup within 24 hours skips the request
- manual check still works during the throttle window

---

## Assumptions and Defaults

- This phase does **not** download or install updates.
- The remote update source is a custom JSON manifest maintained outside the app.
- Update notes are rendered as plain text only.
- `前往下载` opens an external release or download page in the system browser.
- The manual entry point lives in the existing global header instead of a new settings page.
- Version comparison supports only strict `major.minor.patch` semver strings.
