import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { AgencySqlRepository } from './repositories/sql/agency.sql.repository';
import { AgencyApplication } from './applications/agency.application';
import { TransformAgenciesUseCase } from './usecases/transformer/transform-agencies.use-case';



@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    AgencySqlRepository,
    AgencyApplication,
    TransformAgenciesUseCase,
  ],
  exports: [
    AgencySqlRepository,
    AgencyApplication,
    TransformAgenciesUseCase,
  ],
})
export class AgencyModule { }
