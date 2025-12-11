import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaystackService } from './paystack.service';
// import { PaystackController } from './paystack.controller';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Transaction, Wallet]),
  ],
  providers: [PaystackService],
  // controllers: [PaystackController],
  exports: [PaystackService],
})
export class PaystackModule {}