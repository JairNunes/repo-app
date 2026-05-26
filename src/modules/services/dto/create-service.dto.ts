import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Oil Change' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  priceCents: number;
}
