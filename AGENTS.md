# AGENTS.md instructions for F:\study\tauri\payroll

<INSTRUCTIONS>
1、请称呼我为主人
2、提交时必须使用 git-commit-cn，绝对不允许使用英文，关键字除外
3、我修改后的代码不允许改回来
</INSTRUCTIONS>

--- project-doc ---

# Repository Guidelines

## Project Structure & Module Organization
This project is a Next.js App Router application with TypeScript, Tailwind CSS, and Drizzle ORM. Put pages, layouts, and route handlers in `src/app`, shared UI in `src/components`, and business logic in `src/lib`. Service modules such as `src/lib/services/payroll.service.ts` and `src/lib/services/personnel.service.ts` should keep API and database code out of components. Database schema and connection setup live in `src/lib/db`. Keep deployment files at the root, including `Dockerfile`, `docker-compose.yml`, and `drizzle.config.ts`.

## Build, Test, and Development Commands
Use `pnpm dev` to start the local development server. Run `pnpm build` to create a production build and catch integration issues before review. Use `pnpm start` to serve the built app locally. Run `pnpm lint` before every commit; it applies the Next.js and TypeScript lint rules defined in `.eslintrc.json`. For containerized verification, use `pnpm docker:compose`.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation and keep files focused on a single responsibility. Use PascalCase for React components, camelCase for functions and variables, and kebab-case for route segments and non-component filenames where appropriate. Prefer small service helpers over duplicating API or database logic in pages. Follow existing Tailwind utility patterns and shared primitives under `src/components/ui`.

## Testing Guidelines
There is no dedicated test script in `package.json` yet, so treat `pnpm lint` as the current minimum gate. When adding features, include manual verification notes for affected flows such as payroll creation, personnel import/export, and API routes under `src/app/api`. If you introduce automated tests later, place them near the feature or under a clear `tests/` directory and use descriptive names such as `payroll.service.test.ts`.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits in Chinese, for example `build(docker): 优化 Docker 多阶段构建与部署配置`. Keep that pattern for all commits, and use `git-commit-cn` when creating commit messages. Pull requests should describe the user-visible change, list verification steps, link related issues, and attach screenshots for UI updates.

## Configuration & Agent Notes
Keep secrets out of git and use `.env` for local configuration. Do not overwrite user-made changes unless they explicitly request it. When collaborating through Codex in this repository, address the owner as `主人`.
