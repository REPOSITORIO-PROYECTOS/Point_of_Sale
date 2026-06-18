import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import type { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SetupAdminDto } from './dto/setup-admin.dto';

type AuthenticatedRequest = Request & { user?: AuthUser };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('setup-status')
  @PublicRoute()
  setupStatus() {
    return this.authService.getSetupStatus();
  }

  @Post('setup')
  @PublicRoute()
  setup(@Body() payload: SetupAdminDto) {
    return this.authService.setupAdmin(payload);
  }

  @Post('login')
  @PublicRoute()
  login(@Body() payload: LoginDto, @Req() request: AuthenticatedRequest) {
    const clientIp = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    return this.authService.login(payload, clientIp);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.profile(request.user!);
  }
}
