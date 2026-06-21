import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'], // Changed from API-Key
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription(`
# Wallet Service API Documentation

A comprehensive wallet service with Google OAuth authentication, Paystack payment integration, and API key management.

## 🌟 Features

- 🔐 **Google OAuth 2.0** - Secure authentication
- 💰 **Wallet Management** - Deposit, transfer, and balance tracking
- 🔑 **API Key Management** - Create keys with granular permissions
- 💳 **Paystack Integration** - Seamless payment processing
- 📊 **Transaction History** - Complete audit trail

## 🚀 Getting Started

### Option 1: Using JWT Token
1. Visit **GET /auth/google** endpoint in browser
2. Complete Google OAuth
3. Copy the JWT token from response
4. Click **Authorize 🔒** button above
5. Paste token in **JWT-auth** section

### Option 2: Using API Key
1. First authenticate with JWT (Option 1)
2. Create API key at **POST /keys/create**
3. Copy the API key (shows only once!)
4. Click **Authorize 🔒** button
5. Paste key in **API-Key** section

## 📝 API Key Permissions

- **read** - View wallet balance and transactions
- **deposit** - Initiate deposits
- **transfer** - Transfer funds between wallets

## 💳 Test Card (Paystack)

Use these test cards for deposits:
- **Card:** 4084084084084081
- **CVV:** 408
- **Expiry:** Any future date
- **PIN:** 0000
- **OTP:** 123456

## ⚠️ Important Notes

- API Keys use header: \`x-api-key: sk_live_...\`
- JWT uses header: \`Authorization: Bearer <token>\`
- Maximum 5 active API keys per user
- API keys can be created with specific permissions
    `)
    .setVersion('1.0.0')
    .setContact(
      'Paul Yusuf',
      'https://github.com/PaulsCreate/HNG13_Stage-9',
      ''
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    // JWT Authentication
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from Google OAuth',
        in: 'header',
      },
      'JWT-auth',
    )
    // API Key Authentication - FIXED TO USE x-api-key HEADER
    .addSecurity('API-Key', {
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key',
      description: 'Enter your API Key (format: sk_live_...)',
    })
    .addTag('🔐 Authentication', 'Google OAuth 2.0 authentication and JWT token management')
    .addTag('💰 Wallet', 'Wallet operations: deposit, transfer, balance, transactions')
    .addTag('🔑 API Keys', 'Create and manage API keys with custom permissions')
    .addTag('💳 Paystack', 'Payment gateway integration (webhooks and callbacks)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Wallet Service API - Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.5/swagger-ui.min.css',
    ],
  });

  const port = configService.get('PORT') || 4000;
  await app.listen(port, '0.0.0.0');

  const env = configService.get('NODE_ENV') || 'development';
  console.log('');
  console.log('🚀 ====================================');
  console.log(`🚀  Application is running!`);
  console.log('🚀 ====================================');
  console.log(`🌐  URL: http://localhost:${port}`);
  console.log(`📚  Docs: http://localhost:${port}/api/docs`);
  console.log(`📊  Environment: ${env}`);
  console.log('🚀 ====================================');
  console.log('');
}
bootstrap();