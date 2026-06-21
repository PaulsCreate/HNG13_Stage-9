import { IsString, IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyPermission } from '../../../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name of the API key for identification',
    example: 'mobile-app',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Array of permissions for the API key',
    example: ['deposit', 'transfer', 'read'],
    enum: ApiKeyPermission,
    isArray: true,
    minItems: 1,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ApiKeyPermission, { each: true })
  permissions: ApiKeyPermission[];

  @ApiProperty({
    description: 'Expiry duration for the API key',
    example: '1H',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsEnum(['1H', '1D', '1M', '1Y'])
  expiry: '1H' | '1D' | '1M' | '1Y';
}
