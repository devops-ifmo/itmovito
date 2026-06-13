import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client';
import { deleteProduct, fetchProductById, fetchProducts } from '@/api/products';
import { product } from '@/test/fixtures';
import { renderWithProviders } from '@/test/test-utils';

import ProductDetails from './ProductDetails';

vi.mock('@/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products')>();

  return {
    ...actual,
    fetchProductById: vi.fn(),
    deleteProduct: vi.fn(),
    fetchProducts: vi.fn(),
  };
});

describe('ProductDetails', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (id = product.id) =>
    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>List page</div>} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/products/:id/edit" element={<div>Edit page</div>} />
      </Routes>,
      { routerProps: { initialEntries: [`/products/${id}`] } },
    );

  it('shows loading state while product is fetched', () => {
    vi.mocked(fetchProductById).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows not found message for 404 response', async () => {
    vi.mocked(fetchProductById).mockRejectedValue(
      new ApiError(404, 'Not found'),
    );

    renderPage();

    expect(await screen.findByText('Товар не найден.')).toBeInTheDocument();
  });

  it('renders product details and navigates to edit page', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProductById).mockResolvedValue(product);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: product.name, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Создано:/)).toBeInTheDocument();
    expect(screen.getByText(/Обновлено:/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Редактировать' }));

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
  });

  it('deletes product and navigates back to list', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProductById).mockResolvedValue(product);
    vi.mocked(deleteProduct).mockResolvedValue(undefined);
    vi.mocked(fetchProducts).mockResolvedValue([]);

    renderPage();

    await screen.findByRole('heading', { name: product.name, level: 1 });

    await user.click(screen.getByRole('button', { name: 'Удалить товар' }));
    await user.click(
      screen.getByRole('button', { name: 'Удалить', hidden: false }),
    );

    await waitFor(() => {
      expect(deleteProduct).toHaveBeenCalledWith(product.id);
    });

    expect(await screen.findByText('List page')).toBeInTheDocument();
  });

  it('shows delete error when mutation fails', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProductById).mockResolvedValue(product);
    vi.mocked(deleteProduct).mockRejectedValue(new Error('delete failed'));

    renderPage();

    await screen.findByRole('heading', { name: product.name, level: 1 });

    await user.click(screen.getByRole('button', { name: 'Удалить товар' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(
      await screen.findByText('Не удалось удалить товар.'),
    ).toBeInTheDocument();
  });
});
