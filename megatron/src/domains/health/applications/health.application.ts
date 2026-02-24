import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumerApplication } from 'src/integration/event/drivers/kafka/kafka-consumer.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { DataSource } from 'typeorm';
import { Kafka, Admin, KafkaConfig } from 'kafkajs';

export interface HealthCheckResult {
  status: boolean;
  message: string;
  meta?: Record<string, any>;
}

export interface HealthResponse {
  status: boolean;
  message: string;
  application: {
    status: boolean;
    message: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    appEnv?: string;
  };
  drivers: {
    mysql: HealthCheckResult;
    kafkaConsumer: HealthCheckResult;
    kafkaProducer: HealthCheckResult;
  };
}

@Injectable()
export class HealthApplication {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly kafkaConsumer: KafkaConsumerApplication,
    private readonly kafkaProducer: KafkaProducerApplication,
  ) { }

  async getHealthStatus(): Promise<HealthResponse> {
    const drivers = {
      mysql: await this.checkMysql(),
      kafkaConsumer: await this.checkKafkaConsumer(),
      kafkaProducer: await this.checkKafkaProducer(),
    };

    const applicationCheck = this.checkApplication();
    const allServicesHealthy = Object.values(drivers).every(service => service.status);
    const overallHealthy = allServicesHealthy && applicationCheck.status;

    return {
      status: overallHealthy,
      message: overallHealthy ? 'healthy' : 'unhealthy',
      application: {
        status: applicationCheck.status,
        message: applicationCheck.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        appEnv: this.config.get<string>('APP_ENV') || 'not set',
      },
      drivers,
    };
  }

  getPing() {
    return {
      ping: true,
      ts: new Date().toISOString()
    };
  }

  private async checkMysql(): Promise<HealthCheckResult> {
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: false,
          message: 'MySQL connection not initialized',
        };
      }

      await this.dataSource.query('SELECT 1');

      return {
        status: true,
        message: 'MySQL connection is healthy',
      };
    } catch (error) {
      return {
        status: false,
        message: `MySQL connection failed: ${error.message}`,
      };
    }
  }

  private async checkKafkaConsumer(): Promise<HealthCheckResult> {
    const TIMEOUT_MS = 1500;

    const c = this.kafkaConsumer as any;
    const reuseKafka: Kafka | null = c?.kafka ?? null;

    // --- FIXED: ensure string[] with proper type-guards ---
    const extractRegisteredTopics = (): string[] => {
      try {
        const router = c?.router;
        if (!router) return [];

        // Prefer public API
        if (typeof router.getRegisteredTopics === 'function') {
          const maybeList: unknown = router.getRegisteredTopics();
          if (Array.isArray(maybeList)) {
            return maybeList
              .filter((t: unknown): t is string => typeof t === 'string')
              .map((t) => t) // already string
              .sort();
          }
        }

        // Fallback to internal maps/shapes
        const mapLike: unknown =
          router?.handlers ??
          router?.topicHandlers ??
          router?._handlers ??
          router?._topicHandlers ??
          null;

        if (!mapLike) return [];

        // Map-like
        if (typeof (mapLike as any).keys === 'function') {
          return Array.from((mapLike as Map<unknown, unknown>).keys())
            .filter((k: unknown): k is string => typeof k === 'string')
            .map((k) => k)
            .sort();
        }

        // Record-like
        if (mapLike && typeof mapLike === 'object') {
          return Object.keys(mapLike as Record<string, unknown>)
            .map((k) => k)
            .sort();
        }

        return [];
      } catch {
        return [];
      }
    };

    const registeredTopics = extractRegisteredTopics();

    // --- connectivity probe (broker reachability only) ---
    const bootstrap = this.config.get<string>('KAFKA_BOOTSTRAP_SERVERS') || 'kafka:9092';
    const fallbackKafka = new Kafka({
      clientId: 'healthcheck-probe',
      brokers: bootstrap.split(',').map((s) => s.trim()).filter(Boolean),
    } as KafkaConfig);

    const kafka = reuseKafka ?? fallbackKafka;
    const admin: Admin = kafka.admin();

    try {
      const meta = await Promise.race([
        (async () => {
          await admin.connect();
          try {
            const cluster = await admin.describeCluster(); // { brokers, controller, clusterId }
            return {
              brokers: cluster.brokers,
              controller: cluster.controller,
              clusterId: cluster.clusterId,
            };
          } finally {
            await admin.disconnect().catch(() => undefined);
          }
        })(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('kafka connection probe timeout')), TIMEOUT_MS),
        ),
      ]);

      return {
        status: true,
        message: 'Kafka broker is reachable',
        meta: {
          usedConsumerKafkaInstance: !!reuseKafka,
          ...meta,
          registeredTopics,              // <- typed string[]
          topicsCount: registeredTopics.length,
        },
      };
    } catch (error: any) {
      await admin.disconnect().catch(() => undefined);
      return {
        status: false,
        message: `Kafka broker is NOT reachable: ${error?.message ?? 'unknown error'}`,
        meta: {
          usedConsumerKafkaInstance: !!reuseKafka,
          registeredTopics,              // <- still included
          topicsCount: registeredTopics.length,
        },
      };
    }
  }



  private async checkKafkaProducer(): Promise<HealthCheckResult> {
    try {
      const isConnected = this.kafkaProducer.isProducerConnected();

      if (!isConnected) {
        return {
          status: false,
          message: 'Kafka producer is not connected',
        };
      }

      return {
        status: true,
        message: 'Kafka producer is connected and healthy',
      };
    } catch (error) {
      return {
        status: false,
        message: `Kafka producer check failed: ${error.message}`,
      };
    }
  }

  private checkApplication(): HealthCheckResult {
    try {
      const config = this.config;

      // Check if required environment variables are present (excluding APP_ENV)
      const requiredEnvVars = [
        'MYSQL_HOST',
        'MYSQL_USER',
        'MYSQL_PASSWORD',
        'MYSQL_DATABASE',
        'KAFKA_BOOTSTRAP_SERVERS',
        'SOURCE_TOPIC_PREFIX',
        'KAFKA_GROUP_ID'
      ];

      const missingVars = requiredEnvVars.filter(varName => !config.get(varName));

      if (missingVars.length > 0) {
        return {
          status: false,
          message: `Missing required environment variables: ${missingVars.join(', ')}`,
        };
      }

      return {
        status: true,
        message: 'Application configuration is valid',
      };
    } catch (error) {
      return {
        status: false,
        message: `Application check failed: ${error.message}`,
      };
    }
  }
}
