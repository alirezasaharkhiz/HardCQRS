import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { AirlineSqlRepository } from './repositories/sql/airline.sql.repository';
import { AirlineApplication } from './applications/airline.application';
import { TransformAirlinesUseCase } from './usecases/transformer/transform-airlines.use-case';




@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    AirlineSqlRepository,
    AirlineApplication,
    TransformAirlinesUseCase,
  ],
  exports: [
    AirlineSqlRepository,
    AirlineApplication,
    TransformAirlinesUseCase,
  ],
})
export class AirlineModule { }
