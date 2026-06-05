import client from 'prom-client';
import mongoose from 'mongoose';

export class PrometheusService {
  public static register = new client.Registry();

  public static initialize() {
    // Add a default label which is added to all metrics
    this.register.setDefaultLabels({
      app: 'event_decor_backend',
    });

    // Enable the collection of default metrics
    client.collectDefaultMetrics({ register: this.register });
  }

  // Custom Metrics
  public static httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.register],
  });

  public static httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [this.register],
  });

  public static dbConnectionStatus = new client.Gauge({
    name: 'db_connection_status',
    help: 'Status of the MongoDB connection (1=connected, 0=disconnected)',
    registers: [this.register],
    collect() {
      this.set(mongoose.connection.readyState === 1 ? 1 : 0);
    },
  });

  public static queueLength = new client.Gauge({
    name: 'bullmq_queue_length',
    help: 'Length of background job queues',
    labelNames: ['queue_name'],
    registers: [this.register],
  });

  public static getMetrics = async () => {
    return await this.register.metrics();
  };

  public static getContentType = () => {
    return this.register.contentType;
  };
}
