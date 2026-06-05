# Payroll Desktop

基于 `Tauri 2 + React 19 + TypeScript + Vite` 的本地工资管理桌面应用，面向工资表维护和人员资料管理场景。

## 功能概览

- 工资工作台
  - 创建工资表
  - 查看工资表列表和详情
  - 向工资表添加人员
  - 批量移除工资表中的人员
  - 编辑人员实发工资
  - 导出单张工资表为 Excel
- 人员管理
  - 新增、编辑、删除人员
  - 批量删除人员
  - 按姓名、电话、身份证号、工资卡号搜索
  - 导入人员 Excel
  - 导出人员 Excel
- 本地数据存储
  - 应用启动时自动初始化本地 SQLite 数据库
  - 数据保存在 Tauri 应用数据目录中

## 技术栈

- 前端：React 19、TypeScript、Vite、Zustand、Tailwind CSS 4
- 桌面端：Tauri 2
- 后端：Rust、rusqlite
- 表格处理：calamine、rust_xlsxwriter

## 环境要求

开始前请确保本机具备以下环境：

- Node.js 18+
- pnpm
- Rust stable
- Tauri 2 所需系统依赖

Windows 下通常还需要：

- Microsoft Visual Studio C++ Build Tools
- WebView2 Runtime

## 安装依赖

```bash
pnpm install
```

## 开发方式

### 1. 启动前端开发服务器

```bash
pnpm dev
```

默认会启动 Vite 开发服务器。

### 2. 启动桌面应用开发模式

```bash
pnpm dev:tauri
```

该命令会同时启动前端并拉起 Tauri 桌面窗口，适合日常联调。

## 构建

### 构建前端产物

```bash
pnpm build
```

### 构建桌面安装包

```bash
pnpm build:tauri
```

构建完成后可在 Tauri 输出目录中获取安装包或可执行产物。

## 测试与检查

### 运行全部测试

```bash
pnpm test
```

### 运行前端状态测试

```bash
pnpm test:workspace-store
```

### 运行 Rust 测试

```bash
pnpm test:rust
```

### 运行 ESLint

```bash
pnpm lint
```

## 使用方式

### 进入应用

应用顶部提供两个主视图：

- `工资`：进入工资工作台
- `人员`：进入人员管理

### 工资工作台

适合维护每一期工资数据。

1. 进入 `工资`
2. 创建工资表
3. 在工资表中添加人员
4. 为人员填写或修改实发工资
5. 按需导出当前工资表 Excel

常见操作包括：

- 新建工资表
- 查看工资表详情
- 向工资表批量加入人员
- 删除工资表中的选中人员
- 导出当前工资表

### 人员管理

适合维护基础人员档案。

1. 进入 `人员`
2. 新增或编辑人员资料
3. 按姓名、电话、身份证号、工资卡号搜索
4. 按需导入或导出人员 Excel

可维护的信息包括：

- 姓名
- 性别
- 民族
- 籍贯
- 身份证号
- 工资卡号
- 开户行
- 电话

### Excel 导入导出

- 人员页支持导入人员 Excel
- 人员页支持导出全部人员 Excel
- 工资工作台支持导出单张工资表 Excel

导入导出时会通过系统文件选择器选择源文件或保存路径。

## 项目脚本

```json
{
  "dev": "vite",
  "dev:tauri": "tauri dev",
  "build": "tsc -b && vite build",
  "build:tauri": "tauri build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "pnpm test:workspace-store && pnpm test:rust",
  "test:rust": "cargo test --manifest-path src-tauri/Cargo.toml",
  "test:workspace-store": "node scripts/run-payroll-workspace-store-test.mjs"
}
```

## 目录说明

- `src/`：React 前端源码
- `src-tauri/`：Tauri/Rust 桌面端源码
- `tests/`：前端测试
- `scripts/`：测试或辅助脚本
- `docs/`：设计和计划文档

## 说明

- 当前项目为本地桌面应用，不依赖远程业务后端即可运行核心功能
- 数据库由应用启动时自动创建，不需要手动建表
- 当前 README 基于仓库现状整理，如后续新增“更新检测”等功能，建议同步补充文档
