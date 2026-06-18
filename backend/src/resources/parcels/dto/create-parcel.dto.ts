import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PARCEL_STATUSES } from '../parcel.entity';

export class CreateParcelDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @Type(() => Number)
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ enum: PARCEL_STATUSES })
  @IsOptional()
  @IsIn(PARCEL_STATUSES)
  status?: (typeof PARCEL_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;
}
