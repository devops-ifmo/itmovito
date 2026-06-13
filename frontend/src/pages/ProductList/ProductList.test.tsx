import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchProducts } from '@/api/products';
import { productItem } from '@/test/fixtures';
import { renderWithProviders } from '@/test/test-utils';

import ProductList from './ProductList';

vi.mock('@/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products')>();

  return {
    ...actual,
    fetchProducts: vi.fn(),
  };
});

describe('ProductList', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while products are fetched', () => {
    vi.mocked(fetchProducts).mockReturnValue(new Promise(() => undefined));

    renderWithProviders(<ProductList />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    vi.mocked(fetchProducts).mockRejectedValue(new Error('network'));

    renderWithProviders(<ProductList />);

    expect(
      await screen.findByText('Не удалось загрузить товары.'),
    ).toBeInTheDocument();
  });

  it('shows empty state and navigates to create page', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProducts).mockResolvedValue([]);

    renderWithProviders(
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/products/new" element={<div>Create page</div>} />
      </Routes>,
    );

    expect(await screen.findByText('Пока нет товаров')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Создать товар' }));

    expect(await screen.findByText('Create page')).toBeInTheDocument();
  });

  it('renders products and navigates to create page from header button', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchProducts).mockResolvedValue([productItem]);

    renderWithProviders(
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/products/new" element={<div>Create page</div>} />
      </Routes>,
    );

    expect(
      await screen.findByRole('heading', { name: productItem.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/products/${productItem.id}`,
    );

    await user.click(screen.getByRole('button', { name: 'Добавить товар' }));

    expect(await screen.findByText('Create page')).toBeInTheDocument();
  });
});
