import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel, Consumer, KafkaMessage, Admin } from 'kafkajs';
import { KafkaTopicRouterApplication } from './kafka-topic-router.application';
import { TopicDiscoveryApplication } from '../../topic-discovery.application';

@Injectable()
export class KafkaConsumerApplication
  implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerApplication.name);

  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;

  private connected = false;
  private running = false;

  private restarting = false;
  private shutdown = false;

  private subscribedTopics = new Set<string>();
  sourcePrefix = this.normalizePrefix(
    this.config.get<string>('SOURCE_TOPIC_PREFIX') || 'lastdb.lastsecondb.',
  );

  // backoff state
  private restartAttempt = 0;
  private readonly restartBaseMs = 1000;
  private readonly restartMaxMs = 30000;

  // reconnect debounce
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly disconnectGraceMs = 5000;

  // topic sync loop
  private topicSyncTimer: NodeJS.Timeout | null = null;
  private resubscribing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly router: KafkaTopicRouterApplication,
    private readonly _discovery: TopicDiscoveryApplication,
  ) { }

  // -------------------------
  // Lifecycle
  // -------------------------
  async onApplicationBootstrap(): Promise<void> {
    this.sourcePrefix = this.normalizePrefix(
      this.config.get<string>('SOURCE_TOPIC_PREFIX') || this.sourcePrefix,
    );

    const discovered = this.router.getRegisteredTopics?.() ?? [];
    this.logger.log(
      `Registered topic handlers: ${discovered.length ? discovered.join(', ') : '(none found)'
      }`,
    );

    // 1) Create client & connect
    this.createKafkaAndConsumer();
    await this.consumer!.connect();
    // this.connected = true;
    this.logger.log('Kafka consumer connected');

    // 2) Wait for topics then subscribe ALL (fromBeginning) BEFORE run()
    try {
      const minCount = this.numFromEnv('KAFKA_TOPIC_MIN_COUNT', 0);
      const waitMs = this.numFromEnv('KAFKA_TOPIC_WAIT_MS', 20000);
      const initialTopics = await this.waitAndListTopics(this.sourcePrefix, waitMs, minCount);
      await this.subscribeTopics(initialTopics, /*fromBeginning*/ true);
    } catch (e: any) {
      this.logger.warn(
        `Initial topic wait failed/timeout: ${e?.message || e}. Proceeding anyway.`,
      );
      // subscribe whatever exists right now
      const now = await this.listTopicsWithPrefix();
      await this.subscribeTopics(now, /*fromBeginning*/ true);
    }

    // 3) start the run loop
    await this.startRunLoop();
    // this.running = true;
    this.restartAttempt = 0;

    // 4) newly created topics -> stop -> subscribe -> run
    this.startTopicSyncLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.shutdown = true;
    this.stopTopicSyncLoop();
    this.clearReconnectTimer();
    await this.stopConsumer('module-destroy');
  }

  // -------------------------
  // Run loop helpers
  // -------------------------
  private async startRunLoop() {
    if (!this.consumer) return;
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          await this.handle(topic, partition, message);
        } catch (e: any) {
          this.logger.error(
            `eachMessage error on ${topic}[${partition}] offset=${message.offset}: ${e?.message || e}`,
          );
        }
      },

      autoCommit: true,
      autoCommitInterval: 2000,
      autoCommitThreshold: 10,
    });
  }

  private async stopConsumer(reason: string): Promise<void> {
    this.logger.warn(`Stopping Kafka consumer (reason=${reason})`);

    this.running = false;
    this.connected = false;

    try {
      if (this.consumer) {
        await this.consumer.disconnect().catch(() => undefined);
      }
    } finally {
      this.consumer = null;
      this.kafka = null;
    }
  }

  private async scheduleRestart(reason: string): Promise<void> {
    if (this.shutdown) return;
    if (this.restarting) {
      this.logger.warn(`Restart already in progress; skip (reason=${reason})`);
      return;
    }
    this.restarting = true;

    this.running = false;

    const delay = this.nextBackoffMs();
    this.logger.warn(
      `Scheduling consumer restart in ${delay}ms (attempt #${this.restartAttempt + 1}, reason=${reason})`,
    );

    await this.sleep(delay);

    try {
      const already = Array.from(this.subscribedTopics);
      await this.stopConsumer(`restart-prep:${reason}`);
      // recreate + connect
      this.createKafkaAndConsumer();
      await this.consumer!.connect();

      this.connected = true;

      // re-subscribe known topics (no fromBeginning)
      await this.subscribeTopics(already, /*fromBeginning*/ false);
      await this.startRunLoop();

      this.running = true;

      this.logger.log('Consumer restart successful');
      this.restartAttempt = 0;
    } catch (e: any) {
      this.logger.error(`Consumer restart failed: ${e?.message || e}`);
      this.restarting = false;
      await this.scheduleRestart('restart-failed');
      return;
    }

    this.restarting = false;
  }

  // -------------------------
  // Kafka client/consumer setup
  // -------------------------
  private createKafkaAndConsumer(): void {
    const brokers = (this.config.get<string>('KAFKA_BOOTSTRAP_SERVERS') || 'kafka:9092')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const clientId = this.config.get<string>('KAFKA_CLIENT_ID') || 'megatron';
    const groupId = this.config.get<string>('KAFKA_GROUP_ID') || 'cybertron';

    const sessionTimeout = this.numFromEnv('KAFKA_SESSION_TIMEOUT_MS', 30000);
    const heartbeatInterval = this.numFromEnv('KAFKA_HEARTBEAT_INTERVAL_MS', 3000);
    const rebalanceTimeout = this.numFromEnv('KAFKA_REBALANCE_TIMEOUT_MS', 60000);

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: this.numFromEnv('KAFKA_INITIAL_RETRY_TIME_MS', 300),
        retries: this.numFromEnv('KAFKA_MAX_RETRIES', 10),
      },
      requestTimeout: this.numFromEnv('KAFKA_REQUEST_TIMEOUT_MS', 30000),
      logLevel: logLevel.NOTHING,
    });

    this.consumer = this.kafka.consumer({
      groupId,
      allowAutoTopicCreation: false,
      sessionTimeout,
      heartbeatInterval,
      rebalanceTimeout,
    });
  }

  // -------------------------
  // Topic discovery & subscriptions (NO REGEX)
  // -------------------------
  private async listTopicsWithPrefix(): Promise<string[]> {
    if (!this.kafka) return [];
    const admin: Admin = this.kafka.admin();
    await admin.connect();
    try {
      const md = await admin.fetchTopicMetadata();
      const re = new RegExp(`^${this.escapeRegex(this.sourcePrefix)}.+`);
      return md.topics.map(t => t.name).filter(n => re.test(n)).sort();
    } finally {
      await admin.disconnect().catch(() => undefined);
    }
  }

  private async waitAndListTopics(prefix: string, timeoutMs: number, minCount: number): Promise<string[]> {
    const started = Date.now();
    let last: string[] = [];
    while (Date.now() - started < timeoutMs) {
      const list = await this.listTopicsWithPrefix();
      if (list.length > 0 && (minCount <= 0 || list.length >= minCount)) {
        this.logger.log(`Detected ${list.length} topics under "${prefix}"`);
        return list;
      }
      last = list;
      await this.sleep(1500);
    }
    this.logger.warn(`Timeout waiting for topics (found ${last.length})`);
    return last;
  }

  private async subscribeTopics(topics: string[], fromBeginning: boolean) {
    if (!this.consumer) return;
    for (const t of topics) {
      if (this.subscribedTopics.has(t)) continue;
      await this.consumer.subscribe({ topic: t, fromBeginning });
      this.subscribedTopics.add(t);
      this.logger.log(
        `Subscribed to topic "${t}" (fromBeginning=${fromBeginning ? 'true' : 'false'})`,
      );
    }
  }

  private startTopicSyncLoop() {
    const interval = this.numFromEnv('KAFKA_TOPIC_SYNC_MS', 15000);
    if (interval <= 0) return;
    this.stopTopicSyncLoop();
    this.topicSyncTimer = setInterval(async () => {
      if (!this.consumer || this.shutdown || this.resubscribing) return;
      try {
        const list = await this.listTopicsWithPrefix();
        const newOnes = list.filter((t) => !this.subscribedTopics.has(t));
        if (newOnes.length === 0) return;

        this.resubscribing = true;
        this.logger.warn(
          `New topics detected (${newOnes.length}). Re-subscribing with stop→subscribe→run`,
        );

        // stop the running loop
        await this.consumer.stop();

        // subscribe new ones (from beginning for their first sight)
        await this.subscribeTopics(newOnes, /*fromBeginning*/ true);

        // restart the run loop
        await this.startRunLoop();
        this.logger.log('Run loop restarted after new topic subscription');
      } catch (e: any) {
        this.logger.warn(`Topic sync failed: ${e?.message || e}`);
      } finally {
        this.resubscribing = false;
      }
    }, interval);
    this.logger.log(`Topic sync loop started (every ${interval}ms)`);
  }

  private stopTopicSyncLoop() {
    if (this.topicSyncTimer) {
      clearInterval(this.topicSyncTimer);
      this.topicSyncTimer = null;
      this.logger.log('Topic sync loop stopped');
    }
  }

  // -------------------------
  // Message handling
  // -------------------------
  private parseKey(key?: Buffer | null): string | null {
    if (!key) return null;
    try {
      return key.toString('utf8');
    } catch {
      return null;
    }
  }

  private parseValue(value?: Buffer | null): any | null {
    if (!value) return null;
    const text = value.toString('utf8');
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async handle(topic: string, partition: number, message: KafkaMessage): Promise<void> {
    const key = this.parseKey(message.key);
    const value = this.parseValue(message.value);

    if (value == null) {
      this.logger.debug(`Skip null/tombstone on ${topic} [${partition}]`);
      return;
    }

    const handled = await this.router.route(topic, key, value);
    if (!handled) {
      this.logger.debug(`No handler for topic: ${topic}`);
    }
  }

  // -------------------------
  // helpers
  // -------------------------
  private normalizePrefix(p: string): string {
    if (!p) return '';
    return p.endsWith('.') ? p : `${p}.`;
  }

  private escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  private nextBackoffMs(): number {
    const attempt = Math.min(this.restartAttempt++, 10);
    const base = Math.min(this.restartBaseMs * Math.pow(2, attempt), this.restartMaxMs);
    const jitter = base * (Math.random() * 0.4 - 0.2);
    return Math.max(250, Math.floor(base + jitter));
  }

  private numFromEnv(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : fallback;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
