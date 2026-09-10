"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const entries = [
  { href: "/", label: "工资工作台", Icon: Calculator },
  { href: "/personnel", label: "人员管理", Icon: Users },
];

export function AppNavigation() {
  const pathname = usePathname();
  return (
    <header className="border-b">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 sm:gap-8 sm:py-0">
        <span className="text-xl font-bold">工资工作台</span>
        <nav aria-label="主导航" className="flex gap-1">
          {entries.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
              className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
