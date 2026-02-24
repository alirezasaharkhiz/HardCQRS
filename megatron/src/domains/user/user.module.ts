import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { UserApplication } from './applications/user.application';
import { TransformUsersUseCase } from './usecases/transformer/transform-users.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    UserApplication,
    TransformUsersUseCase
  ],
  exports: [
    UserApplication,
    TransformUsersUseCase
  ],
})
export class UserModule { }
