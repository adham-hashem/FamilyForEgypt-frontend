import type { AuthResponse } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const SESSION_HINT = 'ffe_session';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

// The access token only ever lives in memory. The refresh token is an HttpOnly cookie that
// scripts cannot read, so a script injected into the page has nothing durable to steal.
let accessToken: string | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;
let onSessionChange: ((auth: AuthResponse | null) => void) | null = null;

export function setSessionListener(listener: (auth: AuthResponse | null) => void) {
  onSessionChange = listener;
}

export function setSession(auth: AuthResponse | null) {
  accessToken = auth?.accessToken ?? null;
  try {
    if (auth) localStorage.setItem(SESSION_HINT, '1');
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    /* storage may be unavailable in private mode; the session still works for this tab */
  }
}

/** True when this browser has signed in before, so it is worth asking the server to resume. */
export function hasSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT) === '1';
  } catch {
    return false;
  }
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return '';
  return path.startsWith('http') ? path : BASE + path;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  let code: string | undefined;
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') message = body.detail;
    if (typeof body?.code === 'string') code = body.code;
  } catch {
    if (response.status === 413) message = 'حجم الملفات أكبر من المسموح.';
    if (response.status === 429) message = 'عدد الطلبات كبير. انتظر قليلاً ثم حاول مرة أخرى.';
  }
  return new ApiError(message, response.status, code);
}

/** Resumes the session from the cookie. Concurrent callers share a single request. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      const response = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Client': 'web' },
        body: '{}',
      });
      if (!response.ok) {
        // Only a definite "no" ends the session; a network blip or a 5xx must not sign the user out.
        if (response.status === 401) {
          setSession(null);
          onSessionChange?.(null);
        }
        return null;
      }
      const auth = (await response.json()) as AuthResponse;
      setSession(auth);
      onSessionChange?.(auth);
      return auth;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  raw?: boolean;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { 'X-Client': 'web' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let body: BodyInit | undefined;
  if (options.form) body = options.form;
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  try {
    return await fetch(BASE + path, {
      method: options.method ?? 'GET',
      headers,
      body,
      credentials: 'include',
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError('تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.', 0, 'network');
  }
}

export async function api<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  // An expired access token is renewed once, transparently, and the request is repeated.
  if (response.status === 401 && !path.startsWith('/api/auth/') && hasSessionHint()) {
    const renewed = await refreshSession();
    if (renewed) response = await send(path, options);
  }

  if (!response.ok) throw await parseError(response);
  if (options.raw) return response as unknown as T;
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Loads a protected image (national ID scans) and exposes it as a temporary object URL. */
export async function fetchBlobUrl(path: string, signal?: AbortSignal): Promise<string> {
  const response = await api<Response>(path, { raw: true, signal });
  return URL.createObjectURL(await response.blob());
}

export function toQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
