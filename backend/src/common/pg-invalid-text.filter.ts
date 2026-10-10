import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Maps PostgreSQL SQLSTATE errors to clean HTTP responses and guarantees that
 * raw driver errors (constraint violations, invalid input syntax) never leak a
 * stack trace or database internals to the client:
 * - 22P02 (invalid input syntax, e.g. non-UUID used as UUID) -> 400
 * - 23505 (unique_violation) -> 409
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
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid identifier format in request',
        error: 'Bad Request',
      });
      return;
    }
    if (code === '23505') {
      res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: 'Conflict',
      });
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
