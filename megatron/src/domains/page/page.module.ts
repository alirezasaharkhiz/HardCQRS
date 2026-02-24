import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { PageApplication } from './applications/page.application';
import { TransformLandingPagesUseCase } from './usecases/transformer/transform-landingpages.use-case';
import { TransformPagesUseCase } from './usecases/transformer/transform-pages.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    PageApplication,

    TransformLandingPagesUseCase,
    TransformPagesUseCase
  ],
  exports: [
    PageApplication,

    TransformLandingPagesUseCase,
    TransformPagesUseCase
  ],
})
export class PageModule { }
