import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'ID of the expired API key to rollover',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  expired_key_id: string;

  @ApiProperty({
    description: 'New expiry duration for the rolled over key',
    example: '1H',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsEnum(['1H', '1D', '1M', '1Y'])
  expiry: '1H' | '1D' | '1M' | '1Y';
}