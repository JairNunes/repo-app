import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateStatusExternalDto {
  @ApiProperty({
    example: 'approve',
    enum: ['approve', 'reject', 'start-diagnosis', 'finalize', 'deliver'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['approve', 'reject', 'start-diagnosis', 'finalize', 'deliver'])
  action: string;

  @ApiProperty({
    example: 'email',
    description: 'Source of the status update (e.g., email, webhook, sms)',
  })
  @IsString()
  @IsNotEmpty()
  source: string;
}
