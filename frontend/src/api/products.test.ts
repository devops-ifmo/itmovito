import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  product,
  productItem,
  productItemServer,
  productServer,
} from '@/test/fixtures';

import { apiFetch } from './client';
import {
  createProduct,
  deleteProduct,
  fetchProductById,
  fetchProducts,
  productKeys,
  updateProduct,
} from './products';

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

describe('productKeys', () => {
  it('builds stable react-query keys', () => {
    expect(productKeys.all).toEqual(['products']);
    expect(productKeys.lists()).toEqual(['products', 'list']);
    expect(productKeys.list()).toEqual(['products', 'list']);
    expect(productKeys.details()).toEqual(['products', 'detail']);
    expect(productKeys.detail(42)).toEqual(['products', 'detail', 42]);
  });
});

describe('products api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchProducts parses list response', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ items: [productItemServer] });

    const items = await fetchProducts();

    expect(apiFetch).toHaveBeenCalledWith('/item');
    expect(items).toEqual([productItem]);
  });

  it('fetchProductById parses product response', async () => {
    vi.mocked(apiFetch).mockResolvedValue(productServer);

    const result = await fetchProductById(product.id);

    expect(apiFetch).toHaveBeenCalledWith(`/item/${product.id}`);
    expect(result).toEqual(product);
  });

  it('createProduct validates payload and parses response', async () => {
    vi.mocked(apiFetch).mockResolvedValue(productServer);

    const payload = {
      category: 'electronics' as const,
      name: product.name,
      description: product.description,
      price: product.price,
    };

    const result = await createProduct(payload);

    expect(apiFetch).toHaveBeenCalledWith('/item', {
      method: 'POST',
      body: payload,
    });
    expect(result).toEqual(product);
  });

  it('updateProduct validates payload and parses response', async () => {
    vi.mocked(apiFetch).mockResolvedValue(productServer);

    const payload = {
      category: 'electronics' as const,
      name: 'Updated name',
      description: product.description,
      price: 120000,
    };

    const result = await updateProduct(product.id, payload);

    expect(apiFetch).toHaveBeenCalledWith(`/item/${product.id}`, {
      method: 'PATCH',
      body: payload,
    });
    expect(result).toEqual(product);
  });

  it('deleteProduct calls delete endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    await deleteProduct(product.id);

    expect(apiFetch).toHaveBeenCalledWith(`/item/${product.id}`, {
      method: 'DELETE',
    });
  });
});
