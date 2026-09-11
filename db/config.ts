export function readDbConfig(env: Record<string, string | undefined> = process.env) {
  if (!["development", "production", "test"].includes(env.NODE_ENV ?? "")) {
    throw new Error("必须明确指定数据库运行环境");
  }
  function required(key: string) {
    const value = env[key];
    if (!value?.trim() || value.includes("\0")) throw new Error(`数据库配置 ${key} 必须非空且不包含空字符`);
    return value;
  }
  const host = required("DB_HOST");
  const portValue = required("DB_PORT");
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) throw new Error("数据库配置 DB_HOST 必须是主机名或 IPv4 地址");
  const port = Number(portValue);
  if (!/^\d+$/.test(portValue) || port < 1 || port > 65535) throw new Error("数据库配置 DB_PORT 必须是有效端口");
  const database = required("DB_NAME");
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(database)) throw new Error("数据库配置 DB_NAME 仅允许字母、数字和下划线，最多64位");
  // 测试必须显式连接隔离库，禁止误写开发或生产业务库。
  if (env.NODE_ENV === "test" && !database.startsWith("payroll_test_")) throw new Error("测试数据库必须使用 payroll_test_ 前缀");
  return {
    host,
    port,
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database,
    connectionLimit: 5,
    connectTimeout: 5000,
    timezone: "Z",
    charset: "utf8mb4",
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: false,
    ssl: {
      rejectUnauthorized: true,
    }
  };
}
