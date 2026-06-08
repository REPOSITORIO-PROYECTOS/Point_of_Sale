import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from '@/services/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(tap(() => this.auditLogService.record({ action: 'request.completed', path: request.url, method: request.method })));
  }
}

