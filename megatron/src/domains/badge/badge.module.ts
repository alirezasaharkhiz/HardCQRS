import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { BadgeApplication } from './applications/badge.application';
import { TransformBadgesUseCase } from './usecases/transformer/transform-badges.use-case';
import { TransformBadgeUserUseCase } from './usecases/transformer/transform-badge-user.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    BadgeApplication,

    TransformBadgesUseCase,
    TransformBadgeUserUseCase,
  ],
  exports: [
    BadgeApplication,

    TransformBadgesUseCase,
    TransformBadgeUserUseCase,
  ],
})
export class BadgeModule { }
