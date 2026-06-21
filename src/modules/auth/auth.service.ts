// src/modules/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    displayName: string;
    profilePicture: string;
  }): Promise<User> {
    // Use transaction to ensure user and wallet are created atomically
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let user = await queryRunner.manager.findOne(User, {
        where: { googleId: googleUser.googleId },
        relations: ['wallet'],
      });

      if (!user) {
        // Create new user
        user = queryRunner.manager.create(User, {
          googleId: googleUser.googleId,
          email: googleUser.email,
          displayName: googleUser.displayName,
          profilePicture: googleUser.profilePicture,
        });

        user = await queryRunner.manager.save(User, user);

        // Generate 10-digit wallet number
        let walletNumber = this.generateWalletNumber();
        
        // Ensure uniqueness (retry if duplicate, though extremely rare)
        let existingWallet = await queryRunner.manager.findOne(Wallet, {
          where: { walletNumber }
        });
        
        let attempts = 0;
        while (existingWallet && attempts < 5) {
          walletNumber = this.generateWalletNumber();
          existingWallet = await queryRunner.manager.findOne(Wallet, {
            where: { walletNumber }
          });
          attempts++;
        }

        // Create wallet for new user
        const wallet = queryRunner.manager.create(Wallet, {
          walletNumber,
          userId: user.id,
          balance: 0,
        });

        await queryRunner.manager.save(Wallet, wallet);
        user.wallet = wallet;
      }

      await queryRunner.commitTransaction();
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      walletId: user.wallet?.id,
    };

    return this.jwtService.sign(payload);
  }

  private generateWalletNumber(): string {
    // Generate exactly 10-digit wallet number
    // Range: 1000000000 to 9999999999
    const min = 1000000000; // Minimum 10-digit number
    const max = 9999999999; // Maximum 10-digit number
    
    // Generate random number in range
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNumber.toString();
  }
}