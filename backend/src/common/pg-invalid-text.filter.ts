import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Converts PostgreSQL "invalid input syntax" errors (SQLSTATE 22P02 — e.g. a
 * non-UUID string used as a UUID) into HTTP 400 instead of leaking a 500.
 * Registered globally via APP_FILTER, so it applies to the real server and to
 * the integration tests alike. Param-level ParseUUIDPipe validates path params
 * up front; this filter is the backstop for every other request input.
 */
@Catch()
export class PgInvalidTextRepresentationFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const code = (exception as { code?: string } | null | undefined)?.code;

    if (code === '22P02') {
      const bad = new BadRequestLike();
      res.status(bad.status).json(bad.body);
      return;
    }
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
}

class BadRequestLike {
  readonly status = HttpStatus.BAD_REQUEST;
  readonly body = {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Invalid identifier format in request',
    error: 'Bad Request',
  };
}
