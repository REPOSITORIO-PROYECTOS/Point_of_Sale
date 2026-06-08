import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { EnhancedLoggerService } from '@/services/enhanced-logger.service';

@Injectable()
export class ControllerLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: EnhancedLoggerService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(`${request.method} ${request.url}`, 'HTTP');
    return next.handle().pipe(tap(() => this.logger.log(`Completed ${request.method} ${request.url}`, 'HTTP')));
  }
}

