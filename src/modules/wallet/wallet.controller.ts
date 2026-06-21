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
  Headers,
  Logger,
  Query,
  Res,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
  ApiBody,
  ApiSecurity
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
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
@ApiSecurity('API-Key')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private walletService: WalletService,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  @Get('balance')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.READ)
  @ApiOperation({ 
    summary: '💵 Get wallet balance',
    description: 'Returns the current wallet balance'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Balance retrieved successfully',
    schema: {
      example: {
        balance: 15000.00,
        walletNumber: '1234567890'
      }
    }
  })
  @ApiResponse({ status: 401, description: '🔒 Unauthorized' })
  @ApiResponse({ status: 403, description: '🚫 Insufficient permissions' })
  async getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user);
  }

  @Post('deposit')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.DEPOSIT)
  @ApiOperation({ 
    summary: '💳 Initiate deposit',
    description: 'Initiates a deposit transaction via Paystack'
  })
  @ApiBody({ type: DepositDto })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Deposit initiated successfully',
    schema: {
      example: {
        reference: 'TXN_1733779200_abc123',
        authorization_url: 'https://checkout.paystack.com/abc123def456'
      }
    }
  })
  @ApiResponse({ status: 400, description: '❌ Invalid amount' })
  @ApiResponse({ status: 401, description: '🔒 Unauthorized' })
  @ApiResponse({ status: 403, description: '🚫 Insufficient permissions' })
  async deposit(@CurrentUser() user: User, @Body() depositDto: DepositDto) {
    return this.walletService.initiateDeposit(user, depositDto);
  }

  @Post('transfer')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.TRANSFER)
  @ApiOperation({ 
    summary: '💸 Transfer funds',
    description: 'Transfer money to another wallet'
  })
  @ApiBody({ type: TransferDto })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Transfer successful',
    schema: {
      example: {
        status: 'success',
        message: 'Transfer completed successfully'
      }
    }
  })
  @ApiResponse({ status: 400, description: '❌ Insufficient balance or invalid wallet' })
  @ApiResponse({ status: 401, description: '🔒 Unauthorized' })
  @ApiResponse({ status: 403, description: '🚫 Insufficient permissions' })
  async transfer(@CurrentUser() user: User, @Body() transferDto: TransferDto) {
    return this.walletService.transfer(user, transferDto);
  }

  @Get('transactions')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.READ)
  @ApiOperation({ 
    summary: '📊 Get transaction history',
    description: 'Returns all transactions for your wallet'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Transactions retrieved successfully',
    schema: {
      example: {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'deposit',
            amount: 5000.00,
            status: 'success',
            reference: 'TXN_1733779200',
            created_at: '2024-12-09T12:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '🔒 Unauthorized' })
  async getTransactions(@CurrentUser() user: User) {
    return this.walletService.getTransactions(user);
  }

  @Get('deposit/:reference/status')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(ApiKeyPermission.READ)
  @ApiOperation({ 
    summary: '🔍 Check deposit status',
    description: 'Checks the status of a deposit transaction'
  })
  @ApiParam({ 
    name: 'reference', 
    description: 'Transaction reference',
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Status retrieved',
    schema: {
      example: {
        reference: 'TXN_1733779200_abc123',
        status: 'success',
        amount: 5000.00
      }
    }
  })
  @ApiResponse({ status: 404, description: '❌ Transaction not found' })
  async getDepositStatus(
    @CurrentUser() user: User,
    @Param('reference') reference: string,
  ) {
    return this.walletService.getDepositStatus(user, reference);
  }

  // ✅ NEW: Paystack callback endpoint
@Get('paystack/callback')
@ApiExcludeEndpoint()
async paystackCallback(
  @Query('reference') reference: string,
  @Res() res: Response,
) {
  this.logger.log(`🔄 Paystack callback received for: ${reference}`);

  try {
    const verification = await this.paystackService.verifyTransaction(reference);

    if (verification.status && verification.data.status === 'success') {
      return res.json({
        status: 'success',
        message: 'Payment completed successfully',
        reference,
        amount: verification.data.amount / 100,
      });
    }

    return res.json({
      status: 'failed',
      message: 'Payment failed or pending',
      reference,
      gateway_response: verification.data?.gateway_response || 'Unknown error',
    });

  } catch (error) {
    this.logger.error(`❌ Callback error: ${error.message}`);

    return res.status(500).json({
      status: 'error',
      message: 'Error processing payment callback',
      reference,
    });
  }
}

  // ✅ UPDATED: Paystack webhook endpoint with signature
  @Post('paystack/webhook')
  @ApiExcludeEndpoint()
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    this.logger.log('📥 Paystack webhook received');

    if (!signature) {
      throw new BadRequestException('Missing Paystack signature');
    }

    // Verify webhook signature
    const rawBody = JSON.stringify(req.body);
    const isValid = this.paystackService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      throw new BadRequestException('Invalid Paystack signature');
    }

    // Process the webhook
    await this.walletService.handlePaystackWebhook(req.body, signature);
    
    // Return required response format
    return { status: true };
  }
}