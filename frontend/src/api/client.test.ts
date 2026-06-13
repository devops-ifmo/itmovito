import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from './client';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

const createJsonResponse = (
  body: unknown,
  {
    ok = true,
    status = 200,
    statusText = 'OK',
  }: { ok?: boolean; status?: number; statusText?: string } = {},
) => {
  const response = {
    ok,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
    clone: vi.fn(),
  };

  response.clone.mockReturnValue(response);

  return response as Response;
};

describe('ApiError', () => {
  it('stores status and message', () => {
    const error = new ApiError(404, 'Not found');

    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
  });
});

describe('apiFetch', () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it('returns parsed json on success', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ id: 1 }));

    await expect(apiFetch('/item')).resolves.toEqual({ id: 1 });

    const [url, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('/api/item');
    const headers = new Headers(requestInit.headers);

    expect(headers.get('Accept')).toBe('application/json');
  });

  it('serializes body and sets content type for POST requests', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ id: 2 }));

    await apiFetch('/item', {
      method: 'POST',
      body: { name: 'Phone' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/item',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Phone' }),
      }) as RequestInit,
    );

    const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(requestInit.headers);

    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('appends query parameters to the url', async () => {
    mockFetch.mockResolvedValue(createJsonResponse([]));

    await apiFetch('/item', {
      query: {
        page: 2,
        active: true,
        skipped: undefined,
        empty: null,
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/item?page=2&active=true',
      expect.any(Object),
    );
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch.mockResolvedValue(createJsonResponse(undefined, { status: 204 }));

    await expect(
      apiFetch('/item/1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('throws ApiError with joined message array from response body', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse(
        { message: ['Invalid name', 'Invalid price'] },
        { ok: false, status: 400, statusText: 'Bad Request' },
      ),
    );

    await expect(apiFetch('/item')).rejects.toMatchObject({
      status: 400,
      message: 'Invalid name, Invalid price',
    });
  });

  it('throws ApiError with string message from response body', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse(
        { message: 'Validation failed' },
        { ok: false, status: 422, statusText: 'Unprocessable Entity' },
      ),
    );

    await expect(apiFetch('/item')).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/item')).rejects.toThrow('Validation failed');
  });

  it('falls back to status text when error body is not json', async () => {
    const failingJson = () => Promise.reject(new Error('not json'));

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: failingJson,
      clone: () => ({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: failingJson,
      }),
    });

    await expect(apiFetch('/item')).rejects.toThrow('Server Error');
  });
});
