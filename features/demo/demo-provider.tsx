"use client";

import { useReducer, useRef, type ReactNode } from "react";
import { createInitialData } from "./initial-data";
import { demoReducer, type DemoAction, type DemoState } from "./model/demo-state";
import { DemoContext } from "./hooks/use-demo";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, publish] = useReducer((_: DemoState, next: DemoState) => next, undefined, createInitialData);
  const latest = useRef(state);

  function send(action: DemoAction): string | null {
    try {
      // 在事件内执行纯 reducer，错误返回表单；连续操作使用最新状态，避免批处理丢失更新。
      const next = demoReducer(latest.current, action);
      latest.current = next;
      publish(next);
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : "操作失败，请检查输入";
    }
  }

  return <DemoContext.Provider value={{ state, send }}>{children}</DemoContext.Provider>;
}
