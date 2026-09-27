import { vi } from "vitest";

import { DESKTOP_QUERY } from "@/lib/mediaQueries";

type Listener = () => void;

export function mockMatchMedia({ isDesktop: initialIsDesktop }: { isDesktop: boolean }) {
  let isDesktop = initialIsDesktop;
  const listeners = new Set<Listener>();

  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        get matches() {
          return query === DESKTOP_QUERY ? isDesktop : false;
        },
        media: query,
        addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );

  return (nextIsDesktop: boolean) => {
    isDesktop = nextIsDesktop;
    listeners.forEach((listener) => listener());
  };
}
