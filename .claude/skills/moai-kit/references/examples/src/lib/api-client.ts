// [클라이언트] /api/v1 호출 표준. Client Component 는 fetch 를 직접 쓰지 않고 이것만 쓴다.
//   const req = await apiClient.post<RequestDto>("/api/v1/requests", input)
// 실패 시 ApiError 를 throw → useMutation 이 fieldErrors/메시지로 변환
import {
  ClientErrors, ERROR_STATUS, isErrorCategory,
  type ApiErrorPayload, type ErrorCategory, type FieldErrors, type ValidationIssue,
} from "./error-codes";

type ClientFailure = Omit<ApiErrorPayload, "traceId"> & { traceId?: string };

export class ApiError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly fieldErrors?: FieldErrors;
  readonly issues?: ValidationIssue[];
  readonly traceId?: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(error: ClientFailure, public readonly status: number) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.category = error.category;
    this.fieldErrors = error.fieldErrors;
    this.issues = error.issues;
    this.traceId = error.traceId;
    this.retryable = error.retryable;
    this.retryAfterSeconds = error.retryAfterSeconds;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 신규 code도 그대로 보존한다. 이전 응답은 일반 code 또는 HTTP 상태로 category를 보완한다. */
function readFailure(json: unknown, status: number, traceHeader: string | null): ApiError {
  const raw = isRecord(json) && isRecord(json.error) ? json.error : {};
  const category: ErrorCategory = isErrorCategory(raw.category) ? raw.category
    : isErrorCategory(raw.code) ? raw.code
    : (Object.keys(ERROR_STATUS) as ErrorCategory[]).find((key) => ERROR_STATUS[key] === status) ?? "INTERNAL";
  const fieldErrors: FieldErrors | undefined = isRecord(raw.fieldErrors)
    ? Object.fromEntries(Object.entries(raw.fieldErrors).filter((entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].every((message) => typeof message === "string")))
    : undefined;
  const issues: ValidationIssue[] = [];
  if (Array.isArray(raw.issues)) {
    for (const issue of raw.issues) {
      if (isRecord(issue) && Array.isArray(issue.path) &&
        issue.path.every((part): part is string | number => typeof part === "string" || typeof part === "number") &&
        typeof issue.code === "string" && typeof issue.message === "string") {
        issues.push({ path: issue.path, code: issue.code, message: issue.message });
      }
    }
  }
  return new ApiError({
    code: typeof raw.code === "string" ? raw.code : ClientErrors.CLIENT_INVALID_RESPONSE.code,
    category,
    message: typeof raw.message === "string" ? raw.message : "요청을 처리하지 못했습니다.",
    fieldErrors,
    issues: issues.length ? issues : undefined,
    traceId: typeof raw.traceId === "string" ? raw.traceId : traceHeader ?? undefined,
    retryable: raw.retryable === true,
    retryAfterSeconds: typeof raw.retryAfterSeconds === "number" && Number.isSafeInteger(raw.retryAfterSeconds) && raw.retryAfterSeconds >= 0
      ? raw.retryAfterSeconds : undefined,
  }, status);
}

async function request<T>(method: string, url: string, data?: unknown): Promise<T> {
  // 브라우저용 API client는 같은 앱의 /api/v1 상대 경로만 사용한다.
  if (!url.startsWith("/api/v1/")) {
    throw new ApiError(ClientErrors.CLIENT_INVALID_API_URL, 0);
  }
  let target: URL;
  try {
    target = new URL(url, "http://api-client.local");
  } catch {
    throw new ApiError(ClientErrors.CLIENT_INVALID_API_URL, 0);
  }
  if (target.origin !== "http://api-client.local" || !target.pathname.startsWith("/api/v1/")) {
    throw new ApiError(ClientErrors.CLIENT_INVALID_API_URL, 0);
  }
  // FormData(파일 업로드)는 그대로 보낸다. Content-Type(boundary)은 브라우저가 붙인다.
  const form = data instanceof FormData ? data : undefined;
  let requestBody: string | undefined;
  if (data !== undefined && !form) {
    try {
      requestBody = JSON.stringify(data);
      if (requestBody === undefined) throw new TypeError("JSON으로 변환할 수 없는 요청 데이터");
    } catch {
      throw new ApiError(ClientErrors.CLIENT_SERIALIZATION_ERROR, 0);
    }
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: requestBody !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: form ?? requestBody,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(ClientErrors.CLIENT_NETWORK_ERROR, 0);
  }
  if (res.status === 204) return undefined as T;
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || (isRecord(json) && "error" in json)) {
    throw readFailure(json, res.status, res.headers.get("X-Trace-Id"));
  }
  if (!isRecord(json) || !Object.hasOwn(json, "data")) {
    throw new ApiError({ ...ClientErrors.CLIENT_INVALID_RESPONSE, traceId: res.headers.get("X-Trace-Id") ?? undefined }, res.status);
  }
  return json.data as T;
}

export const apiClient = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, data?: unknown) => request<T>("POST", url, data ?? {}),
  patch: <T>(url: string, data: unknown) => request<T>("PATCH", url, data),
  put: <T>(url: string, data: unknown) => request<T>("PUT", url, data),
  del: (url: string) => request<void>("DELETE", url),
  /** multipart 업로드. 서버는 handler.ts upload() 로 받는다. */
  upload: <T>(url: string, form: FormData) => request<T>("POST", url, form),
};
