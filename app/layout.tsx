import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";
import { AppNavigation } from "@/components/app-navigation";



export const metadata: Metadata = {
  title: "工资工作台",
  description: "工资表与人员管理演示工作台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
    >
      <body>
        <Providers>
          <AppNavigation />
          <main className="container mx-auto px-4 py-6">
            <p className="mb-4 text-xs text-muted-foreground">演示模式 · 全部数据均为虚构，刷新页面将恢复初始数据</p>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
