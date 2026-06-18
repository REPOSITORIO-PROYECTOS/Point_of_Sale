import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class IssueAfipInvoiceDto {
  @ApiProperty({ example: 6, description: 'Tipo comprobante AFIP (ej. 6 = Factura B)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipo_afip!: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  punto_venta?: number;

  @ApiProperty({ example: 99, description: 'Tipo documento comprador (99 = consumidor final)' })
  @Type(() => Number)
  @IsInt()
  tipo_documento!: number;

  @ApiProperty({ example: '0' })
  @IsString()
  documento!: string;

  @ApiProperty({ example: 1210.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total!: number;

  @ApiProperty({ example: 5, description: 'Condición IVA del comprador' })
  @Type(() => Number)
  @IsInt()
  id_condicion_iva!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  neto?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  iva?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  neto105?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  iva105?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  asociado_tipo_afip?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  asociado_punto_venta?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  asociado_numero_comprobante?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  asociado_fecha_comprobante?: string;
}
