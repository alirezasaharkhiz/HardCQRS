import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { BulletinApplication } from './applications/bulletin.application';
import { TransformBulletinsUseCase } from './usecases/transformer/transform-bulletins.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    BulletinApplication,
    TransformBulletinsUseCase
  ],
  exports: [
    BulletinApplication,
    TransformBulletinsUseCase
  ],
})
export class BulletinModule { }
