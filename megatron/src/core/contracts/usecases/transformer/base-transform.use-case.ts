import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

/**
 * Interface that defines the contract for all transform use cases
 */
export interface ITransformUseCase {
  /**
   * Execute the transformation logic for the given key-value pair
   * @param key - The message key (can be null)
   * @param value - The message value to transform
   * @returns Promise that resolves when transformation is complete
   */
  execute(key: string | null, value: any): Promise<void>;
}

@Injectable()
export abstract class BaseTransformUseCase implements ITransformUseCase {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly targetPrefix: string;

  protected constructor(
    protected readonly producer: KafkaProducerApplication,
    protected readonly config: ConfigService,
  ) {
    this.targetPrefix = this.config.get<string>('TARGET_TOPIC_PREFIX');// || 'collection_';
  }

  /**
   * Abstract method that must be implemented by all transform use cases
   * This ensures all transform use cases follow the same contract
   */
  abstract execute(key: string | null, value: any): Promise<void>;

  protected logReceiveData(topicName: string, key: string | null, value: any): void {
    this.logger.debug(`📨 [${topicName.toUpperCase()}] Received data - Key: ${key || 'null'}`);
    this.logger.debug(`📦 [${topicName.toUpperCase()}] Input value:`, value ? JSON.stringify(value, null, 2) : 'null');
  }

  protected logUseCaseEnd(topicName: string, success: boolean = true, transformedData?: any): void {
    if (success && transformedData) {
      this.logger.debug(`🏁 [${topicName.toUpperCase()}] Use case ✅ SUCCESS - Transformed data:`, JSON.stringify(transformedData, null, 2));
    } else {
      const status = success ? '✅ SUCCESS' : '❌ COMPLETED';
      this.logger.debug(`🏁 [${topicName.toUpperCase()}] Use case ${status}`, JSON.stringify(transformedData ?? "no transformed data", null, 2));
    }
  }

  protected async sendTombstone(topic: string, id: string,) {
    await this.producer.sendTombstone(topic, id);
    this.logUseCaseEnd(topic, true, { key: id, value: null });
  }
}
