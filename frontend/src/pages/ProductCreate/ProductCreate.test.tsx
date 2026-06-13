import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createProduct } from '@/api/products';
import { product } from '@/test/fixtures';
import { renderWithProviders } from '@/test/test-utils';

import ProductCreate from './ProductCreate';

vi.mock('@/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products')>();

  return {
    ...actual,
    createProduct: vi.fn(),
  };
});

describe('ProductCreate', () => {
  it('renders create form and navigates to list on cancel', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/products/new" element={<ProductCreate />} />
        <Route path="/" element={<div>List page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ['/products/new'] } },
    );

    expect(
      screen.getByRole('heading', { name: 'Новый товар' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Заполните поля ниже, чтобы добавить объявление в каталог.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(await screen.findByText('List page')).toBeInTheDocument();
  });

  it('navigates to product details after successful creation', async () => {
    const user = userEvent.setup();

    vi.mocked(createProduct).mockResolvedValue(product);

    renderWithProviders(
      <Routes>
        <Route path="/products/new" element={<ProductCreate />} />
        <Route path="/products/:id" element={<div>Details page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ['/products/new'] } },
    );

    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'Phone');
    await user.clear(screen.getByRole('textbox', { name: 'Цена, ₽' }));
    await user.type(screen.getByRole('textbox', { name: 'Цена, ₽' }), '1000');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Details page')).toBeInTheDocument();
  });
});
