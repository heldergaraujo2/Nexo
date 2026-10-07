import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    MediaModule,
  ],
})
export class AppModule {}
