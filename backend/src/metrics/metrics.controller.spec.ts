import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metrics: MetricsService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    controller = moduleRef.get(MetricsController);
    metrics = moduleRef.get(MetricsService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('sets the prometheus content-type and sends the scraped metrics', async () => {
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    const payload = '# HELP http_requests_total\n';
    jest.spyOn(metrics.registry, 'metrics').mockResolvedValue(payload as any);

    await controller.scrape(res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      metrics.registry.contentType,
    );
    expect(res.send).toHaveBeenCalledWith(payload);
  });
});
