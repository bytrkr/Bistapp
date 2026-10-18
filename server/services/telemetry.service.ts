// server/services/telemetry.service.ts
import client from 'prom-client';

client.collectDefaultMetrics({ register: client.register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP istek sureleri (saniye)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

export const telemetryService = {
  httpRequestDuration,
  getContentType(): string {
    return client.register.contentType;
  },
  async getMetrics(): Promise<string> {
    return await client.register.metrics();
  }
};
