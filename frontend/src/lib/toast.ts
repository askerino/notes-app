import { toast } from "sonner";

import { ApiError } from "@/api/errors";

export function showToast(message: string) {
  toast(message);
}

export function showToastError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    console.error(error);
  }
  toast.error(error instanceof ApiError ? error.message : fallback);
}
