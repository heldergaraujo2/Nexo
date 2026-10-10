import {
  Controller,
  Get,
  Inject,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseModule } from '../database/database.module';

const DB_CHECK_TIMEOUT_MS = 2000;

/**
 * Liveness + dependency health. GET /health answers 200 {status:'ok', database:'up'}
 * only after a real `SELECT 1` round-trip; a failing or hanging pool answers 503
 * {status:'degraded'} within DB_CHECK_TIMEOUT_MS so monitoring never blocks.
 * Error details are NOT echoed back (they may contain host/user internals).
 */
@Controller('health')
class HealthController {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  @Get()
  async getHealth(): Promise<{ status: 'ok'; database: 'up' }> {
    const timeout = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), DB_CHECK_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([
        this.db.query('SELECT 1 AS ok'),
        timeout,
      ]);
      if (result === 'timeout') {
        throw new ServiceUnavailableException({
          statusCode: 503,
          message: 'degraded',
          error: 'database timeout',
        });
      }
      return { status: 'ok', database: 'up' };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'degraded',
        error: 'database unavailable',
      });
    }
  }
}

@Module({ imports: [DatabaseModule], controllers: [HealthController] })
export class HealthModule {}
