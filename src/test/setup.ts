import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.stubGlobal("open", vi.fn());
  vi.stubGlobal("PointerEvent", MouseEvent);

  if (!globalThis.URL.createObjectURL) {
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:test"),
    });
  } else {
    vi.spyOn(globalThis.URL, "createObjectURL").mockReturnValue("blob:test");
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
