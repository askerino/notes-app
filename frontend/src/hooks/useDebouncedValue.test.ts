import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./useDebouncedValue";

const DELAY_MS = 300;

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value as is", () => {
    const { result } = renderHook(() => useDebouncedValue("a", DELAY_MS));

    expect(result.current).toBe("a");
  });

  it("keeps the previous value before the delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, DELAY_MS), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    advance(DELAY_MS - 1);
    expect(result.current).toBe("a");

    advance(1);
    expect(result.current).toBe("b");
  });

  it("updates to the latest value when value changes repeatedly", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, DELAY_MS), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    advance(200);
    rerender({ value: "c" });
    advance(DELAY_MS - 1);
    expect(result.current).toBe("a");

    advance(1);
    expect(result.current).toBe("c");
  });
});
