import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/metrics') return next();

    const end = this.metrics.httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path ?? req.path ?? 'unknown';
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      };
      end(labels);
      this.metrics.httpRequests.inc(labels);
    });
    next();
  }
}
