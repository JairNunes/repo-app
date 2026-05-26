import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreatePartDto {
  @ApiProperty({ example: 'Engine Oil 5W30' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stockQuantity: number;
}
