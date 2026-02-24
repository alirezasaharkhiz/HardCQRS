import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { SettingApplication } from './applications/setting.application';
import { TransformSettingsUseCase } from './usecases/transformer/transform-settings.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    SettingApplication,
    TransformSettingsUseCase,
  ],
  exports: [
    SettingApplication,
    TransformSettingsUseCase,
  ],
})
export class SettingModule { }
