import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
  ApiBody,
  ApiSecurity // Add this import
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { ApiKeyPermission } from '../../entities/api-key.entity';
import { PaystackService } from '../paystack/paystack.service';

@ApiTags('💰 Wallet')
@ApiBearerAuth('JWT-auth')
@ApiSecurity('API-Key') // Changed from @ApiBearerAuth('API-Key-auth')
@Controller('wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private paystackService: PaystackService,
  ) {}

  @Get('balance')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.READ)
  @ApiOperation({ 
    summary: '💵 Get wallet balance',
    description: `
**Returns the current wallet balance**

### Authentication:
- JWT token OR
- API Key with "read" permission

### Response includes:
- Current balance in Naira (₦)
- Wallet number
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Balance retrieved successfully',
    schema: {
      example: {
        balance: '15000.00',
        walletNumber: '1234567890'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized - Authentication required' 
  })
  @ApiResponse({ 
    status: 403, 
    description: '🚫 Forbidden - Insufficient permissions' 
  })
  async getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user);
  }

  @Post('deposit')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.DEPOSIT)
  @ApiOperation({ 
    summary: '💳 Initiate deposit',
    description: `
**Initiates a deposit transaction via Paystack**

### Process:
1. Submit amount to deposit
2. Get Paystack payment URL
3. Complete payment in browser
4. Wallet auto-credits via webhook

### Test Card Details:
- **Card:** 4084084084084081
- **CVV:** 408
- **Expiry:** 12/25 (any future date)
- **PIN:** 0000
- **OTP:** 123456

### Authentication:
- JWT token OR
- API Key with "deposit" permission

### Minimum: ₦100
    `
  })
  @ApiBody({ type: DepositDto })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Deposit initiated successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Deposit initiated successfully',
        authorization_url: 'https://checkout.paystack.com/abc123def456',
        reference: 'TXN_1733779200_abc123',
        amount: 5000
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Invalid amount (less than ₦100)' 
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: '🚫 Insufficient permissions' 
  })
  async deposit(@CurrentUser() user: User, @Body() depositDto: DepositDto) {
    return this.walletService.initiateDeposit(user, depositDto);
  }

  @Post('transfer')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.TRANSFER)
  @ApiOperation({ 
    summary: '💸 Transfer funds',
    description: `
**Transfer money from your wallet to another wallet**

### Validations:
- ✅ Sufficient balance
- ✅ Valid recipient wallet number
- ✅ Minimum amount: ₦100
- ✅ Cannot transfer to self

### Authentication:
- JWT token OR
- API Key with "transfer" permission

### Process:
1. Validates recipient wallet exists
2. Checks sufficient balance
3. Deducts from sender
4. Credits receiver
5. Records transaction
    `
  })
  @ApiBody({ type: TransferDto })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Transfer successful',
    schema: {
      example: {
        status: 'success',
        message: 'Transfer successful',
        transaction: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          reference: 'TXN_TRANSFER_1733779200',
          amount: '1000.00',
          type: 'transfer',
          status: 'success',
          recipientWalletNumber: '0987654321',
          createdAt: '2024-12-09T12:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Insufficient balance or invalid wallet' 
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: '🚫 Insufficient permissions' 
  })
  async transfer(@CurrentUser() user: User, @Body() transferDto: TransferDto) {
    return this.walletService.transfer(user, transferDto);
  }

  @Get('transactions')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.READ)
  @ApiOperation({ 
    summary: '📊 Get transaction history',
    description: `
**Returns all transactions for your wallet**

### Includes:
- Deposits
- Transfers (sent and received)
- Transaction status
- Timestamps
- References

### Authentication:
- JWT token OR
- API Key with "read" permission
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Transactions retrieved successfully',
    schema: {
      example: {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            reference: 'TXN_1733779200',
            amount: '5000.00',
            type: 'deposit',
            status: 'success',
            createdAt: '2024-12-09T12:00:00.000Z'
          },
          {
            id: '987e6543-e21b-98d7-a654-321098765432',
            reference: 'TXN_TRANSFER_1733779300',
            amount: '1000.00',
            type: 'transfer',
            status: 'success',
            recipientWalletNumber: '0987654321',
            createdAt: '2024-12-09T13:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '🔒 Unauthorized' 
  })
  async getTransactions(@CurrentUser() user: User) {
    return this.walletService.getTransactions(user);
  }

  @Get('deposit/:reference/status')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.READ)
  @ApiOperation({ 
    summary: '🔍 Check deposit status',
    description: `
**Checks the status of a deposit transaction**

### Possible statuses:
- **pending** - Payment not yet completed
- **success** - Payment successful, wallet credited
- **failed** - Payment failed

### Use cases:
- Poll for payment completion
- Verify payment status
- Debug failed payments
    `
  })
  @ApiParam({ 
    name: 'reference', 
    description: 'Transaction reference (from deposit response)',
    example: 'TXN_1733779200_abc123',
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Status retrieved',
    schema: {
      example: {
        reference: 'TXN_1733779200_abc123',
        status: 'success',
        amount: '5000.00',
        createdAt: '2024-12-09T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '❌ Transaction not found' 
  })
  async getDepositStatus(
    @CurrentUser() user: User,
    @Param('reference') reference: string,
  ) {
    return this.walletService.getDepositStatus(user, reference);
  }

  @Post('paystack/webhook')
  @ApiExcludeEndpoint()
  async paystackWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      throw new BadRequestException('Missing Paystack signature');
    }

    const rawBody = JSON.stringify(req.body);
    const isValid = this.paystackService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      throw new BadRequestException('Invalid Paystack signature');
    }

    await this.walletService.handlePaystackWebhook(req.body);
    return { status: true };
  }
}