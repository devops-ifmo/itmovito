import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client';
import { fetchProductById, updateProduct } from '@/api/products';
import { product } from '@/test/fixtures';
import { renderWithProviders } from '@/test/test-utils';

import ProductEdit from './ProductEdit';

vi.mock('@/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products')>();

  return {
    ...actual,
    fetchProductById: vi.fn(),
    updateProduct: vi.fn(),
  };
});

describe('ProductEdit', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (id = product.id) =>
    renderWithProviders(
      <Routes>
        <Route path="/products/:id/edit" element={<ProductEdit />} />
        <Route path="/products/:id" element={<div>Details page</div>} />
      </Routes>,
      { routerProps: { initialEntries: [`/products/${id}/edit`] } },
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

  it('renders edit form with product defaults and navigates on success', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProductById).mockResolvedValue(product);
    vi.mocked(updateProduct).mockResolvedValue(product);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Редактирование товара' }),
    ).toBeInTheDocument();
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Название/ })).toHaveValue(
      product.name,
    );

    await user.clear(screen.getByRole('textbox', { name: 'Цена, ₽' }));
    await user.type(screen.getByRole('textbox', { name: 'Цена, ₽' }), '120000');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Details page')).toBeInTheDocument();
  });

  it('navigates back to details on cancel', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProductById).mockResolvedValue(product);

    renderPage();

    await screen.findByRole('button', { name: 'Отмена' });

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(await screen.findByText('Details page')).toBeInTheDocument();
  });
});
