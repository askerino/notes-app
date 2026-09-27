import createClient, { type Middleware } from "openapi-fetch";

import { ApiError, toApiError } from "@/api/errors";
import type { paths } from "@/api/generated/schema";

export const apiClient = createClient<paths>({
  baseUrl: window.location.origin,
  fetch: (...args) => globalThis.fetch(...args),
});

const throwOnErrorResponse: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      throw await toApiError(response);
    }
  },
};

apiClient.use(throwOnErrorResponse);

export async function requireData<T>(
  result: Promise<{ data?: T | undefined; response: Response }>,
): Promise<T> {
  const { data, response } = await result;
  if (data === undefined) {
    throw new ApiError("APIから不正なレスポンスを受信しました。", response.status);
  }
  return data;
}
