import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatePanelProps = {
  className?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  message?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
};

export function StatePanel({
  className,
  icon: Icon,
  isLoading,
  message,
  action,
  role = "status",
}: StatePanelProps) {
  return (
    <div
      className={cn("text-muted-foreground grid place-items-center text-center", className)}
      role={role}
    >
      <div className="space-y-3">
        {Icon && (
          <Icon
            className={cn("mx-auto size-8 stroke-1", isLoading && "animate-spin")}
            aria-hidden
          />
        )}
        {message ? (
          <p className="text-sm">{message}</p>
        ) : (
          isLoading && <span className="sr-only">読み込み中</span>
        )}
        {action}
      </div>
    </div>
  );
}
