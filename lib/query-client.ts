import { environmentManager, QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 给服务端预取的数据保留短暂新鲜期，避免客户端接管后立即重复请求。
        staleTime: 60 * 1000,
      },
      mutations: {
        // 工资写入不自动重试；需要重试时由业务确认幂等性后显式开启。
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  // 服务端不能共享缓存，否则不同请求可能读取到彼此的工资数据。
  if (environmentManager.isServer()) return createQueryClient();

  // 浏览器复用实例，防止首次渲染挂起或路由切换时丢失缓存。
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
