import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { AttractionAttractionTypeSqlRepository } from './repositories/sql/attraction-attraction-type.sql.repository';
import { AttractionSqlRepository } from './repositories/sql/attraction.sql.repository';
import { UtilityAttractionSqlRepository } from './repositories/sql/utility-attraction.sql.repository';
import { AttractionApplication } from './applications/attraction.application';
import { TransformAttractionAttractionTypeUseCase } from './usecases/transformer/transform-attraction-attraction-type.use-case';
import { TransformAttractionUtilityUseCase } from './usecases/transformer/transform-attraction-utility.use-case';
import { TransformAttractionsUseCase } from './usecases/transformer/transform-attractions.use-case';
import { TransformAttractionTypesUseCase } from './usecases/transformer/transform-attraction-types.use-case';
import { SpotRankSqlRepository } from '../spot/repositories/sql/spot-rank.sql.repository';
// import { SpotModule } from '../spot/spot.module';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    // SpotModule,
  ],
  providers: [
    AttractionAttractionTypeSqlRepository,
    AttractionSqlRepository,
    UtilityAttractionSqlRepository,
    SpotRankSqlRepository,

    AttractionApplication,

    TransformAttractionAttractionTypeUseCase,
    TransformAttractionUtilityUseCase,
    TransformAttractionsUseCase,
    TransformAttractionTypesUseCase
  ],
  exports: [
    AttractionAttractionTypeSqlRepository,
    AttractionSqlRepository,
    UtilityAttractionSqlRepository,

    AttractionApplication,

    TransformAttractionAttractionTypeUseCase,
    TransformAttractionUtilityUseCase,
    TransformAttractionsUseCase,
    TransformAttractionTypesUseCase
  ],
})
export class AttractionModule { }
