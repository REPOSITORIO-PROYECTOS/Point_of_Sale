import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogoStorageService } from './logo-storage.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ThemeSettingsEntity } from './theme-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThemeSettingsEntity])],
  controllers: [SettingsController],
  providers: [SettingsService, LogoStorageService],
  exports: [SettingsService],
})
export class SettingsModule {}