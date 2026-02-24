import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthApplication } from 'src/domains/health/applications/health.application';

@Controller('metrics')
export class PrometheusController {
  constructor(private readonly healthApplication: HealthApplication) { }

  /**
   * GET /metrics - Main Prometheus metrics endpoint
   * Returns ALL collected metrics in Prometheus format
   */
  @Get()
  async getMetrics(@Res() res: Response) {
    try {
      const healthStatus = await this.healthApplication.getHealthStatus();
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      let metrics = '# HELP megatron_health_status Application health status (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_health_status gauge\n';
      metrics += `megatron_health_status ${healthStatus.status ? 1 : 0}\n\n`;

      // Service health metrics
      metrics += '# HELP megatron_mysql_health MySQL connection health (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_mysql_health gauge\n';
      metrics += `megatron_mysql_health ${healthStatus.drivers.mysql.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_kafka_consumer_health Kafka consumer health (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_kafka_consumer_health gauge\n';
      metrics += `megatron_kafka_consumer_health ${healthStatus.drivers.kafkaConsumer.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_kafka_producer_health Kafka producer health (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_kafka_producer_health gauge\n';
      metrics += `megatron_kafka_producer_health ${healthStatus.drivers.kafkaProducer.status ? 1 : 0}\n\n`;

      // System metrics
      metrics += '# HELP megatron_memory_heap_used_bytes Heap memory used in bytes\n';
      metrics += '# TYPE megatron_memory_heap_used_bytes gauge\n';
      metrics += `megatron_memory_heap_used_bytes ${memUsage.heapUsed}\n\n`;

      metrics += '# HELP megatron_memory_heap_total_bytes Total heap memory in bytes\n';
      metrics += '# TYPE megatron_memory_heap_total_bytes gauge\n';
      metrics += `megatron_memory_heap_total_bytes ${memUsage.heapTotal}\n\n`;

      metrics += '# HELP megatron_memory_rss_bytes Resident set size in bytes\n';
      metrics += '# TYPE megatron_memory_rss_bytes gauge\n';
      metrics += `megatron_memory_rss_bytes ${memUsage.rss}\n\n`;

      metrics += '# HELP megatron_system_cpu_user_seconds CPU user time in seconds\n';
      metrics += '# TYPE megatron_system_cpu_user_seconds counter\n';
      metrics += `megatron_system_cpu_user_seconds ${cpuUsage.user / 1000000}\n\n`;

      metrics += '# HELP megatron_system_cpu_system_seconds CPU system time in seconds\n';
      metrics += '# TYPE megatron_system_cpu_system_seconds counter\n';
      metrics += `megatron_system_cpu_system_seconds ${cpuUsage.system / 1000000}\n\n`;

      metrics += '# HELP megatron_uptime_seconds Application uptime in seconds\n';
      metrics += '# TYPE megatron_uptime_seconds counter\n';
      metrics += `megatron_uptime_seconds ${process.uptime()}\n\n`;

      // Database metrics
      metrics += '# HELP megatron_database_connection_status Database connection status (1 = connected, 0 = disconnected)\n';
      metrics += '# TYPE megatron_database_connection_status gauge\n';
      metrics += `megatron_database_connection_status ${healthStatus.drivers.mysql.status ? 1 : 0}\n\n`;

      // Kafka metrics
      metrics += '# HELP megatron_kafka_consumer_connected Kafka consumer connection status (1 = connected, 0 = disconnected)\n';
      metrics += '# TYPE megatron_kafka_consumer_connected gauge\n';
      metrics += `megatron_kafka_consumer_connected ${healthStatus.drivers.kafkaConsumer.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_kafka_producer_connected Kafka producer connection status (1 = connected, 0 = disconnected)\n';
      metrics += '# TYPE megatron_kafka_producer_connected gauge\n';
      metrics += `megatron_kafka_producer_connected ${healthStatus.drivers.kafkaProducer.status ? 1 : 0}\n\n`;

      // Custom metrics (placeholders)
      metrics += '# HELP megatron_transform_operations_total Total transformation operations\n';
      metrics += '# TYPE megatron_transform_operations_total counter\n';
      metrics += 'megatron_transform_operations_total{type="agencies"} 0\n';
      metrics += 'megatron_transform_operations_total{type="airlines"} 0\n';
      metrics += 'megatron_transform_operations_total{type="hotels"} 0\n\n';

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting metrics');
    }
  }

  /**
   * GET /metrics/health - Health status in Prometheus format
   */
  @Get('health')
  async getHealthMetrics(@Res() res: Response) {
    try {
      const healthStatus = await this.healthApplication.getHealthStatus();

      let metrics = '# HELP megatron_health_status Application health status (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_health_status gauge\n';
      metrics += `megatron_health_status ${healthStatus.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_mysql_health MySQL connection health (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_mysql_health gauge\n';
      metrics += `megatron_mysql_health ${healthStatus.drivers.mysql.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_kafka_consumer_health Kafka consumer health (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_kafka_consumer_health gauge\n';
      metrics += `megatron_kafka_consumer_health ${healthStatus.drivers.kafkaConsumer.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_kafka_producer_health Kafka producer health (1 = healthy, 0 = unhealthy)\n';
      metrics += '# TYPE megatron_kafka_producer_health gauge\n';
      metrics += `megatron_kafka_producer_health ${healthStatus.drivers.kafkaProducer.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_uptime_seconds Application uptime in seconds\n';
      metrics += '# TYPE megatron_uptime_seconds counter\n';
      metrics += `megatron_uptime_seconds ${process.uptime()}\n\n`;

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting health metrics');
    }
  }

  /**
   * GET /metrics/system - System metrics
   */
  @Get('system')
  async getSystemMetrics(@Res() res: Response) {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      let metrics = '# HELP megatron_memory_heap_used_bytes Heap memory used in bytes\n';
      metrics += '# TYPE megatron_memory_heap_used_bytes gauge\n';
      metrics += `megatron_memory_heap_used_bytes ${memUsage.heapUsed}\n\n`;

      metrics += '# HELP megatron_memory_heap_total_bytes Total heap memory in bytes\n';
      metrics += '# TYPE megatron_memory_heap_total_bytes gauge\n';
      metrics += `megatron_memory_heap_total_bytes ${memUsage.heapTotal}\n\n`;

      metrics += '# HELP megatron_system_cpu_user_seconds CPU user time in seconds\n';
      metrics += '# TYPE megatron_system_cpu_user_seconds counter\n';
      metrics += `megatron_system_cpu_user_seconds ${cpuUsage.user / 1000000}\n\n`;

      metrics += '# HELP megatron_uptime_seconds Application uptime in seconds\n';
      metrics += '# TYPE megatron_uptime_seconds counter\n';
      metrics += `megatron_uptime_seconds ${process.uptime()}\n\n`;

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting system metrics');
    }
  }

  /**
   * GET /metrics/database - Database metrics
   */
  @Get('database')
  async getDatabaseMetrics(@Res() res: Response) {
    try {
      const healthStatus = await this.healthApplication.getHealthStatus();

      let metrics = '# HELP megatron_database_connection_status Database connection status (1 = connected, 0 = disconnected)\n';
      metrics += '# TYPE megatron_database_connection_status gauge\n';
      metrics += `megatron_database_connection_status ${healthStatus.drivers.mysql.status ? 1 : 0}\n\n`;

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting database metrics');
    }
  }

  /**
   * GET /metrics/kafka - Kafka metrics
   */
  @Get('kafka')
  async getKafkaMetrics(@Res() res: Response) {
    try {
      const healthStatus = await this.healthApplication.getHealthStatus();

      let metrics = '# HELP megatron_kafka_consumer_connected Kafka consumer connection status (1 = connected, 0 = disconnected)\n';
      metrics += '# TYPE megatron_kafka_consumer_connected gauge\n';
      metrics += `megatron_kafka_consumer_connected ${healthStatus.drivers.kafkaConsumer.status ? 1 : 0}\n\n`;

      metrics += '# HELP megatron_kafka_producer_connected Kafka producer connection status (1 = connected, 0 = disconnected)\n';
      metrics += '# TYPE megatron_kafka_producer_connected gauge\n';
      metrics += `megatron_kafka_producer_connected ${healthStatus.drivers.kafkaProducer.status ? 1 : 0}\n\n`;

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting Kafka metrics');
    }
  }

  /**
   * GET /metrics/performance - Performance metrics
   */
  @Get('performance')
  async getPerformanceMetrics(@Res() res: Response) {
    try {
      let metrics = '# HELP megatron_active_requests Current active requests\n';
      metrics += '# TYPE megatron_active_requests gauge\n';
      metrics += 'megatron_active_requests 0\n\n';

      metrics += '# HELP megatron_requests_total Total HTTP requests\n';
      metrics += '# TYPE megatron_requests_total counter\n';
      metrics += 'megatron_requests_total{method="GET",status="200"} 0\n';
      metrics += 'megatron_requests_total{method="POST",status="200"} 0\n\n';

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting performance metrics');
    }
  }
}