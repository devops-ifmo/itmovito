import {
  CategorySchema,
  CreateItemSchema,
  ItemFilterSchema,
  ItemSchema,
  UpdateItemSchema,
} from './items.dto';

describe('items dto schemas', () => {
  describe('CategorySchema', () => {
    it('accepts the known categories', () => {
      expect(CategorySchema.parse('auto')).toBe('auto');
      expect(CategorySchema.parse('real_estate')).toBe('real_estate');
      expect(CategorySchema.parse('electronics')).toBe('electronics');
    });

    it('rejects unknown categories', () => {
      expect(() => CategorySchema.parse('toys')).toThrow();
    });
  });

  describe('ItemSchema', () => {
    const valid = {
      id: 1,
      name: 'Car',
      description: 'A nice car',
      category: 'auto',
      price: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('parses a valid item and coerces price', () => {
      const parsed = ItemSchema.parse({ ...valid, price: '1500' });
      expect(parsed.price).toBe(1500);
    });

    it('rejects an empty name', () => {
      expect(() => ItemSchema.parse({ ...valid, name: '' })).toThrow();
    });

    it('rejects a negative price', () => {
      expect(() => ItemSchema.parse({ ...valid, price: -1 })).toThrow();
    });
  });

  describe('CreateItemSchema', () => {
    it('omits id and timestamps', () => {
      const parsed = CreateItemSchema.parse({
        name: 'Phone',
        description: 'A phone',
        category: 'electronics',
        price: 500,
      });
      expect(parsed).not.toHaveProperty('id');
      expect(parsed).not.toHaveProperty('createdAt');
    });
  });

  describe('UpdateItemSchema', () => {
    it('allows partial payloads', () => {
      expect(UpdateItemSchema.parse({})).toEqual({});
      expect(UpdateItemSchema.parse({ price: 10 })).toEqual({ price: 10 });
    });
  });

  describe('ItemFilterSchema', () => {
    it('applies defaults when nothing is provided', () => {
      expect(ItemFilterSchema.parse({})).toEqual({
        sortBy: 'createdAt',
        order: 'desc',
        page: 1,
        limit: 20,
      });
    });

    it('coerces numeric query strings', () => {
      const parsed = ItemFilterSchema.parse({
        minPrice: '100',
        maxPrice: '500',
        page: '2',
        limit: '50',
      });
      expect(parsed.minPrice).toBe(100);
      expect(parsed.maxPrice).toBe(500);
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
    });

    it('rejects a limit above the maximum', () => {
      expect(() => ItemFilterSchema.parse({ limit: 1000 })).toThrow();
    });

    it('rejects an invalid sort order', () => {
      expect(() => ItemFilterSchema.parse({ order: 'sideways' })).toThrow();
    });
  });
});
