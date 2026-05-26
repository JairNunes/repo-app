import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateVehicleDto {
  @ApiProperty({ example: 'Toyota', required: false })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiProperty({ example: 'Corolla', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: 2020, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;
}
