import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly paystackSecretKey: string;
  private readonly backendUrl: string;

  constructor(private configService: ConfigService) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    this.backendUrl = this.configService.get<string>('BACKEND_URL');
    
    if (!this.paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
    if (!this.backendUrl) {
      this.logger.warn('BACKEND_URL is not configured, using fallback');
      this.backendUrl = 'http://localhost:3000'; // Fallback for local development
    }
    
    this.logger.log(`✅ Paystack service initialized. Backend URL: ${this.backendUrl}`);
  }

  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
  ): Promise<any> {
    const payload = {
      email,
      amount: amount * 100, // Convert to kobo
      reference,
      callback_url: `${this.backendUrl}/wallet/paystack/callback`,
    };

    this.logger.log(`🔄 Initializing Paystack transaction for ${email}, amount: ₦${amount}`);
    this.logger.log(`📞 Callback URL: ${payload.callback_url}`);

    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`✅ Paystack transaction initialized: ${reference}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Paystack initialization failed: ${error.message}`);
      throw error;
    }
  }

  async verifyTransaction(reference: string): Promise<any> {
    this.logger.log(`🔍 Verifying Paystack transaction: ${reference}`);

    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      this.logger.log(`✅ Transaction verification result: ${response.data.data?.status}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Transaction verification failed: ${error.message}`);
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      this.logger.error('❌ No webhook signature provided');
      return false;
    }

    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(payload)
      .digest('hex');
    
    const isValid = hash === signature;
    this.logger.log(`🔐 Webhook signature verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    return isValid;
  }
}