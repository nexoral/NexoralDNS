export interface ApiEnvelope<T = unknown> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiResult<T = unknown> {
  ok: boolean;
  statusCode: number;
  message: string;
  data: T | null;
}

/** Parses `server/`'s standard `{statusCode, message, data}` response envelope. */
export async function parseEnvelope<T>(response: Response): Promise<ApiResult<T>> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  return {
    ok: response.ok,
    statusCode: body?.statusCode ?? response.status,
    message: body?.message ?? response.statusText,
    data: body?.data ?? null,
  };
}
