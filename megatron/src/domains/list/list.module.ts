import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { ListApplication } from './applications/list.application';
import { TransformListablesUseCase } from './usecases/transformer/transform-listables.use-case';
import { TransformListingsUseCase } from './usecases/transformer/transform-listings.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    ListApplication,

    TransformListingsUseCase,
    TransformListablesUseCase,
  ],
  exports: [
    ListApplication,

    TransformListingsUseCase,
    TransformListablesUseCase,
  ],
})
export class ListModule { }
