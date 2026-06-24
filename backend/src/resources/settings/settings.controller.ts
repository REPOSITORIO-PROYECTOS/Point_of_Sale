import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicRoute } from '../../decorators/public-routes.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { UploadThemeLogoDto } from './dto/upload-theme-logo.dto';
import { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import { MAX_LOGO_BYTES } from './logo-storage.service';
import { SettingsService } from './settings.service';

type UploadedLogoFile = {
  buffer: Buffer;
  mimetype: string;
};

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @PublicRoute()
  @Get('theme')
  getTheme() {
    return this.service.getTheme();
  }

  @Put('theme')
  updateTheme(@Body() payload: UpdateThemeSettingsDto) {
    return this.service.updateTheme(payload);
  }

  @PublicRoute()
  @Get('theme/logo')
  async getLogo(@Res() res: Response) {
    const logo = this.service.getLogoFile();
    res.setHeader('Content-Type', logo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(logo.buffer);
  }

  @Post('theme/logo')
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_LOGO_BYTES },
    }),
  )
  uploadLogo(
    @UploadedFile() file: UploadedLogoFile | undefined,
    @Body() payload: UploadThemeLogoDto,
  ) {
    if (file?.buffer?.length) {
      return this.service.uploadLogoFromBuffer(file.buffer, file.mimetype);
    }

    if (payload.imageBase64) {
      return this.service.uploadLogoFromBase64(payload.imageBase64);
    }

    throw new BadRequestException('Envíe un archivo (file) o imageBase64.');
  }

  @Delete('theme/logo')
  deleteLogo() {
    return this.service.deleteLogo();
  }

  @Get('business')
  getBusiness() {
    return this.service.getBusiness();
  }

  @Put('business')
  @Roles('admin')
  updateBusiness(@Body() payload: UpdateBusinessSettingsDto) {
    return this.service.updateBusiness(payload);
  }
}
