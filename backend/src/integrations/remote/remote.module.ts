import { Module } from '@nestjs/common';
import { RemoteAgentController } from './remote.controller';
import { RemoteAgentService } from './remote.service';

@Module({
  controllers: [RemoteAgentController],
  providers: [RemoteAgentService],
  exports: [RemoteAgentService],
})
export class RemoteAgentModule {}
