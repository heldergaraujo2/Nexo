import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CargoController } from './cargo.controller';
import { CargoService } from './cargo.service';

@Module({ imports: [AuthModule], controllers: [CargoController], providers: [CargoService], exports: [CargoService] })
export class CargoModule {}
