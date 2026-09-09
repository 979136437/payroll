# 工资系统：Drizzle + SQLite

项目面向单人使用，数据库采用 SQLite，包含人员、工资表和工资记录三张业务表。开发运行本机 Next.js，生产使用 Docker 运行 Next.js，应用和一次性迁移工具共享命名 volume。

## 开发环境

需要 Node.js 22 或更新版本、pnpm 10.33.0。无需 Docker、MySQL 服务或数据库密码。

```powershell
Set-Location F:\test\payroll
pnpm install --frozen-lockfile
pnpm db:check:dev
pnpm db:migrate:dev
pnpm db:status:dev
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

生产需要 Docker Engine、Compose。镜像内使用 Node.js 22。当前 SQLite 驱动内置 Windows/Linux/macOS 的 x64/arm64 预编译文件，因此关闭 pnpm 的隐式原生编译，无需额外安装 C++ 构建工具。

生产配置文件 `.env.production` 只包含非敏感配置：

```dotenv
DB_FILE=/data/payroll.sqlite
APP_PORT=3000
```

Compose 固定将数据库放在 `/data/payroll.sqlite`，将 `/data` 挂载到 `sqlite_data` 命名 volume；默认完整卷名是 `payroll-production_sqlite_data`。迁移容器和应用容器均以 UID 1000 运行，镜像预先配置 `/data` 的写入权限。默认 volume 使用本机存储，不应换成网络文件系统。

当前仓库使用 `compose.yaml`，没有自动发布脚本。应用默认访问 http://localhost:3000，可在 `.env.production` 修改 `APP_PORT`；另行维护的配置可通过 Compose 的 `--env-file` 指定。

升级前须准备包含最新迁移文件的迁移镜像。镜像构建属于独立发布步骤，需明确授权，不作为数据库检查的默认动作。升级顺序是停止旧应用及其他写入进程、备份、执行迁移、检查状态，全部成功后再启动应用。任一步失败均停止后续操作；不要并发发布或绕过迁移直接更新应用。

```powershell
$dc = @('compose', '--env-file', '.env.production', '-f', 'compose.yaml')
docker @dc ps
docker @dc logs --tail 100 app
docker @dc run -T migrate pnpm db:check:prod
docker @dc run -T migrate pnpm db:status:prod
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

业务表在 `db/schema.ts` 中定义。人员姓名和工资表名称保持唯一且不可为空白；工资金额以整数分存储，范围为 0 至 9007199254740991。应用接收金额时仍须校验安全整数，不能依赖浮点乘法自动舍入。姓名不做自动裁剪，身份证及银行卡等字段不写入命令错误日志。

三张表的修改时间由数据库触发器维护：仅业务字段实际变化时更新，应用、Studio 和直接 SQL 均适用；创建时间保持不变，修改时间为整数毫秒，同毫秒内至少递增 1。直接修改时间字段本身不会再次触发更新。Drizzle 的更新 `returning()` 结果可能早于 AFTER 触发器执行，需要最终时间时应重新查询。

迁移历史包含初始建表 `0000` 和约束升级 `0001`。已应用的 SQL 不得改写；SQL 与日志、快照必须一同提交，SQL 换行由 `.gitattributes` 固定为 LF，避免跨平台哈希变化。后续执行 `pnpm db:generate` 后必须审查生成 SQL，特别检查重建表是否保留触发器、外键及自增序列；触发器不由 Drizzle 快照自动管理。已有 MySQL SQL 不能直接作为 SQLite 迁移使用。

`0001` 在同一个事务内检查旧金额、空白名称和关联，再复制并替换表。保留已有编号、记录、时间、索引及历史自增序列；非法旧数据会中止升级并回滚，不清洗、舍入或丢弃记录。需要人工核对并修正数据后重试。不要在迁移事务内关闭外键检查。

| 命令 | 行为 |
| --- | --- |
| `db:generate` | 根据声明生成开发迁移，生成后必须人工审查 |
| `db:migrate:dev` / `db:migrate:prod` | 校验迁移文件和已应用历史，再执行待应用迁移；缺失或损坏时非零退出 |
| `db:check:dev` / `db:check:prod` | 仅检查连接，可能创建目录和空库，不能证明业务就绪 |
| `db:status:dev` / `db:status:prod` | 只读检查已有库的迁移历史、SQL 哈希和三张必要业务表，不创建空库；缺库、待迁移、历史不一致或缺表时非零退出 |
| `db:studio` | 仅开发环境可用 |

状态检查不是完整的结构差异检测或数据审计，不证明所有列、触发器及业务数据正确。该检查也不同于官方 `drizzle-kit check` 的本地迁移历史一致性检查。

实际升级需先备份并停止并发写入，再按目标环境执行以下两个命令；两个步骤之间检查退出码，仅在均成功后启动应用。生产通过已有迁移镜像运行 `pnpm db:migrate:prod` 和 `pnpm db:status:prod`，开发环境示例如下：

```powershell
pnpm db:migrate:dev
if ($LASTEXITCODE -ne 0) { throw '迁移失败，保持应用停止并核对错误' }
pnpm db:status:dev
if ($LASTEXITCODE -ne 0) { throw '状态检查失败，保持应用停止并核对错误' }
```

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
```

自动化测试包括开发与生产路径隔离、真实 SQLite 文件持久化、1000 条批量写入、事务失败回滚、外键约束、连接复用和 SQLite 迁移幂等性，以及真实业务迁移升级、金额和名称边界、更新触发器、迁移历史与命令退出码。核心配置、连接、环境加载和迁移校验模块设置 80% 覆盖率门槛。测试数据库使用内存或系统临时目录，按项目约束不自动删除。

数据库测试仅验证隔离数据库，不代表实际开发库或生产库已升级，也不能替代应用构建或容器部署验证。已移除引用不存在发布脚本的失效测试，以及被真实业务迁移测试覆盖的探针迁移测试；当前没有自动发布流程测试。

参考：[Drizzle SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)、[SQLite 类型规则](https://www.sqlite.org/datatype3.html)、[SQLite 外键](https://www.sqlite.org/foreignkeys.html)、[Drizzle 迁移检查](https://orm.drizzle.team/docs/drizzle-kit-check)、[SQLite WAL](https://www.sqlite.org/wal.html)、[SQLite 备份](https://www.sqlite.org/backup.html)。
