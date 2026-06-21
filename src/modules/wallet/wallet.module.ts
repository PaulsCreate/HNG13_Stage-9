import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from '../../entities/wallet.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { ApiKey } from '../../entities/api-key.entity';
import { AuthModule } from '../auth/auth.module';
import { PaystackModule } from '../paystack/paystack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, User, ApiKey]),
    AuthModule,
    PaystackModule,
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}