import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { PaystackService } from '../paystack/paystack.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private paystackService: PaystackService,
    private dataSource: DataSource,
  ) {}

  async initiateDeposit(
    user: User,
    depositDto: DepositDto,
  ): Promise<{ reference: string; authorization_url: string }> {
    this.logger.log(`💰 Initiate deposit for user: ${user.email}, amount: ${depositDto.amount}`);

    const wallet = await this.walletRepository.findOne({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Validate minimum amount
    if (depositDto.amount < 100) {
      throw new BadRequestException('Minimum deposit amount is ₦100');
    }

    // Generate unique reference
    const reference = this.generateReference();

    this.logger.log(`📝 Creating transaction with reference: ${reference}`);

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.DEPOSIT,
      amount: depositDto.amount,
      status: TransactionStatus.PENDING,
      reference,
    });

    await this.transactionRepository.save(transaction);

    // Initialize Paystack payment with dynamic callback URL
    this.logger.log(`🔄 Initializing Paystack transaction for reference: ${reference}`);
    
    const paystackResponse = await this.paystackService.initializeTransaction(
      user.email,
      depositDto.amount,
      reference,
    );

    this.logger.log(`✅ Paystack payment URL generated for: ${reference}`);

    return {
      reference: paystackResponse.data.reference,
      authorization_url: paystackResponse.data.authorization_url,
    };
  }

  async handlePaystackWebhook(payload: any, signature: string): Promise<void> {
    this.logger.log('📥 Processing Paystack webhook');
    
    const event = payload.event;
    this.logger.log(`✅ Webhook event: ${event}`);

    // Handle successful charges
    if (event === 'charge.success') {
      await this.handleSuccessfulCharge(payload);
    }
    // Handle failed/declined charges
    else if (event === 'charge.failed') {
      await this.handleFailedCharge(payload);
    }
    // Log other events but don't process them
    else {
      this.logger.log(`ℹ️ Unhandled webhook event: ${event}`);
    }
  }

  private async handleSuccessfulCharge(payload: any): Promise<void> {
    const { reference, amount } = payload.data;
    
    this.logger.log(`💰 Processing successful charge: ${reference}, Amount: ${amount}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the transaction with wallet relation
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { reference },
        relations: ['wallet'],
      });

      if (!transaction) {
        this.logger.error(`❌ Transaction not found: ${reference}`);
        throw new NotFoundException(`Transaction with reference ${reference} not found`);
      }

      // Idempotency check: if already successful, skip
      if (transaction.status === TransactionStatus.SUCCESS) {
        this.logger.warn(`⚠️ Transaction already processed as SUCCESS: ${reference}`);
        await queryRunner.commitTransaction();
        return;
      }

      // If previously failed, update metadata with success info
      if (transaction.status === TransactionStatus.FAILED) {
        this.logger.log(`🔄 Recovering previously failed transaction: ${reference}`);
      }

      // Update transaction status
      transaction.status = TransactionStatus.SUCCESS;
      
      // Update metadata with additional info
      const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
      metadata.webhook_received = true;
      metadata.success_time = new Date().toISOString();
      metadata.paystack_response = payload.data?.gateway_response || 'success';
      transaction.metadata = JSON.stringify(metadata);

      await queryRunner.manager.save(Transaction, transaction);

      // Credit wallet (convert from kobo to naira)
      const wallet = transaction.wallet;
      const amountInNaira = amount / 100; // Paystack amount is in kobo
      wallet.balance = Number(wallet.balance) + amountInNaira;
      await queryRunner.manager.save(Wallet, wallet);

      this.logger.log(
        `✅ Wallet credited: ${wallet.walletNumber}, Amount: ₦${amountInNaira}, New balance: ₦${wallet.balance}`,
      );

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Successfully processed webhook for: ${reference}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Error processing successful charge: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handleFailedCharge(payload: any): Promise<void> {
    const { reference, gateway_response } = payload.data;
    
    this.logger.log(`❌ Processing failed charge: ${reference}, Reason: ${gateway_response}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the transaction
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { reference },
      });

      if (!transaction) {
        this.logger.error(`❌ Transaction not found: ${reference}`);
        throw new NotFoundException(`Transaction with reference ${reference} not found`);
      }

      // Idempotency check: if already failed, skip
      if (transaction.status === TransactionStatus.FAILED) {
        this.logger.warn(`⚠️ Transaction already processed as FAILED: ${reference}`);
        await queryRunner.commitTransaction();
        return;
      }

      // Update transaction status to FAILED
      transaction.status = TransactionStatus.FAILED;
      
      // Store failure reason in metadata
      const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
      metadata.failure_reason = gateway_response;
      metadata.failure_time = new Date().toISOString();
      metadata.webhook_received = true;
      transaction.metadata = JSON.stringify(metadata);

      await queryRunner.manager.save(Transaction, transaction);

      this.logger.log(`✅ Transaction marked as FAILED: ${reference}, Reason: ${gateway_response}`);

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Successfully processed failed charge webhook for: ${reference}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Error processing failed charge: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getDepositStatus(
    user: User,
    reference: string,
  ): Promise<{ reference: string; status: string; amount: number; metadata?: any }> {
    this.logger.log(`🔍 Checking deposit status for reference: ${reference}`);

    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify it belongs to the user
    if (transaction.wallet.userId !== user.id) {
      throw new BadRequestException('Unauthorized access to transaction');
    }

    const response: any = {
      reference: transaction.reference,
      status: transaction.status,
      amount: Number(transaction.amount),
    };

    // Include metadata if available (parsed)
    if (transaction.metadata) {
      try {
        response.metadata = JSON.parse(transaction.metadata);
      } catch (error) {
        this.logger.warn(`⚠️ Failed to parse metadata for transaction: ${reference}`);
      }
    }

    this.logger.log(`📊 Deposit status: ${reference} - ${transaction.status}`);

    return response;
  }

  async getBalance(user: User): Promise<{ balance: number; walletNumber: string }> {
    this.logger.log(`💵 Getting balance for user: ${user.email}`);

    const wallet = await this.walletRepository.findOne({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    this.logger.log(`💰 Balance retrieved: ${wallet.walletNumber} - ₦${wallet.balance}`);

    return {
      balance: Number(wallet.balance),
      walletNumber: wallet.walletNumber,
    };
  }

  async transfer(
    user: User,
    transferDto: TransferDto,
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`💸 Transfer initiated by: ${user.email}, Amount: ₦${transferDto.amount}, To: ${transferDto.wallet_number}`);

    // Validate minimum amount
    if (transferDto.amount < 100) {
      throw new BadRequestException('Minimum transfer amount is ₦100');
    }

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find sender's wallet
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      // Find recipient's wallet
      const recipientWallet = await queryRunner.manager.findOne(Wallet, {
        where: { walletNumber: transferDto.wallet_number },
        lock: { mode: 'pessimistic_write' },
      });

      if (!recipientWallet) {
        throw new NotFoundException('Recipient wallet not found');
      }

      // Prevent self-transfer
      if (senderWallet.id === recipientWallet.id) {
        throw new BadRequestException('Cannot transfer to yourself');
      }

      // Check sufficient balance
      if (Number(senderWallet.balance) < transferDto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Deduct from sender
      senderWallet.balance = Number(senderWallet.balance) - transferDto.amount;
      await queryRunner.manager.save(Wallet, senderWallet);

      // Add to recipient
      recipientWallet.balance = Number(recipientWallet.balance) + transferDto.amount;
      await queryRunner.manager.save(Wallet, recipientWallet);

      // Generate transfer reference
      const transferReference = `TRANSFER_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Create transaction records for both parties
      const senderTransaction = queryRunner.manager.create(Transaction, {
        walletId: senderWallet.id,
        type: TransactionType.TRANSFER_OUT,
        amount: transferDto.amount,
        status: TransactionStatus.SUCCESS,
        recipientWalletNumber: recipientWallet.walletNumber,
        metadata: JSON.stringify({
          transfer_type: 'outgoing',
          recipient_wallet: recipientWallet.walletNumber,
          initiated_by: user.email,
        }),
      });

      const recipientTransaction = queryRunner.manager.create(Transaction, {
        walletId: recipientWallet.id,
        type: TransactionType.TRANSFER_IN,
        amount: transferDto.amount,
        status: TransactionStatus.SUCCESS,
        senderWalletNumber: senderWallet.walletNumber,
        metadata: JSON.stringify({
          transfer_type: 'incoming',
          sender_wallet: senderWallet.walletNumber,
          sender_email: user.email,
        }),
      });

      await queryRunner.manager.save(Transaction, [
        senderTransaction,
        recipientTransaction,
      ]);

      await queryRunner.commitTransaction();

      this.logger.log(`✅ Transfer successful: ${senderWallet.walletNumber} → ${recipientWallet.walletNumber}, Amount: ₦${transferDto.amount}`);

      return {
        status: 'success',
        message: 'Transfer completed successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Transfer failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactions(user: User): Promise<any[]> {
    this.logger.log(`📊 Getting transactions for user: ${user.email}`);

    const wallet = await this.walletRepository.findOne({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transactions = await this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 transactions
    });

    this.logger.log(`📈 Found ${transactions.length} transactions for wallet: ${wallet.walletNumber}`);

    return transactions.map((txn) => {
      const baseTransaction = {
        id: txn.id,
        type: txn.type,
        amount: Number(txn.amount),
        status: txn.status,
        reference: txn.reference,
        recipient_wallet_number: txn.recipientWalletNumber,
        sender_wallet_number: txn.senderWalletNumber,
        created_at: txn.createdAt,
      };

      // Parse metadata if it exists
      if (txn.metadata) {
        try {
          const metadata = JSON.parse(txn.metadata);
          return {
            ...baseTransaction,
            metadata,
            failure_reason: metadata.failure_reason || null,
          };
        } catch (error) {
          return baseTransaction;
        }
      }

      return baseTransaction;
    });
  }

  private generateReference(): string {
    return `TXN_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}