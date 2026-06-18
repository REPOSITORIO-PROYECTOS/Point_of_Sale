import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_LICENSE_EXEMPT } from '@/decorators/license-exempt.decorator';
import { IS_PUBLIC_ROUTE } from '@/decorators/public-routes.decorator';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isLicenseExempt = this.reflector.getAllAndOverride<boolean>(IS_LICENSE_EXEMPT, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isLicenseExempt) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const status = await this.licenseService.getStatus();
    if (status.allowed) {
      return true;
    }

    throw new HttpException(
      {
        statusCode: 402,
        code: 'LICENSE_INVALID',
        message: status.message ?? 'Licencia inválida o vencida',
        licenseStatus: status.status,
      },
      402,
    );
  }
}
