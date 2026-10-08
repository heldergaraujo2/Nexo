import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      provide: Pool,
      useFactory: () =>
        new Pool({
          connectionString: process.env.DATABASE_URL,
          max: Number(process.env.DB_POOL_MAX ?? 10),
          min: Number(process.env.DB_POOL_MIN ?? 0),
          idleTimeoutMillis: Number(
            process.env.DB_IDLE_TIMEOUT_MS ?? 30000,
          ),
          connectionTimeoutMillis: Number(
            process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000,
          ),
        }),
    },
  ],
  exports: [Pool],
})
export class DatabaseModule {}
