import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { AirportApplication } from './applications/airport.application';
import { TransformAirportsUseCase } from './usecases/trasnformer/transform-airports.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    AirportApplication,
    TransformAirportsUseCase,
  ],
  exports: [
    AirportApplication,
    TransformAirportsUseCase,
  ],
})
export class AirportModule { }
