import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { SpotRankSqlRepository } from './repositories/sql/spot-rank.sql.repository';
import { TransformSpotRanksUseCase } from './usecases/transformer/transform-spot-ranks.use-case';
import { HotelModule } from '../hotel/hotel.module';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { LocationModule } from '../location/location.module';
import { AttractionModule } from '../attraction/attraction.module';
import { AgencyModule } from '../agency/agency.module';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,

    forwardRef(() => HotelModule),
    forwardRef(() => RestaurantModule),
    forwardRef(() => LocationModule),
    forwardRef(() => AttractionModule),
    forwardRef(() => AgencyModule),
  ],
  providers: [
    SpotRankSqlRepository,
    TransformSpotRanksUseCase
  ],
  exports: [
    SpotRankSqlRepository,
    TransformSpotRanksUseCase
  ],
})
export class SpotModule { }
