import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_ROUTE } from '@/decorators/public-routes.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [context.getHandler(), context.getClass()]) ?? true;
  }
}

