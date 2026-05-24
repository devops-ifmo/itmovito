const API_BASE_URL = process.env.API_DOMAIN ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

const buildUrl = (path: string, query?: ApiFetchOptions['query']) => {
  const url = `${API_BASE_URL}${path}`;

  if (!query) {
    return url;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }

  const qs = params.toString();

  return qs ? `${url}?${qs}` : url;
};

const extractErrorMessage = async (response: Response) => {
  try {
    const data = (await response.clone().json()) as {
      message?: string | string[];
    };

    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }

    if (typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // body is not json — fall through
  }

  return response.statusText || `Request failed with status ${response.status}`;
};

export const apiFetch = async <T>(
  path: string,
  { body, query, headers, ...init }: ApiFetchOptions = {},
): Promise<T> => {
  const hasBody = body !== undefined;

  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json');
  }

  if (hasBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: requestHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
