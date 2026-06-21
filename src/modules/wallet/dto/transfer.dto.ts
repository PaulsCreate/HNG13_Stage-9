import { IsString, IsNumber, Min, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({
    description: 'Recipient wallet number (10 digits)',
    example: '1234567890',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @Length(10, 10, { message: 'Wallet number must be exactly 10 digits' })
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to transfer in Naira (₦)',
    example: 1000,
    minimum: 100,
    type: Number,
  })
  @IsNumber()
  @Min(100, { message: 'Minimum transfer amount is ₦100' })
  amount: number;
}
