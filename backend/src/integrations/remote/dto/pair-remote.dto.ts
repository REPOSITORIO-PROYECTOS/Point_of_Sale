import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PairRemoteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(12)
  pairingCode!: string;
}
