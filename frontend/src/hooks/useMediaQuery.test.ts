import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DESKTOP_QUERY } from "@/lib/mediaQueries";
import { mockMatchMedia } from "@/test/mocks/matchMedia";

import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  it("returns the current match state", () => {
    mockMatchMedia({ isDesktop: true });

    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));

    expect(result.current).toBe(true);
  });

  it("updates when the match state changes", () => {
    const setIsDesktop = mockMatchMedia({ isDesktop: true });
    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));

    act(() => setIsDesktop(false));

    expect(result.current).toBe(false);
  });
});
