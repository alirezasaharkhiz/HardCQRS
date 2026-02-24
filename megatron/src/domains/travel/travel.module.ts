import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LocationTravelogueSqlRepository } from './repositories/sql/location-travelogue.sql.repository';
import { TravelogueSqlRepository } from './repositories/sql/travelogue.sql.repository';
import { TravelApplication } from './applications/travel.application';
import { TransformLocationTravelogueUseCase } from './usecases/transformer/transform-location-travelogue.use-case';
import { TransformTraveloguesUseCase } from './usecases/transformer/transform-travelogues.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    LocationTravelogueSqlRepository,
    TravelogueSqlRepository,

    TravelApplication,

    TransformLocationTravelogueUseCase,
    TransformTraveloguesUseCase,
  ],
  exports: [
    LocationTravelogueSqlRepository,
    TravelogueSqlRepository,

    TravelApplication,

    TransformLocationTravelogueUseCase,
    TransformTraveloguesUseCase
  ],
})
export class TravelModule { }
