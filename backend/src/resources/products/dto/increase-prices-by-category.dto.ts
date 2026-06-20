import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class IncreasePricesByCategoryDto {
  @IsString()
  @MinLength(1)
  category!: string;

  @IsNumber()
  @IsPositive()
  percent!: number;
}
