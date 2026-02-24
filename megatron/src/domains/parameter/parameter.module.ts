import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LocationParameterSqlRepository } from './repositories/sql/location-parameter.sql.repository';
import { ParameterSqlRepository } from './repositories/sql/parameter.sql.repository';
import { ParameterApplication } from './applications/parameter.application';
import { TransformLocationParameterUseCase } from './usecases/transformer/transform-location-parameter.use-case';
import { TransformParameterReviewUseCase } from './usecases/transformer/transform-parameter-review.use-case';
import { TransformParametersUseCase } from './usecases/transformer/transform-parameters.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    LocationParameterSqlRepository,
    ParameterSqlRepository,

    ParameterApplication,

    TransformLocationParameterUseCase,
    TransformParameterReviewUseCase,
    TransformParametersUseCase,
  ],
  exports: [
    LocationParameterSqlRepository,
    ParameterSqlRepository,

    ParameterApplication,

    TransformLocationParameterUseCase,
    TransformParameterReviewUseCase,
    TransformParametersUseCase,
  ],
})
export class ParameterModule { }
