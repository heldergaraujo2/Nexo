import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS + Vitest: esbuild alone does not emit decorator metadata, so
 * ValidationPipe cannot see DTO classes at runtime. unplugin-swc compiles the
 * specs with the same decorator semantics as the real tsc build (main.ts), so
 * request validation behaves identically in tests and in the server.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    hookTimeout: 120_000,
    testTimeout: 120_000,
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
