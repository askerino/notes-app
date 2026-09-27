import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLocalStorageState } from "./useLocalStorageState";

describe("useLocalStorageState", () => {
  it("returns the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorageState("key", 1));

    expect(result.current[0]).toBe(1);
  });

  it("returns the stored value when it exists", () => {
    localStorage.setItem("key", JSON.stringify(42));

    const { result } = renderHook(() => useLocalStorageState("key", 1));

    expect(result.current[0]).toBe(42);
  });

  it("updates the state and saves to localStorage", () => {
    const { result } = renderHook(() => useLocalStorageState("key", 1));

    act(() => result.current[1](2));

    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem("key")).toBe("2");
  });

  it("falls back to the initial value when stored JSON is invalid", () => {
    localStorage.setItem("key", "invalid-json");

    const { result } = renderHook(() => useLocalStorageState("key", 1));

    expect(result.current[0]).toBe(1);
  });

  it("returns the initial value when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    const { result } = renderHook(() => useLocalStorageState("key", 1));

    expect(result.current[0]).toBe(1);
  });
});
