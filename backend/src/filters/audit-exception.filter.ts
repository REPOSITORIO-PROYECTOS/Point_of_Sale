import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { AuditLogService } from '@/services/audit-log.service';

@Catch()
export class AuditExceptionFilter implements ExceptionFilter {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.message : 'Unexpected error';
    this.auditLogService.record({ action: 'exception', path: request.url, status, message });
    response.status(status).json({ statusCode: status, message, path: request.url });
  }
}

