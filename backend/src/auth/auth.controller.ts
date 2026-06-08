import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

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
  me() {
    return this.authService.profile();
  }
}

