import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@/decorators/roles.decorator';
import { PairRemoteDto } from './dto/pair-remote.dto';
import { RemoteAgentService } from './remote.service';

@ApiTags('integrations-remote')
@Controller('remote')
@Roles('admin')
export class RemoteAgentController {
  constructor(private readonly remoteAgentService: RemoteAgentService) {}

  @Get('status')
  getStatus() {
    return this.remoteAgentService.getStatus();
  }

  @Get('config')
  getConfig() {
    return this.remoteAgentService.getConfig();
  }

  @Post('pair')
  pair(@Body() payload: PairRemoteDto) {
    return this.remoteAgentService.pair(payload.pairingCode);
  }
}
