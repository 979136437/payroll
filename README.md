# 工资系统：Next.js + MySQL

项目当前包含工资工作台和人员管理演示页面，以及 MySQL 数据库基础设施。页面仍使用标签页内存中的虚构数据，不调用业务 API；整页刷新恢复初始数据。导入、导出及真实业务持久化尚未实现。

## 数据库与目录

- 使用 Node.js 22、pnpm 10.33.0、Drizzle 和 mysql2，数据库以 MySQL 5.7 为目标，最低支持 5.7.9；同一套结构也可用于 MySQL 8.0.16 及以上的 8.x。
- 数据库包含人员、工资表、工资记录三表；字段定义位于 `db/schema.ts`。
- 人员字段最多 100 字符，工资表名称最多 80 字符。名称通过二进制生成列 name_key 的唯一索引区分大小写及尾随空格，不能全部为空白；不自动裁剪数据库输入。name_key 由数据库计算，调用者不能写入。
- 工资使用整数分，范围为 0～9007199254740991。MySQL 会转换某些非整数输入，因此调用方必须先用安全整数校验，再写入；插入和更新触发器负责范围限制，不依赖 5.7 中不生效的 CHECK。
- 修改时间由数据库触发器维护，仅业务字段实际改变时更新，同毫秒至少递增 1；时间以 UTC 毫秒保存，Drizzle 映射为 Date。5.7 中用默认值 0 表示插入时未提供时间，由插入触发器填充；显式提供非零时间时保留。
- `drizzle/mysql57` 为当前迁移目录；之前的 `drizzle/mysql`（8.0 基线）原样保留，不参与当前迁移。原 `drizzle` 下 SQLite 历史保留，不参与当前运行和迁移。没有导入、清理或覆盖旧 SQLite 文件和存储卷。
- 界面继续复用 `components/ui`、Tailwind CSS 和 `features` 业务目录。TanStack Query Provider 保留，尚未接入具体业务查询。

## 开发配置

已提供的非敏感地址：

| 环境 | DB_HOST | DB_PORT |
| --- | --- | --- |
| 开发 | sh-cynosdbmysql-grp-nkyicum6.sql.tencentcdb.com | 20849 |
| 生产 | 10.27.100.109 | 3306 |

开发地址保存在 `.env.development`。复制 `.env.development.example` 为 `.env.development.local`，填写 DB_NAME、DB_USER、DB_PASSWORD。生产通过运行时环境变量注入全部五项；镜像不包含任何环境文件。

不要在 `.env` 或 `.env.local` 中放置 DB_* 变量。独立命令拒绝这种配置；Next.js 自身仍按其环境文件规则加载，因此开发时也必须遵守约定。进程环境变量优先，不应带着生产变量启动开发进程。

```powershell
pnpm install --frozen-lockfile
pnpm db:check:dev
pnpm db:migrate:dev
pnpm db:status:dev
pnpm dev
```

目标数据库须事先创建。首次迁移要求独立空库，不能指向已有其他业务表的库。已应用旧 MySQL 8.0 基线的库会因迁移历史不匹配而被拒绝，不能直接切换迁移目录升级；应另行规划数据转换，本次不覆盖任何已有库。未配置数据库凭据时，演示页面仍可使用；健康接口会返回 503。

开发和生产地址的可达性、云端版本及账号权限需要在实际环境验证，不能由本机测试推断。

## 连接与数据库命令

服务端通过 `getDb()` 获取 Drizzle 实例；查询和事务均使用 await，不能继续使用 SQLite 的同步查询或 returning() 写法。数据库入口由 server-only 保护，使用 Node.js Runtime，模块导入不建立数据库连接。

每个应用进程最多 5 个连接，排队上限 10，连接超时 5 秒。扩容前核对“实例数 × 5”与数据库连接额度。健康检查总等待上限为 5 秒，失败返回 503；它仅证明连接可用，不能证明业务迁移已完成。

| 命令 | 行为 |
| --- | --- |
| db:generate | 本地生成 MySQL SQL 和快照，不连接数据库；生成后审查 SQL |
| db:migrate:dev / db:migrate:prod | 校验版本、历史，获取数据库命名锁，执行待应用迁移 |
| db:check:dev / db:check:prod | 检查已有数据库连通性，不创建库或业务表 |
| db:status:dev / db:status:prod | 只读检查历史哈希、待迁移项、必要表和触发器 |
| db:studio | 仅允许开发环境 |

已应用 SQL 不得修改，SQL、日志及快照一起提交。新增迁移必须审查 InnoDB、字符集、外键和触发器；Drizzle 快照不管理手写触发器。状态检查不是完整结构审计，不保证所有列和约束未被人工改动。

MySQL DDL 存在隐式提交，不能保证整次迁移回滚。工具在执行前持久写入迁移标记；失败或进程中断后保留标记，下一次运行拒绝继续。禁止直接清除标记并重试。应先核对已生效结构与迁移记录，在受控备份或新的空库恢复，再重新检查。工具不会自动清库、删除表或回退数据库。

## 微信云托管部署

此节是后续发布操作说明，不代表已构建镜像或已发布。

1. 创建 MySQL 5.7 数据库，使用同环境可达的内网地址；生产地址为 10.27.100.109:3306。迁移账号需要建表、索引、外键、触发器及迁移记录读写权限；应用账号只授予所需业务读写权限。
2. 获得构建授权后，从项目根目录生成两个相同版本标签的镜像：Dockerfile 的 runner 为应用目标，migrator 为迁移目标。推送到云托管可拉取的镜像仓库。
3. 在能够访问生产数据库的受控运行环境启动一次性 migrator，注入生产连接变量，执行 db:migrate:prod，再执行 db:status:prod。任一步失败，停止后续发布。生产内网地址不能假定本机可访问；迁移镜像是命令任务，不作为 HTTP 服务部署。
4. 云托管选择应用镜像，监听端口 3000，注入 NODE_ENV=production、HOSTNAME=0.0.0.0、PORT=3000 和 DB_* 配置。无需挂载 SQLite 数据目录。
5. 配置 /api/health 就绪检查并为启动留出时间。该探针依赖数据库；若平台支持独立存活检查，使用 TCP 3000，避免数据库故障引发反复重启。
6. 验证首页、/personnel、静态资源和 /api/health。本轮没有新增人员或工资业务接口，页面数据刷新恢复属于预期行为。

应用启动不执行迁移。平台联网、入口域名和 HTTPS 需在实际云端配置验证。发布前保留数据库备份及旧应用镜像；只有结构兼容时才切回旧应用版本，应用回退不会回滚数据库。

Compose 用于本地容器运行或测试，不直接上传云托管执行。运行应用/迁移服务时，通过 --env-file 指定仅保存在本地的完整连接配置；敏感配置不得提交。

## 隔离测试与轻量验证

测试不读取开发或生产数据库配置。真实数据库测试仅使用 TEST_MYSQL_HOST、TEST_MYSQL_PORT、TEST_MYSQL_USER、TEST_MYSQL_PASSWORD，或本地忽略文件 `.env.mysql-test.local` 中的 DB_HOST、DB_PORT、DB_USER、DB_PASSWORD。

测试账号须有创建隔离数据库和触发器权限。每次测试新建 payroll_test_ 加 UUID 的库，测试结束关闭连接但不删除库。请使用专用测试服务，不能提供业务生产账号。

可选本机 MySQL 测试服务使用 Compose 的 test 配置，映射 127.0.0.1:23307。先设置随机 TEST_MYSQL_PASSWORD，再启动 mysql-test；不需要构建应用。测试连接变量另行设置为该实例。不要与已经占用 23307 的测试容器同时启动。

```powershell
pnpm test:coverage
pnpm typecheck
pnpm lint
```

测试覆盖连接配置、错误脱敏、健康检查超时、真实 MySQL 约束和修改时间、1000 条写入、事务回滚、迁移幂等性、历史校验、并发锁和 DDL 部分失败。核心配置、连接、环境加载和迁移模块覆盖率门槛为 80%。Windows 测试使用单线程工作进程，覆盖率不自动清理已有文件。

没有测试连接配置时，真实 MySQL 用例明确跳过，不能据此宣称数据库验证通过。上述命令不执行应用构建；数据库测试不代表云端网络、镜像和发布验证已通过。

参考：[Drizzle MySQL](https://orm.drizzle.team/docs/mysql/get-started-mysql)、[MySQL 5.7 生成列索引](https://dev.mysql.com/doc/refman/5.7/en/create-table-generated-columns.html)、[MySQL DDL 隐式提交](https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html)、[微信云托管说明](https://cloud.tencent.com/document/product/876/113602)。