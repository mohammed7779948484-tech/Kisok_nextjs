export type DataKey = string | null;

/**
 * Shape accepted by both clients' `params` option. Serialised via
 * `toSearchParams` so keys with `undefined`/`null`/`''` values are skipped
 * (lets server-side defaults win) and array values become repeated keys.
 */
export type QueryParams = Record<string, unknown>;

export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  saveAccessToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  saveRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Optional async callback returning a `Cookie` header value to inject on
 * every outgoing request. Only the server-mode client (`@/lib/utils/http/server`)
 * uses this — the universal client relies on the browser cookie jar.
 */
export type CookieResolver = () => Promise<string | undefined>;

export interface FetchClientOptions {
  baseURL?: string;
  onUnauthorized?: () => void;
  tokenStore: TokenStore;
  cache?: RequestCache;
  defaultOptions?: RequestInit;
  /**
   * Default per-request timeout in ms. Falls back to `DEFAULT_TIMEOUT_MS`.
   * Pass `0` to disable the default timeout for this client (e.g. a client
   * dedicated to long-poll / streaming endpoints).
   */
  timeout?: number;
  /** Wire a server-side cookie resolver. Only `@/lib/utils/http/server` uses this. */
  cookieResolver?: CookieResolver;
}

export interface ExtendedRequestInit extends RequestInit {
  _retry?: boolean;
  _skipAuthInterceptor?: boolean;
  _authToken?: string;
  /**
   * Typed query params. Appended to the URL via `toSearchParams` after
   * any literal `?...` already in the path. Skips `undefined`/`null`/`''`.
   */
  params?: QueryParams;
  /**
   * Per-request timeout in ms, overriding the client default. Pass `0` to
   * disable the timeout for this call (long-poll / SSE / large upload).
   * Composed with any `signal` you pass via `AbortSignal.any`, so whichever
   * fires first wins. A timeout surfaces as `ApiException.isTimeout()`; an
   * abort via your own `signal` surfaces as `ApiException.isCancelled()`.
   */
  timeout?: number;
}

export interface InterceptorResult {
  shouldRetry: boolean;
  shouldReject: boolean;
  newToken?: string;
}

export interface RefreshState {
  isRefreshing: boolean;
  queue: Array<(token: string | null) => void>;
  attempts: number;
  lastAttempt: number;
  /**
   * Unix ms until which refreshes are hard-blocked after the loop guard trips.
   * `0` means not blocked. Keeps a server that 401s every refresh from
   * re-arming a fresh burst the instant the previous one is capped.
   */
  blockedUntil: number;
}
