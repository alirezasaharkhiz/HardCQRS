import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { KafkaConsumerApplication } from './drivers/kafka/kafka-consumer.application';
import { KafkaTopicRouterApplication } from './drivers/kafka/kafka-topic-router.application';
import { TopicDiscoveryApplication } from './topic-discovery.application';

@Module({
  imports: [ConfigModule, DiscoveryModule],
  providers: [
    TopicDiscoveryApplication,
    KafkaTopicRouterApplication,
    KafkaConsumerApplication,
  ],
  exports: [KafkaConsumerApplication],
})
export class EventModule {}
