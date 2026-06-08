import { Injectable, Logger } from '@nestjs/common';
@Injectable()
export class EnhancedLoggerService { private readonly logger=new Logger('PointOfSaleBackend'); log(message: string, context?: string) { this.logger.log(message, context); } }
