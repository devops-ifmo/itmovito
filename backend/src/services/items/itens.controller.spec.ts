import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './itens.controller';
import { ItemsService } from './items.service';

describe('ItemsController', () => {
  let controller: ItemsController;
  let service: jest.Mocked<
    Pick<
      ItemsService,
      | 'getItemsWithFilter'
      | 'getItemById'
      | 'createItems'
      | 'updateItems'
      | 'deleteItems'
    >
  >;

  beforeEach(async () => {
    service = {
      getItemsWithFilter: jest.fn(),
      getItemById: jest.fn(),
      createItems: jest.fn(),
      updateItems: jest.fn(),
      deleteItems: jest.fn(),
    } as any;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [{ provide: ItemsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(ItemsController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('delegates the query to getItemsWithFilter', async () => {
      const query = { page: 1, limit: 20 } as any;
      const expected = { items: [{ id: 1 }], total: 1 };
      service.getItemsWithFilter.mockResolvedValue(expected as any);

      await expect(controller.list(query)).resolves.toEqual(expected);
      expect(service.getItemsWithFilter).toHaveBeenCalledWith(query);
    });
  });

  describe('getById', () => {
    it('delegates the id to getItemById', async () => {
      const item = { id: 3 } as any;
      service.getItemById.mockResolvedValue(item);

      await expect(controller.getById(3)).resolves.toEqual(item);
      expect(service.getItemById).toHaveBeenCalledWith(3);
    });
  });

  describe('create', () => {
    it('delegates the body to createItems', async () => {
      const dto = {
        name: 'x',
        description: 'd',
        category: 'auto',
        price: 1,
      } as any;
      const created = { id: 1, ...dto };
      service.createItems.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toEqual(created);
      expect(service.createItems).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('delegates id and body to updateItems', async () => {
      const dto = { price: 99 } as any;
      const updated = { id: 5, ...dto };
      service.updateItems.mockResolvedValue(updated);

      await expect(controller.update(5, dto)).resolves.toEqual(updated);
      expect(service.updateItems).toHaveBeenCalledWith(5, dto);
    });
  });

  describe('delete', () => {
    it('delegates the id to deleteItems', async () => {
      const deleted = { id: 5 } as any;
      service.deleteItems.mockResolvedValue(deleted);

      await expect(controller.delete(5)).resolves.toEqual(deleted);
      expect(service.deleteItems).toHaveBeenCalledWith(5);
    });
  });
});
