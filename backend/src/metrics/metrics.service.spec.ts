import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('registers the http counter and duration histogram', () => {
    expect(service.registry).toBeDefined();
    expect(service.httpRequests).toBeDefined();
    expect(service.httpDuration).toBeDefined();
  });

  it('exposes registered metrics through the registry', async () => {
    service.httpRequests.inc({ method: 'GET', route: '/item', status: '200' });

    const output = await service.registry.metrics();
    expect(output).toContain('http_requests_total');
    expect(output).toContain('http_request_duration_seconds');
  });

  describe('onModuleInit', () => {
    const original = { ...process.env };

    afterEach(() => {
      process.env.POD_NAME = original.POD_NAME;
      process.env.POD_NAMESPACE = original.POD_NAMESPACE;
    });

    it('falls back to "unknown" default labels when env is unset', async () => {
      delete process.env.POD_NAME;
      delete process.env.POD_NAMESPACE;

      service.onModuleInit();

      const output = await service.registry.metrics();
      expect(output).toContain('pod="unknown"');
      expect(output).toContain('namespace="unknown"');
    });

    it('uses POD_NAME / POD_NAMESPACE env vars when present', async () => {
      process.env.POD_NAME = 'pod-1';
      process.env.POD_NAMESPACE = 'prod';

      service.onModuleInit();

      const output = await service.registry.metrics();
      expect(output).toContain('pod="pod-1"');
      expect(output).toContain('namespace="prod"');
    });

    it('collects default process metrics', async () => {
      service.onModuleInit();

      const output = await service.registry.metrics();
      expect(output).toContain('process_cpu_user_seconds_total');
    });
  });
});
