import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    description: 'Amount to deposit in Naira (₦)',
    example: 5000,
    minimum: 100,
    type: Number,
  })
  @IsNumber()
  @Min(100, { message: 'Minimum deposit amount is ₦100' })
  amount: number;
}