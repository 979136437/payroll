"use client";

import { createContext, useContext } from "react";
import type { DemoAction, DemoState } from "../model/demo-state";

export const DemoContext = createContext<{
  state: DemoState;
  send: (action: DemoAction) => string | null;
} | null>(null);

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("演示状态必须在提供器内部使用");
  return context;
}
