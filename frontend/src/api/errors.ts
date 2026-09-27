import type { components } from "@/api/generated/schema";

type ProblemDetails = components["schemas"]["HttpValidationProblemDetails"];

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const problem = await response.json().then(
    (body: ProblemDetails) => body,
    () => undefined,
  );
  const errors = Object.values(problem?.errors ?? {}).flat();
  const error = errors.length > 0 ? errors.join("\n") : undefined;
  const fallback =
    response.status === 404 ? "指定のリソースが見つかりませんでした。" : "通信に失敗しました。";

  return new ApiError(error ?? problem?.detail ?? problem?.title ?? fallback, response.status);
}
