import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthApplication } from './applications/health.application';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [HealthApplication],
  controllers: [],
  exports: [HealthApplication],
})
export class HealthModule { }
