import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client';
import { createProduct, updateProduct } from '@/api/products';
import { type Product } from '@/entities/product/product.schema';

import ProductForm from './ProductForm';

vi.mock('@/api/products', () => ({
  createProduct: vi.fn(),
  productKeys: {
    all: ['products'],
    lists: () => ['products', 'list'],
    detail: (id: number) => ['products', 'detail', id],
  },
  updateProduct: vi.fn(),
}));

const product: Product = {
  id: 42,
  category: {
    slug: 'electronics',
    name: 'Электроника',
  },
  name: 'Ноутбук Lenovo',
  description: 'Игровой ноутбук в хорошем состоянии',
  price: 125000,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const renderForm = (
  props: Partial<React.ComponentProps<typeof ProductForm>> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const onCancel = vi.fn();
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <ProductForm
        mode="create"
        onCancel={onCancel}
        onSuccess={onSuccess}
        {...props}
      />
    </QueryClientProvider>,
  );

  return { onCancel, onSuccess };
};

describe('ProductForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders default values and create actions', () => {
    renderForm({
      defaultCategory: 'real_estate',
      defaultDescription: 'Светлая квартира рядом с метро',
      defaultPrice: 9500000,
      defaultName: 'Квартира',
    });

    expect(screen.getByLabelText('Категория')).toHaveTextContent(
      'Недвижимость',
    );
    expect(screen.getByRole('textbox', { name: /Название/ })).toHaveValue(
      'Квартира',
    );
    expect(screen.getByRole('textbox', { name: 'Описание' })).toHaveValue(
      'Светлая квартира рядом с метро',
    );
    expect(screen.getByRole('textbox', { name: 'Цена, ₽' })).toHaveValue(
      '9500000',
    );
    expect(screen.getByRole('button', { name: 'Создать' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeEnabled();
  });

  it('disables submit when required fields are invalid', async () => {
    const user = userEvent.setup({ delay: null });

    renderForm();

    expect(screen.getByText('Укажите название')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: /Название/ }),
      'Телефон',
    );
    await user.clear(screen.getByRole('textbox', { name: 'Цена, ₽' }));
    await user.type(screen.getByRole('textbox', { name: 'Цена, ₽' }), '-1');

    expect(
      screen.getByText('Укажите неотрицательное число'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled();
  });

  it('creates product with trimmed and parsed form values', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(createProduct).mockResolvedValue(product);

    const { onSuccess } = renderForm({ defaultCategory: 'electronics' });

    await user.type(
      screen.getByRole('textbox', { name: /Название/ }),
      '  Ноутбук Lenovo  ',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Описание' }),
      '  Игровой ноутбук в хорошем состоянии  ',
    );
    await user.clear(screen.getByRole('textbox', { name: 'Цена, ₽' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Цена, ₽' }),
      '125 000,5',
    );
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith({
        category: 'electronics',
        name: 'Ноутбук Lenovo',
        description: 'Игровой ноутбук в хорошем состоянии',
        price: 125000.5,
      });
      expect(onSuccess).toHaveBeenCalledWith(product);
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    const { onCancel } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows api error messages for failed save', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(createProduct).mockRejectedValue(new ApiError(404, 'Not found'));

    renderForm();

    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'Phone');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Товар не найден.')).toBeInTheDocument();
  });

  it('shows validation error message from api', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(createProduct).mockRejectedValue(
      new ApiError(400, 'Invalid payload'),
    );

    renderForm();

    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'Phone');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Invalid payload')).toBeInTheDocument();
  });

  it('shows server error message for 5xx responses', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(createProduct).mockRejectedValue(
      new ApiError(500, 'Server error'),
    );

    renderForm();

    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'Phone');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(
      await screen.findByText('Ошибка сервера. Попробуйте позже.'),
    ).toBeInTheDocument();
  });

  it('updates existing product in edit mode', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(updateProduct).mockResolvedValue(product);

    const { onSuccess } = renderForm({
      defaultCategory: 'electronics',
      defaultDescription: product.description,
      defaultPrice: product.price,
      defaultName: product.name,
      mode: 'edit',
      productId: product.id,
    });

    await user.clear(screen.getByRole('textbox', { name: 'Цена, ₽' }));
    await user.type(screen.getByRole('textbox', { name: 'Цена, ₽' }), '120000');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith(product.id, {
        category: 'electronics',
        name: product.name,
        description: product.description,
        price: 120000,
      });
      expect(onSuccess).toHaveBeenCalledWith(product);
    });
  });
});
