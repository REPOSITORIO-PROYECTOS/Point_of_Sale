import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Max, Min } from 'class-validator';

export class UpdateAfipBillingDefaultsDto {
  @ApiProperty({ example: 6, description: 'Tipo comprobante por defecto (6 = Factura B)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipoAfip!: number;

  @ApiProperty({ example: 99, description: 'Tipo documento comprador por defecto' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipoDocumento!: number;

  @ApiProperty({ example: '0' })
  @IsString()
  documento!: string;

  @ApiProperty({ example: 5, description: 'Condición IVA del comprador por defecto' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCondicionIva!: number;

  @ApiProperty({ example: 21, description: 'Alícuota IVA por defecto para desglose (%)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ivaRatePercent!: number;
}
