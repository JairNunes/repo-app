import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateServiceDto {
  @ApiProperty({ example: 'Oil Change Premium', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 20000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceCents?: number;
}
