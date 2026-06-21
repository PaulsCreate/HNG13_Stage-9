import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiBody 
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

@ApiTags('🔑 API Keys')
@ApiBearerAuth('JWT-auth')
@Controller('keys')
@UseGuards(AuthGuard)
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post('create')
  @ApiOperation({ 
    summary: '🔨 Create new API key',
    description: `
**Creates a new API key with custom permissions and expiry**

### Permissions:
- **read** - View wallet balance and transactions
- **deposit** - Initiate deposits (includes read)
- **transfer** - Transfer funds (includes read)

### Expiry Options:
- **1H** - 1 hour
- **1D** - 1 day
- **1M** - 1 month    
- **1Y** - 1 year

### Important:
⚠️ The API key is only shown once! Save it securely.

### Use Cases:
- Mobile app integration
- Third-party service access
- Automated payment systems
    `
  })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({ 
    status: 201, 
    description: '✅ API key created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'mobile-app',
        key: 'wsk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
        permissions: ['deposit', 'transfer', 'read'],
        expiresAt: '2025-06-09T12:00:00.000Z',
        createdAt: '2024-12-09T12:00:00.000Z',
        isActive: true
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized - JWT token required' 
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Bad Request - Invalid input data' 
  })
  async createApiKey(
    @CurrentUser() user: User,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.createApiKey(user, createApiKeyDto);
  }

  @Post('rollover')
  @ApiOperation({ 
    summary: '🔄 Rollover expired API key',
    description: `
**Generates a new API key while maintaining the same permissions**

### When to use:
- Your API key has expired
- Need to rotate keys for security
- Want to extend key validity

### Process:
1. Provide the expired key ID
2. Choose new expiry duration
3. Get a fresh API key with same permissions

⚠️ The old key will be permanently revoked
    `
  })
  @ApiBody({ type: RolloverApiKeyDto })
  @ApiResponse({ 
    status: 200, 
    description: '✅ API key rolled over successfully',
    schema: {
      example: {
        id: '987e6543-e21b-98d7-a654-321098765432',
        name: 'mobile-app',
        key: 'wsk_live_new123key456here789xyz',
        permissions: ['deposit', 'transfer', 'read'],
        expiresAt: '2026-06-09T12:00:00.000Z',
        createdAt: '2024-12-10T12:00:00.000Z',
        isActive: true
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '❌ API key not found or not owned by user' 
  })
  async rolloverApiKey(
    @CurrentUser() user: User,
    @Body() rolloverDto: RolloverApiKeyDto,
  ) {
    return this.apiKeysService.rolloverApiKey(user, rolloverDto);
  }

  @Get()
  @ApiOperation({ 
    summary: '📋 List all API keys',
    description: `
**Returns all API keys for the authenticated user**

### Response includes:
- Key ID and name
- Permissions
- Active status
- Creation and expiry dates
- Last used timestamp

⚠️ The actual key value is NOT returned (security)
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ API keys retrieved successfully',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'mobile-app',
          permissions: ['deposit', 'transfer', 'read'],
          isActive: true,
          expiresAt: '2025-06-09T12:00:00.000Z',
          lastUsedAt: '2024-12-09T15:30:00.000Z',
          createdAt: '2024-12-09T12:00:00.000Z'
        },
        {
          id: '987e6543-e21b-98d7-a654-321098765432',
          name: 'web-dashboard',
          permissions: ['read'],
          isActive: true,
          expiresAt: '2025-03-09T12:00:00.000Z',
          lastUsedAt: null,
          createdAt: '2024-12-08T10:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized' 
  })
  async listApiKeys(@CurrentUser() user: User) {
    return this.apiKeysService.listApiKeys(user);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: '🗑️ Revoke API key',
    description: `
**Permanently revokes an API key**

### What happens:
- Key becomes immediately invalid
- All requests using this key will fail
- Action cannot be undone

### Use cases:
- Key compromised
- No longer needed
- Security policy requirement

⚠️ This action is permanent and cannot be reversed!
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'API Key ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ API key revoked successfully',
    schema: {
      example: {
        message: 'API key revoked successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '❌ API key not found' 
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized' 
  })
  async revokeApiKey(@CurrentUser() user: User, @Param('id') keyId: string) {
    await this.apiKeysService.revokeApiKey(user, keyId);
    return { message: 'API key revoked successfully' };
  }
}
