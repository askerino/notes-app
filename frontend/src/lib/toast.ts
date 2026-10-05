import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { logError } from "@/lib/logger";

export function showToast(message: string) {
  toast(message);
}

export function showToastError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    logError(error);
  }
  toast.error(error instanceof ApiError ? error.message : fallback);
}
