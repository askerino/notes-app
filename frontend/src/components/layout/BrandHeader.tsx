import { FileCheck2 } from "lucide-react";
import type { ReactNode } from "react";

export function BrandHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b px-3 lg:h-16">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <span
          className="bg-brand text-brand-foreground grid size-7 place-items-center rounded-lg shadow-sm"
          aria-hidden
        >
          <FileCheck2 className="size-4" />
        </span>
        Notes App
      </h1>
      {children}
    </div>
  );
}
