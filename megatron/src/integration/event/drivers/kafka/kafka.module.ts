import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { KafkaConsumerApplication } from './kafka-consumer.application';
import { KafkaProducerApplication } from './kafka-producer.application';
import { KafkaTopicRouterApplication } from './kafka-topic-router.application';
import { TopicDiscoveryApplication } from '../../topic-discovery.application';

@Module({
  imports: [DiscoveryModule],
  providers: [
    KafkaConsumerApplication,
    KafkaProducerApplication,
    KafkaTopicRouterApplication,
    TopicDiscoveryApplication,
  ],
  exports: [
    KafkaConsumerApplication,
    KafkaProducerApplication,
    KafkaTopicRouterApplication,
    TopicDiscoveryApplication,
  ],
})
export class KafkaTopicRouterModule { }
