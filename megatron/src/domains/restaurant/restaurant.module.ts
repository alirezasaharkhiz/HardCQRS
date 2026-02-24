import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { FacilityRestaurantSqlRepository } from './repositories/sql/facility-restaurant.sql.repository';
import { RestaurantRestaurantTypeSqlRepository } from './repositories/sql/restaurant-restaurant-type.sql.repository';
import { RestaurantSqlRepository } from './repositories/sql/restaurant.sql.repository';
import { RestaurantApplication } from './applications/restaurant.application';
import { TransformFacilityRestaurantUseCase } from './usecases/transformer/transform-facility-restaurant.use-case';
import { TransformRestaurantRestaurantTypeUseCase } from './usecases/transformer/transform-restaurant-restaurant-type.use-case';
import { TransformRestaurantTypesUseCase } from './usecases/transformer/transform-restaurant-types.use-case';
import { TransformRestaurantsUseCase } from './usecases/transformer/transform-restaurants.use-case';
import { SpotModule } from '../spot/spot.module';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,

    forwardRef(() => SpotModule),
  ],
  providers: [
    FacilityRestaurantSqlRepository,
    RestaurantRestaurantTypeSqlRepository,
    RestaurantSqlRepository,

    RestaurantApplication,

    TransformFacilityRestaurantUseCase,
    TransformRestaurantRestaurantTypeUseCase,
    TransformRestaurantTypesUseCase,
    TransformRestaurantsUseCase
  ],
  exports: [
    FacilityRestaurantSqlRepository,
    RestaurantRestaurantTypeSqlRepository,
    RestaurantSqlRepository,

    RestaurantApplication,

    TransformFacilityRestaurantUseCase,
    TransformRestaurantRestaurantTypeUseCase,
    TransformRestaurantTypesUseCase,
    TransformRestaurantsUseCase
  ],
})
export class RestaurantModule { }
