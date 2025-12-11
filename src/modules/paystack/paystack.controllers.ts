import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { PaystackService } from './paystack.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';

@ApiTags('💳 Paystack')
@Controller('paystack')
export class PaystackController {
  private readonly logger = new Logger(PaystackController.name);

  constructor(
    private paystackService: PaystackService,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  @Post('webhook')
  @ApiExcludeEndpoint() // Hidden from Swagger - called by Paystack servers
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    this.logger.log('📥 Webhook received from Paystack');

    const payload = JSON.stringify(body);
    const isValid = this.paystackService.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      this.logger.error('❌ Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = body;
    this.logger.log(`✅ Webhook verified. Event: ${event.event}`);

    if (event.event === 'charge.success') {
      const { reference, amount, status } = event.data;

      this.logger.log(
        `💰 Processing payment: ${reference}, Amount: ${amount / 100}, Status: ${status}`,
      );

      const transaction = await this.transactionRepository.findOne({
        where: { reference },
        relations: ['wallet'],
      });

      if (!transaction) {
        this.logger.error(`❌ Transaction not found: ${reference}`);
        return { status: 'error', message: 'Transaction not found' };
      }

      if (transaction.status === TransactionStatus.SUCCESS) {
        this.logger.warn(`⚠️ Transaction already processed: ${reference}`);
        return { status: 'success', message: 'Already processed' };
      }

      transaction.status = TransactionStatus.SUCCESS;
      await this.transactionRepository.save(transaction);

      const wallet = transaction.wallet;
      const currentBalance = parseFloat(wallet.balance.toString());
      const newBalance = currentBalance + amount / 100;
      wallet.balance = newBalance;
      await this.walletRepository.save(wallet);

      this.logger.log(
        `✅ Wallet credited: ${wallet.walletNumber}, New balance: ${wallet.balance}`,
      );
    }

    return { status: 'success' };
  }

  @Get('callback')
  @ApiExcludeEndpoint() // Hidden from Swagger - user redirect endpoint
  async paymentCallback(
    @Query('reference') reference: string,
    @Res() res: Response,
  ) {
    this.logger.log(`🔄 Payment callback received for: ${reference}`);

    try {
      const verification = await this.paystackService.verifyTransaction(reference);

      if (verification.status && verification.data.status === 'success') {
        this.logger.log(`✅ Payment verified: ${reference}`);

        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Successful</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 20px;
                }
                .container {
                  background: white;
                  padding: 3rem 2rem;
                  border-radius: 16px;
                  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                  text-align: center;
                  max-width: 500px;
                  width: 100%;
                  animation: slideUp 0.5s ease-out;
                }
                @keyframes slideUp {
                  from {
                    opacity: 0;
                    transform: translateY(30px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .success-icon {
                  width: 80px;
                  height: 80px;
                  background: #10b981;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 1.5rem;
                  animation: scaleIn 0.5s ease-out 0.2s both;
                }
                @keyframes scaleIn {
                  from {
                    transform: scale(0);
                  }
                  to {
                    transform: scale(1);
                  }
                }
                .success-icon svg {
                  width: 50px;
                  height: 50px;
                  stroke: white;
                  stroke-width: 3;
                  fill: none;
                }
                h1 {
                  color: #1f2937;
                  margin-bottom: 0.5rem;
                  font-size: 1.75rem;
                }
                .message {
                  color: #6b7280;
                  margin-bottom: 2rem;
                  font-size: 1rem;
                  line-height: 1.6;
                }
                .info {
                  background: #f9fafb;
                  padding: 1.5rem;
                  border-radius: 12px;
                  margin-bottom: 1.5rem;
                  border: 1px solid #e5e7eb;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 0.75rem 0;
                  border-bottom: 1px solid #e5e7eb;
                }
                .info-row:last-child {
                  border-bottom: none;
                }
                .info-label {
                  color: #6b7280;
                  font-size: 0.875rem;
                  font-weight: 500;
                }
                .info-value {
                  color: #1f2937;
                  font-weight: 600;
                  font-size: 0.95rem;
                }
                .note {
                  color: #059669;
                  font-size: 0.875rem;
                  padding: 1rem;
                  background: #d1fae5;
                  border-radius: 8px;
                  margin-top: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success-icon">
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h1>Payment Successful! 🎉</h1>
                <p class="message">Your payment has been processed successfully.</p>
                <div class="info">
                  <div class="info-row">
                    <span class="info-label">Reference</span>
                    <span class="info-value">${reference}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Amount</span>
                    <span class="info-value">₦${(verification.data.amount / 100).toLocaleString()}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Status</span>
                    <span class="info-value">Completed</span>
                  </div>
                </div>
                <div class="note">
                  ✓ Your wallet will be credited within moments
                </div>
              </div>
            </body>
          </html>
        `);
      } else {
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Failed</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
                  padding: 20px;
                }
                .container {
                  background: white;
                  padding: 3rem 2rem;
                  border-radius: 16px;
                  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                  text-align: center;
                  max-width: 500px;
                  width: 100%;
                }
                .error-icon {
                  width: 80px;
                  height: 80px;
                  background: #ef4444;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 1.5rem;
                }
                .error-icon svg {
                  width: 50px;
                  height: 50px;
                  stroke: white;
                  stroke-width: 3;
                }
                h1 {
                  color: #1f2937;
                  margin-bottom: 0.5rem;
                }
                .message {
                  color: #6b7280;
                  font-size: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
                <h1>Payment Failed</h1>
                <p class="message">Your payment could not be processed. Please try again.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      this.logger.error(`❌ Payment verification failed: ${error.message}`);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error</title>
          </head>
          <body>
            <h1>Error verifying payment</h1>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  }
}