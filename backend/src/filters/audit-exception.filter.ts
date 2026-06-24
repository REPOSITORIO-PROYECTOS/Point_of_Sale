import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { AuditLogService } from '@/services/audit-log.service';

@Catch()
export class AuditExceptionFilter implements ExceptionFilter {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const auditMessage =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? body.message
            : exception.message;

      this.auditLogService.record({
        action: 'exception',
        path: request.url,
        status,
        message: auditMessage,
      });

      const payload =
        typeof body === 'string'
          ? { statusCode: status, message: body, path: request.url }
          : typeof body === 'object' && body !== null
            ? { ...body, path: request.url }
            : { statusCode: status, message: exception.message, path: request.url };

      response.status(status).json(payload);
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'Unexpected error';
    this.auditLogService.record({ action: 'exception', path: request.url, status, message });
    response.status(status).json({ statusCode: status, message, path: request.url });
  }
}

