import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { getKafkaTopics } from './decorators/topic.decorator';

type HandlerFn = (key: string | null, value: any) => Promise<void> | void;

@Injectable()
export class TopicDiscoveryApplication implements OnModuleInit {
  private readonly logger = new Logger(TopicDiscoveryApplication.name);

  // Map of bareTopic -> handler
  private handlers = new Map<string, HandlerFn>();

  constructor(private readonly discovery: DiscoveryService) { }

  onModuleInit(): void {
    const providers = this.discovery.getProviders();

    let count = 0;
    for (const wrapper of providers) {
      const instance = wrapper.instance as any;
      const metatype = wrapper.metatype as any;

      if (!instance || !metatype) continue;

      // Look for @TopicHandler() on the CLASS
      const topics: string[] = getKafkaTopics(metatype);
      if (!topics.length) continue;

      // Expect an execute(key, value) function on the instance
      if (typeof instance.execute !== 'function') {
        this.logger.warn(
          `Provider "${metatype?.name ?? 'Unknown'}" declares @TopicHandler but has no execute(key,value) method.`,
        );
        continue;
      }

      const bound: HandlerFn = instance.execute.bind(instance);

      for (const t of topics) {
        if (!t || typeof t !== 'string') continue;
        if (this.handlers.has(t)) {
          this.logger.warn(`Duplicate handler for topic "${t}" detected. Overwriting previous handler.`);
        }
        this.handlers.set(t, bound);
        count++;
      }
    }

    this.logger.log(`Discovered ${count} Kafka topic handler(s) across ${this.handlers.size} unique topic(s).`);
  }

  getHandlers(): Map<string, HandlerFn> {
    return this.handlers;
  }
}

