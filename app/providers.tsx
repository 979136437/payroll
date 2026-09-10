"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from "@/lib/query-client";
import { DemoProvider } from "@/features/demo/demo-provider";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <DemoProvider>{children}</DemoProvider>
      <Toaster theme="light" position="bottom-right" />
      {/* 保留项目已有的查询调试工具。 */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
