import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { FeatureApplication } from './applications/feature.application';
import { TransformFeatureLocationUseCase } from './usecases/transformer/transform-feature-location.use-case';
import { TransformFeatureReviewUseCase } from './usecases/transformer/transform-feature-review.use-case';
import { TransformFeaturesUseCase } from './usecases/transformer/transform-features.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    FeatureApplication,

    TransformFeaturesUseCase,
    TransformFeatureLocationUseCase,
    TransformFeatureReviewUseCase
  ],
  exports: [
    FeatureApplication,

    TransformFeaturesUseCase,
    TransformFeatureLocationUseCase,
    TransformFeatureReviewUseCase
  ],
})
export class FeatureModule { }
