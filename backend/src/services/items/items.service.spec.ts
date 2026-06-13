import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaMock = {
  item: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      item: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ItemsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ItemsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getItems', () => {
    it('returns all items from prisma', async () => {
      const items = [{ id: 1, name: 'a' }];
      prisma.item.findMany.mockResolvedValue(items);

      await expect(service.getItems()).resolves.toEqual(items);
      expect(prisma.item.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getItemById', () => {
    it('returns the item when found', async () => {
      const item = { id: 1, name: 'foo' };
      prisma.item.findUnique.mockResolvedValue(item);

      await expect(service.getItemById(1)).resolves.toEqual(item);
      expect(prisma.item.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when missing', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(service.getItemById(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getItemsWithFilter', () => {
    it('applies pagination and returns items + total with no filters', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 1 }], 1]);

      const result = await service.getItemsWithFilter({
        sortBy: 'createdAt',
        order: 'desc',
        page: 2,
        limit: 10,
      } as any);

      expect(result).toEqual({ items: [{ id: 1 }], total: 1 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // verify the query passed to findMany: pagination + ordering, empty where
      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall).toEqual({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(prisma.item.count).toHaveBeenCalledWith({ where: {} });
    });

    it('builds a where clause with category filter', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.getItemsWithFilter({
        category: 'auto',
        sortBy: 'price',
        order: 'asc',
        page: 1,
        limit: 20,
      } as any);

      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall.where).toEqual({ category: 'auto' });
      expect(findManyCall.orderBy).toEqual({ price: 'asc' });
      expect(findManyCall.skip).toBe(0);
    });

    it('builds a case-insensitive OR search clause', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.getItemsWithFilter({
        search: 'bmw',
        sortBy: 'createdAt',
        order: 'desc',
        page: 1,
        limit: 20,
      } as any);

      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall.where).toEqual({
        OR: [
          { name: { contains: 'bmw', mode: 'insensitive' } },
          { description: { contains: 'bmw', mode: 'insensitive' } },
        ],
      });
    });

    it('builds a price range with both min and max', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.getItemsWithFilter({
        minPrice: 100,
        maxPrice: 500,
        sortBy: 'price',
        order: 'asc',
        page: 1,
        limit: 20,
      } as any);

      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall.where).toEqual({ price: { gte: 100, lte: 500 } });
    });

    it('builds a price range with only minPrice', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.getItemsWithFilter({
        minPrice: 100,
        sortBy: 'price',
        order: 'asc',
        page: 1,
        limit: 20,
      } as any);

      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall.where).toEqual({ price: { gte: 100 } });
    });

    it('builds a price range with only maxPrice', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.getItemsWithFilter({
        maxPrice: 500,
        sortBy: 'price',
        order: 'asc',
        page: 1,
        limit: 20,
      } as any);

      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall.where).toEqual({ price: { lte: 500 } });
    });

    it('combines search, category and price filters', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 7 }], 1]);

      await service.getItemsWithFilter({
        search: 'flat',
        category: 'real_estate',
        minPrice: 1000,
        maxPrice: 5000,
        sortBy: 'price',
        order: 'desc',
        page: 3,
        limit: 5,
      } as any);

      const [findManyCall] = prisma.item.findMany.mock.calls[0];
      expect(findManyCall.where).toEqual({
        category: 'real_estate',
        OR: [
          { name: { contains: 'flat', mode: 'insensitive' } },
          { description: { contains: 'flat', mode: 'insensitive' } },
        ],
        price: { gte: 1000, lte: 5000 },
      });
      expect(findManyCall.skip).toBe(10);
      expect(findManyCall.take).toBe(5);
    });
  });

  describe('createItems', () => {
    it('forwards data to prisma.item.create', async () => {
      const dto = {
        name: 'x',
        description: 'd',
        category: 'auto',
        price: 10,
      } as any;
      prisma.item.create.mockResolvedValue({ id: 1, ...dto });

      await service.createItems(dto);

      expect(prisma.item.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('updateItems', () => {
    it('targets the right id with the right data', async () => {
      const dto = { price: 200 } as any;
      prisma.item.update.mockResolvedValue({ id: 5, ...dto });

      await service.updateItems(5, dto);

      expect(prisma.item.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: dto,
      });
    });
  });

  describe('deleteItems', () => {
    it('deletes by id', async () => {
      prisma.item.delete.mockResolvedValue({ id: 1 });

      await service.deleteItems(1);

      expect(prisma.item.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
