import 'reflect-metadata';

export const KAFKA_TOPICS_METADATA = Symbol('kafka:topics');

/**
 * Class decorator for mapping a provider to one or more bare Kafka topics.
 *
 * Usage:
 *   @TopicHandler('posts')
 *   @Injectable()
 *   export class PostsUseCase {
 *     async execute(key: string | null, value: any) { ... }
 *   }
 */
export function TopicHandler(topicOrTopics: string | string[]): ClassDecorator {
  const topics = Array.isArray(topicOrTopics) ? topicOrTopics : [topicOrTopics];
  return (target: any) => {
    Reflect.defineMetadata(KAFKA_TOPICS_METADATA, topics, target);
  };
}

export function getKafkaTopics(target: any): string[] {
  try {
    return Reflect.getMetadata(KAFKA_TOPICS_METADATA, target) || [];
  } catch {
    return [];
  }
}

