import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { CategoryApplication } from './applications/category.application';
import { TransformCategoriesUseCase } from './usecases/transformer/transform-categories.use-case';



@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    CategoryApplication,
    TransformCategoriesUseCase,
  ],
  exports: [
    CategoryApplication,
    TransformCategoriesUseCase,
  ],
})
export class CategoryModule { }
