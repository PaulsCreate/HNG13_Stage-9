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
    allowedHeaders: ['Content-Type', 'Authorization', 'API-Key'],
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

### Step 1: Authenticate
1. Click on **GET /auth/google** endpoint
2. Open the URL in your browser
3. Complete Google OAuth
4. Copy the JWT token from the response

### Step 2: Authorize
1. Click the **Authorize 🔒** button above
2. Paste your JWT token
3. Click "Authorize"

### Step 3: Start Using
Now you can test all endpoints with your authenticated session!

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
    `)
    .setVersion('1.0.0')
    .setContact(
      'API Support',
      'https://github.com/yourusername/wallet-service',
      'support@wallet-service.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
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
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        name: 'API-Key',
        description: 'Enter API Key (format: wsk_live_...)',
        in: 'header',
      },
      'API-Key-auth',
    )
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