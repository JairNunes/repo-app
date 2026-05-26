import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdatePartDto {
  @ApiProperty({ example: 'Engine Oil 5W30 Premium', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 6000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceCents?: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;
}
