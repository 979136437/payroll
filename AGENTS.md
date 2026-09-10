# 项目开发规则

## 组件复用

- 开发界面前，必须先检查项目已有组件，优先复用 `components/ui`、公共组件及对应业务功能内的组件。
- 现有组件不能完全满足需求时，优先组合或扩展；确认无法合理复用后再新增，避免重复实现。
- 不得仅为已有能力引入另一套 UI 组件库。

## 样式规范

- 样式统一优先使用 **Tailwind CSS**，复用项目现有主题变量、设计令牌及类名合并工具。
- 避免重复硬编码颜色、间距等设计值，保持界面风格一致。
- 仅在 Tailwind CSS 难以合理表达或第三方集成需要时补充自定义 CSS；动态计算值可使用内联样式。

## 目录组织

- 业务代码采用 **Feature First（按业务功能组织）**，放置于 `features/<业务功能>/`，相关组件、Hooks、服务、类型和测试就近维护，按需创建子目录。
- `app` 保留 Next.js 路由约定，负责路由入口与页面组装，具体业务实现放入对应功能目录。
- `components/ui` 保留通用基础组件；跨功能复用且不依赖具体业务的代码放入公共目录。
- 新增业务遵循上述结构；修改既有功能时按当前任务范围逐步归拢，不进行无关的大规模迁移。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
