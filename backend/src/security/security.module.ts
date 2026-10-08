import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
@Module({
  imports: [AuthModule],
  controllers: [SecurityController],
  providers: [SecurityService],
})
export class SecurityModule {}
