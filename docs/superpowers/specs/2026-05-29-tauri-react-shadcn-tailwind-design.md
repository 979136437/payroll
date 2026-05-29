# Tauri + React + Tailwind + shadcn/ui Design

## Summary

Create a new desktop application in the current directory using Tauri, React, Vite, and TypeScript. Add Tailwind CSS and shadcn/ui so the project starts with a modern UI foundation that is ready for later payroll-related screens.

The first milestone is a clean, working scaffold rather than business features. The project should build and run as both a Vite web app and a Tauri desktop app, with at least one shadcn/ui component rendered to prove the styling and component pipeline are wired correctly.

## Goals

- Scaffold a new Tauri desktop project in the current directory.
- Use React with TypeScript and Vite for the frontend.
- Configure Tailwind CSS for utility-first styling.
- Configure shadcn/ui with the expected aliases and base styles.
- Render a minimal starter screen using shadcn/ui components to verify setup.
- Leave the structure clean and easy to extend for future payroll features.

## Non-Goals

- No payroll import, parsing, or spreadsheet workflows in this step.
- No custom design system beyond the default shadcn/ui foundation.
- No multi-page information architecture yet.
- No backend service beyond the standard Tauri shell.

## Recommended Approach

Use the official Tauri React + TypeScript + Vite scaffold as the base, then layer Tailwind CSS and shadcn/ui on top. This keeps the setup close to common Tauri practice, minimizes custom configuration, and makes future maintenance easier.

Alternative approaches such as Next.js or a heavier custom UI shell were considered, but they add complexity without helping the current goal of establishing a reliable desktop-ready foundation.

## Project Structure

Expected top-level structure:

- `src/` for the React frontend.
- `src-tauri/` for the Tauri desktop shell and Rust configuration.
- `components.json` for shadcn/ui configuration.
- `tailwind.config.*` and related CSS setup for Tailwind.
- `docs/superpowers/specs/` for the design document.

Within the frontend:

- `src/main.tsx` bootstraps the React app.
- `src/App.tsx` renders the starter application shell.
- `src/components/ui/` contains generated shadcn/ui components.
- `src/lib/utils.ts` contains the standard `cn` helper if required by shadcn/ui.
- `src/index.css` or equivalent holds Tailwind directives and theme variables.

## UI Starter Scope

The starter UI should stay intentionally small:

- A single main screen.
- A short title and description confirming the desktop scaffold is working.
- At least one shadcn/ui `Button`.
- At least one shadcn/ui surface component such as `Card`.

This screen is only a verification shell. It should not imply final payroll workflows or visual branding.

## Data Flow

For this milestone, data flow is minimal:

1. Vite serves the React frontend during development.
2. Tauri hosts the frontend inside the desktop shell.
3. React renders static starter content using Tailwind and shadcn/ui.

No runtime business data, persistence, or Tauri command bridge is required yet.

## Error Handling

The setup should favor standard toolchain behavior:

- Dependency installation failures should be surfaced directly from the package manager.
- Tauri scaffold failures should fail fast rather than being hidden behind wrappers.
- If shadcn/ui requires path alias or Tailwind config changes, those should be made explicitly and kept minimal.

Because this is a scaffold milestone, the main reliability target is predictable setup rather than custom in-app error UX.

## Testing And Verification

Verification for this task should include:

- Dependency installation completes successfully.
- Frontend type checking or build completes successfully.
- Vite production build completes successfully.
- Tauri project configuration is present and structurally valid.
- The starter app imports and renders at least one generated shadcn/ui component without path or style errors.

If a full native Tauri desktop run is not possible in the environment, report that limitation clearly and still verify the project as far as the available toolchain allows.

## Open Decisions Resolved

- Package manager: `pnpm`
- Target directory: current directory
- Language: `TypeScript`
- Frontend builder: `Vite`
- Initial scope: base scaffold only, with minimal shadcn/ui verification UI

## Implementation Notes

Implementation should prefer the official generators and keep manual edits focused on integration points:

- Generate the Tauri + React + TypeScript + Vite base app.
- Add and configure Tailwind CSS.
- Initialize shadcn/ui.
- Install a small number of starter UI components.
- Replace the default app screen with a minimal verification shell.

This should result in a straightforward, maintainable starting point for later payroll-specific work.
