# 工资系统：Drizzle + SQLite

项目面向单人使用，数据库采用 SQLite，暂未定义业务表。开发运行本机 Next.js，生产使用 Docker 运行 Next.js，应用和一次性迁移工具共享命名 volume。

## 开发环境

需要 Node.js 22 或更新版本、pnpm 10.33.0。无需 Docker、MySQL 服务或数据库密码。

```powershell
Set-Location F:\test\payroll
pnpm install --frozen-lockfile
pnpm db:check:dev
pnpm db:migrate:dev
pnpm dev
```

打开 http://localhost:3000。数据库路径固定为 `os.tmpdir()/payroll/payroll.sqlite`；Windows 通常位于 `%TEMP%\payroll\payroll.sqlite`。执行下面的命令可以查看当前机器的实际路径：

```powershell
node -e "console.log(require('node:path').join(require('node:os').tmpdir(),'payroll','payroll.sqlite'))"
```

开发进程重启后复用同一个文件，不会每次新建空库；系统清理临时目录会清空开发数据，因此这里不要保存唯一一份正式数据。开发路径不接受 `DB_FILE` 覆盖，防止意外连接生产数据库。

```powershell
pnpm db:generate
pnpm db:migrate:dev
pnpm db:studio
```

开发无需环境配置文件或 Compose，数据库路径由程序自动确定。旧 MySQL 容器和卷未做清理。

## 生产环境

生产需要 Docker Engine、Compose；使用发布脚本时需要 PowerShell 7。镜像内使用 Node.js 22。当前 SQLite 驱动内置 Windows/Linux/macOS 的 x64/arm64 预编译文件，因此关闭 pnpm 的隐式原生编译，无需额外安装 C++ 构建工具。

生产配置文件 `.env.production` 只包含非敏感配置：

```dotenv
DB_FILE=/data/payroll.sqlite
APP_PORT=3000
```

Compose 固定将数据库放在 `/data/payroll.sqlite`，将 `/data` 挂载到 `sqlite_data` 命名 volume；默认完整卷名是 `payroll-production_sqlite_data`。迁移容器和应用容器均以 UID 1000 运行，镜像预先配置 `/data` 的写入权限。默认 volume 使用本机存储，不应换成网络文件系统。

```powershell
./scripts/deploy-production.ps1
```

若另行维护本地配置，可以通过 `-EnvFile .env.production.local` 指定。应用默认访问 http://localhost:3000，可在 `.env.production` 修改 `APP_PORT`。

发布顺序是构建镜像、停止旧应用、执行迁移、启动并等待应用健康。SQLite 文件由新旧版本共享，停止旧应用可避免迁移期间继续写入；因此发布存在短暂停机。构建失败保留旧应用；停止或迁移失败时不会启动新应用，需修复后重新发布。不要并发发布或绕过迁移直接更新应用。

```powershell
$dc = @('compose', '--env-file', '.env.production', '-f', 'compose.production.yaml')
docker @dc ps
docker @dc logs --tail 100 app
docker @dc run -T migrate pnpm db:check:prod
```

`/api/health` 执行最小 SQLite 查询，成功返回 200，失败返回 503；不返回数据库路径或业务数据。它也用于确认容器内原生驱动及 volume 可访问。构建阶段不会打开或创建生产数据库。

停止服务并保留数据：

```powershell
docker @dc stop app
```

更新应用镜像或重启容器不会清空命名 volume。不要修改 Compose 项目名或卷名来更新应用，否则会连接另一套存储。无需 MySQL 服务、端口和账号；本次未迁移任何旧 MySQL 业务数据。

## 连接、迁移与批量操作

服务端使用 `import { getDb } from "@/db"` 获取 Drizzle 实例，入口由 `server-only` 保护；只支持 Node.js Runtime。连接按需创建，开发热更新复用连接。开发自动使用临时目录，生产与测试必须明确配置绝对路径 `DB_FILE`，不能回退到开发路径。

连接启用 WAL、外键校验、5000 毫秒锁等待与 FULL 同步。SQLite 允许读写并行，但同一时刻只有一个写事务。批量处理应先完成输入校验，再在同步事务中写入；不要在事务回调中使用异步请求或 `await`。超大导入应限制批次规模，避免长时间阻塞单个 Node.js 进程。

业务表后续在 `db/schema.ts` 中使用 `drizzle-orm/sqlite-core` 定义。执行 `pnpm db:generate` 生成 SQLite SQL，审查后将 SQL 与元数据一同提交，再分别执行开发或生产迁移。当前迁移历史为空，已切换为空的 SQLite 元数据，没有虚构业务表。已有 MySQL SQL 不能直接作为 SQLite 迁移使用。

## 备份

数据库目录包含主文件和可能存在的 `-wal`、`-shm` 文件。在线备份应使用 SQLite 备份 API，不能只复制正在使用的主文件。

也可以使用最简单的停机备份：停止应用，确认一次性迁移任务已退出，没有其他进程访问卷，再复制整个目录到独立位置。生产数据尚未产生时，先运行一次连接检查使数据库文件初始化。

```powershell
docker @dc stop app
$backupPath = "./payroll-sqlite-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
docker @dc cp app:/data $backupPath
docker @dc start app
```

确认复制成功后，将备份目录另存至受控的外部存储，并定期在隔离实例演练恢复；单独保留同一个 volume 不是备份。项目不自动删除旧备份或卷。生产公网入口的 HTTPS、自动备份调度及业务级恢复流程仍需按实际部署配置。

## 验证

```powershell
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm build
docker compose --env-file .env.production -f compose.production.yaml config --quiet
```

自动化测试包括开发与生产路径隔离、真实 SQLite 文件持久化、1000 条批量写入、事务失败回滚、外键约束、连接复用和 SQLite 迁移幂等性。核心配置、连接及环境加载模块设置 80% 覆盖率门槛。测试数据库仅写入系统临时目录，按项目约束不自动删除。

本次验证：36 项测试通过，核心模块覆盖率为 100%；TypeScript、ESLint、本机和 Docker 生产构建通过。隔离容器验证了健康接口、volume 写入权限、重启及新容器复用测试记录。测试容器完成后停止，测试 volume 和已有 MySQL 资源保留，没有执行资源删除。尚无业务表，本次未做业务数据迁移。

参考：[Drizzle SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)、[SQLite WAL](https://www.sqlite.org/wal.html)、[SQLite 备份](https://www.sqlite.org/backup.html)。
