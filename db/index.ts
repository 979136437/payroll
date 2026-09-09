import "server-only";
import { getDbClient } from "./client";

// 仅在服务端实际查询时创建连接，构建与模块导入不依赖数据库。
export function getDb() {
  return getDbClient().db;
}
