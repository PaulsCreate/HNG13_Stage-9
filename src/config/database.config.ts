// src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { ApiKey } from '../entities/api-key.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // Scalingo provides DATABASE_URL automatically
  const databaseUrl = configService.get('DATABASE_URL');
  
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [User, Wallet, Transaction, ApiKey],
      migrations: ['dist/migrations/*{.ts,.js}'],
      synchronize: false, // NEVER true in production
      ssl: { rejectUnauthorized: false },
      logging: false,
      migrationsRun: true,
      extra: {
        max: 10,
        connectionTimeoutMillis: 10000,
      },
    };
  }

  // Fallback for local development
  return {
    type: 'postgres',
    host: configService.get('DATABASE_HOST', 'localhost'),
    port: configService.get('DATABASE_PORT', 5432),
    username: configService.get('DATABASE_USER'),
    password: configService.get('DATABASE_PASSWORD'),
    database: configService.get('DATABASE_NAME'),
    entities: [User, Wallet, Transaction, ApiKey],
    migrations: ['dist/migrations/*{.ts,.js}'],
    synchronize: false,
    ssl: false,
    logging: true,
    migrationsRun: false,
  };
};