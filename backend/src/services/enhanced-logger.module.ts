import { Global, Module } from '@nestjs/common';
import { EnhancedLoggerService } from './enhanced-logger.service';
@Global() @Module({ providers:[EnhancedLoggerService], exports:[EnhancedLoggerService] }) export class EnhancedLoggerModule {}
