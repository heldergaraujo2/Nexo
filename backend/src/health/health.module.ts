import { Controller, Get, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';

@Controller('health')
class HealthController {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: 'ok'; database: 'ok' }> {
    await this.db.query('SELECT 1');
    return { status: 'ok', database: 'ok' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
