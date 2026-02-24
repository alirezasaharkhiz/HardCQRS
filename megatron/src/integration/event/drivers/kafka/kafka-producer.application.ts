import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { Buffer } from 'node:buffer';

@Injectable()
export class KafkaProducerApplication implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerApplication.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    const brokers = (this.config.get<string>('KAFKA_BOOTSTRAP_SERVERS') || 'localhost:9092')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    this.kafka = new Kafka({
      clientId: this.config.get<string>('KAFKA_CLIENT_ID') || 'megatron',
      brokers,
      retry: { initialRetryTime: 300, retries: 8 },
      logLevel: logLevel.NOTHING,
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
    this.logger.log('Kafka producer connected.');
  }

  private async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.producer.disconnect();
    } finally {
      this.connected = false;
      this.logger.log('Kafka producer disconnected.');
    }
  }

  private toBuffer(value: any): Buffer | null {
    // tombstone support
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return Buffer.from(value);
    return Buffer.from(JSON.stringify(value));
  }

  async sendMessage(topic: string, key: string | number | null, value: any): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const kafkaKey =
      key == null ? null : (typeof key === 'string' ? key : String(key));

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: kafkaKey,
            value: this.toBuffer(value),
          },
        ],
      });
      this.logger.log(`Produced message → ${topic} key=${kafkaKey} tombstone=${value == null}`);
    } catch (err: any) {
      this.logger.error(`Failed to send message to ${topic}: ${err?.message || err}`);
      throw err;
    }
  }

  async sendTombstone(topic: string, key: string) {
    key = `{_id : ` + key + `}`
    await this.producer.send({
      topic,
      messages: [{ key, value: null }],
    });
  }

  public isProducerConnected(): boolean {
    return this.connected;
  }
}
