import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import type { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

type AuthenticatedRequest = Request & { user?: AuthUser };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @PublicRoute()
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.profile(request.user!);
  }
}
