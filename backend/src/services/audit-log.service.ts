import { Injectable, Logger } from '@nestjs/common';
@Injectable()
export class AuditLogService { private readonly logger=new Logger(AuditLogService.name); record(entry: Record<string, unknown>) { this.logger.log(JSON.stringify({ ...entry, timestamp: new Date().toISOString() })); return entry; } }
