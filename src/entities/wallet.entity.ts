// src/entities/wallet.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'wallet_number', length: 10 })
  walletNumber: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateWalletNumber() {
    // Generate exactly 10-digit wallet number
    // Range: 1000000000 to 9999999999 (inclusive)
    const min = 1000000000; // Minimum 10-digit number (starts with 1)
    const max = 9999999999; // Maximum 10-digit number
    
    // Generate random number in the range
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    this.walletNumber = randomNumber.toString();
  }
}