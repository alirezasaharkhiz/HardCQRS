import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TopicDiscoveryApplication } from '../../topic-discovery.application';

type HandlerFn = (key: string | null, value: any) => Promise<void> | void;

@Injectable()
export class KafkaTopicRouterApplication implements OnModuleInit {
  private readonly logger = new Logger(KafkaTopicRouterApplication.name);

  // Cache handlers resolved from discovery
  private handlers = new Map<string, HandlerFn>();
  prefix = this.normalizePrefix(
    this.config.get<string>('SOURCE_TOPIC_PREFIX') || 'lastdb.lastsecondb.',
  );

  constructor(
    private readonly discovery: TopicDiscoveryApplication,
    private readonly config: ConfigService,
  ) { }

  onModuleInit(): void {
    this.handlers = this.discovery.getHandlers();

    this.logger.log(
      `Kafka router initialized with ${this.handlers.size} handler(s). Prefix="${this.prefix}"`,
    );
  }

  // called by the consumer
  async route(fullTopic: string, key: string | null, value: any): Promise<boolean> {
    const bare = this.extractBareTopic(fullTopic);
    const handler = this.handlers.get(bare);

    if (!handler) {
      this.logger.debug(`No registered handler for topic "${fullTopic}" (bare="${bare}")`);
      return false;
    }

    await handler(key, value);
    return true;
  }

  getRegisteredTopics(): string[] {
    return Array.from(this.handlers.keys()).sort();
  }

  private normalizePrefix(p: string): string {
    if (!p) return '';
    return p.endsWith('.') ? p : `${p}.`;
  }

  private extractBareTopic(full: string): string {
    if (!full) return full;
    if (this.prefix && full.startsWith(this.prefix)) {
      return full.substring(this.prefix.length);
    }
    return full;
  }
}
