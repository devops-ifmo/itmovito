import { type Product } from '@/entities/product/product.schema';
import { type ProductItem } from '@/entities/product/productItem.shema';

export const productItem: ProductItem = {
  id: 42,
  category: {
    slug: 'electronics',
    name: 'Электроника',
  },
  name: 'Ноутбук Lenovo',
  description: 'Игровой ноутбук в хорошем состоянии',
  price: 125000,
};

export const product: Product = {
  ...productItem,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

export const productItemServer = {
  id: productItem.id,
  category: 'electronics' as const,
  name: productItem.name,
  description: productItem.description,
  price: productItem.price,
};

export const productServer = {
  ...productItemServer,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};
