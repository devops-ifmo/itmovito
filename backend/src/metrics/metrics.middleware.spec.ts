import { Request, Response, NextFunction } from 'express';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let metrics: MetricsService;
  let endTimer: jest.Mock;

  beforeEach(() => {
    endTimer = jest.fn();
    metrics = {
      httpDuration: { startTimer: jest.fn().mockReturnValue(endTimer) },
      httpRequests: { inc: jest.fn() },
    } as unknown as MetricsService;

    middleware = new MetricsMiddleware(metrics);
  });

  it('skips instrumentation for the /metrics endpoint', () => {
    const next = jest.fn() as NextFunction;
    const req = { path: '/metrics' } as Request;
    const res = { on: jest.fn() } as unknown as Response;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(metrics.httpDuration.startTimer).not.toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
  });

  it('records duration and increments the counter on finish (with route path)', () => {
    const next = jest.fn() as NextFunction;
    let finishCb: () => void = () => undefined;
    const req = {
      path: '/item/1',
      method: 'GET',
      route: { path: '/item/:id' },
    } as unknown as Request;
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
    } as unknown as Response;

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(metrics.httpDuration.startTimer).toHaveBeenCalledTimes(1);

    finishCb();

    const labels = { method: 'GET', route: '/item/:id', status: '200' };
    expect(endTimer).toHaveBeenCalledWith(labels);
    expect(metrics.httpRequests.inc).toHaveBeenCalledWith(labels);
  });

  it('falls back to req.path when no route is matched', () => {
    const next = jest.fn() as NextFunction;
    let finishCb: () => void = () => undefined;
    const req = {
      path: '/unknown-path',
      method: 'POST',
    } as unknown as Request;
    const res = {
      statusCode: 404,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
    } as unknown as Response;

    middleware.use(req, res, next);
    finishCb();

    const labels = { method: 'POST', route: '/unknown-path', status: '404' };
    expect(endTimer).toHaveBeenCalledWith(labels);
    expect(metrics.httpRequests.inc).toHaveBeenCalledWith(labels);
  });

  it('falls back to "unknown" when neither route nor path is present', () => {
    const next = jest.fn() as NextFunction;
    let finishCb: () => void = () => undefined;
    const req = { method: 'GET' } as unknown as Request;
    const res = {
      statusCode: 500,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
    } as unknown as Response;

    middleware.use(req, res, next);
    finishCb();

    expect(metrics.httpRequests.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: 'unknown',
      status: '500',
    });
  });
});
