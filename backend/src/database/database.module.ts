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
        }),
    },
  ],
  exports: [Pool],
})
export class DatabaseModule {}
