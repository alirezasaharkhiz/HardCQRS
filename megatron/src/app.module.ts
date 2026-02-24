import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseMysqlModule } from './database/database.mysql.module';
import { HealthController } from './integration/http/controllers/health.controller';
import { KafkaTopicRouterModule } from "./integration/event/drivers/kafka/kafka.module";
import { EventModule } from "./integration/event/event.module";
import { PrometheusController } from './integration/http/controllers/prometheus.controller';
import { AdsModule } from './domains/ad/ads.module';
import { HealthModule } from './domains/health/health.module';
import { AgencyModule } from './domains/agency/agency.module';
import { AirlineModule } from './domains/airline/airline.module';
import { AirportModule } from './domains/airport/airport.module';
import { AttractionModule } from './domains/attraction/attraction.module';
import { BadgeModule } from './domains/badge/badge.module';
import { BulletinModule } from './domains/bulletin/bulletin.module';
import { CategoryModule } from './domains/category/category.module';
import { ChainModule } from './domains/chain/chain.module';
import { CommentModule } from './domains/comment/comment.module';
import { CompetitionModule } from './domains/competition/competition.module';
import { FacilityModule } from './domains/facility/facility.module';
import { FaqModule } from './domains/faq/faq.module';
import { FeatureModule } from './domains/feature/feature.module';
import { HotelModule } from './domains/hotel/hotel.module';
import { IgnoreModule } from './domains/ignore/ignore.module';
import { LabelModule } from './domains/label/label.module';
import { LikeModule } from './domains/like/like.module';
import { ListModule } from './domains/list/list.module';
import { LocationModule } from './domains/location/location.module';
import { MediaModule } from './domains/media/media.module';
import { PageModule } from './domains/page/page.module';
import { ParameterModule } from './domains/parameter/parameter.module';
import { PostModule } from './domains/post/post.module';
import { RestaurantModule } from './domains/restaurant/restaurant.module';
import { ReviewModule } from './domains/review/review.module';
import { SettingModule } from './domains/setting/setting.module';
import { SpotModule } from './domains/spot/spot.module';
import { TourModule } from './domains/tour/tour.module';
import { TravelModule } from './domains/travel/travel.module';
import { UserModule } from './domains/user/user.module';
import { UtilityModule } from './domains/utility/utility.module';
import { VideoModule } from './domains/video/video.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseMysqlModule,
    KafkaTopicRouterModule,
    EventModule,

    //domains
    AdsModule,
    AgencyModule,
    AirlineModule,
    AirportModule,
    AttractionModule,
    BadgeModule,
    BulletinModule,
    CategoryModule,
    ChainModule,
    CommentModule,
    CompetitionModule,
    FacilityModule,
    FaqModule,
    FeatureModule,
    HealthModule,
    HotelModule,
    IgnoreModule,
    LabelModule,
    LikeModule,
    ListModule,
    LocationModule,
    MediaModule,
    PageModule,
    ParameterModule,
    PostModule,
    RestaurantModule,
    ReviewModule,
    SettingModule,
    SpotModule,
    TourModule,
    TravelModule,
    UserModule,
    UtilityModule,
    VideoModule,
  ],
  controllers: [HealthController, PrometheusController],
})
export class AppModule { }
