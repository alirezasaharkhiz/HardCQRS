import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { CompetitionApplication } from './applications/competition.application';
import { TransformCompetitionsUseCase } from './usecases/transformer/transform-competitions.use-case';
import {TransformCompetesUseCase} from "./usecases/transformer/transform-competes.use-case";

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    CompetitionApplication,
    TransformCompetitionsUseCase,
    TransformCompetesUseCase,
  ],
  exports: [
    CompetitionApplication,
    TransformCompetitionsUseCase,
    TransformCompetesUseCase
  ],
})
export class CompetitionModule { }
