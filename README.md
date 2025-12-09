# HNG13_STAGE-9 TASK - Wallet Service with Paystack, JWT & API Keys

# 💰 Wallet Service API

A secure, scalable wallet service built with NestJS, featuring Google OAuth authentication, Paystack payment integration, and comprehensive API key management.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Paystack](https://img.shields.io/badge/Paystack-00C3F7?style=for-the-badge&logo=paystack&logoColor=white)](https://paystack.com/)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Authentication & Authorization

- 🔐 **Google OAuth 2.0** authentication
- 🔑 **JWT-based** session management
- 🛡️ **Role-based access control** with custom guards
- 🔒 **API Key management** with granular permissions

### Wallet Operations

- 💵 **Deposit funds** via Paystack integration
- 💸 **Transfer money** between wallets
- 📊 **Real-time balance** tracking
- 🧾 **Transaction history** with filtering and pagination

### API Key Management

- ✅ Create API keys with custom permissions (read, deposit, transfer)
- ⏰ Configurable expiry (1M, 3M, 6M, 1Y)
- 🔄 Key rollover functionality
- 🗑️ Revoke keys instantly

### Payment Integration

- 💳 **Paystack payment gateway** integration
- 🔔 **Webhook handling** for payment verification
- ✅ Automatic wallet crediting on successful payment
- 🔍 Transaction verification and tracking

### Security Features

- 🛡️ HMAC signature verification for webhooks
- 🔐 JWT token encryption
- 🚫 Protected routes with guards
- ✅ Input validation with DTOs
- 🔒 Secure password hashing (if applicable)

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v11.x
- **Language**: [TypeScript](https://www.typescriptlang.org/) v5.x
- **Database**: [PostgreSQL](https://www.postgresql.org/) with TypeORM
- **Authentication**: Google OAuth 2.0, JWT
- **Payment**: [Paystack](https://paystack.com/) API
- **Validation**: class-validator, class-transformer
- **HTTP Client**: Axios

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v14 or higher)
- **Google OAuth credentials** ([Get them here](https://console.cloud.google.com/))
- **Paystack account** ([Sign up here](https://paystack.com/))
- **ngrok** (for webhook testing) ([Download here](https://ngrok.com/))

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/PaulsCreate/HNG13_Stage-9.git
   cd HNG13_Stage-9.git
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up the database**

   ```bash
   # Create PostgreSQL database
   createdb wallet_service
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Application
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=wallet_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# ngrok (for webhook testing)
NGROK_URL=https://your-ngrok-url.ngrok-free.app
```

### Getting API Credentials

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:4000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

#### Paystack Setup

1. Sign up at [Paystack](https://paystack.com/)
2. Go to Settings → API Keys & Webhooks
3. Copy your test secret key and public key
4. Add webhook URL (use ngrok URL for local development)

## 🏃 Running the Application

### Development Mode

```bash
# Start the development server with hot-reload
npm run start:dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start the production server
npm run start:prod
```

### Setting up ngrok for Webhook Testing

```bash
# In a separate terminal, start ngrok
ngrok http 4000

# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
# Update NGROK_URL in .env
# Add webhook URL in Paystack Dashboard: https://abc123.ngrok-free.app/paystack/webhook
```

The application will be running at:

- **API**: http://localhost:4000
- **Health Check**: http://localhost:4000

## 📚 API Documentation

### Base URL

```
http://localhost:4000
```

### Authentication

#### Google OAuth Login

```http
GET /auth/google
```

Redirects to Google OAuth consent screen.

#### Get Google Auth URL

```http
GET /auth/google/url
```

Returns the Google OAuth URL for frontend integration.

**Response:**

```json
{
  "google_auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

#### Google OAuth Callback

```http
GET /auth/google/callback
```

Handles Google OAuth callback and returns JWT token with user details.

**Response:**

```json
{
  "success": true,
  "message": "Google authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "profilePicture": "https://...",
    "wallet": {
      "id": "uuid",
      "walletNumber": "1234567890",
      "balance": "0.00"
    }
  }
}
```

### API Key Management

#### Create API Key

```http
POST /keys/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "mobile-app",
  "permissions": ["deposit", "transfer", "read"],
  "expiry": "6M"
}
```

**Permissions:**

- `read` - View wallet balance and transactions
- `deposit` - Initiate deposits
- `transfer` - Transfer funds

**Expiry Options:**

- `1M` - 1 month
- `3M` - 3 months
- `6M` - 6 months
- `1Y` - 1 year

**Response:**

```json
{
  "id": "uuid",
  "name": "mobile-app",
  "key": "wsk_live_abcdef123456...",
  "permissions": ["deposit", "transfer", "read"],
  "expiresAt": "2025-06-09T12:00:00.000Z",
  "createdAt": "2024-12-09T12:00:00.000Z"
}
```

#### List API Keys

```http
GET /keys
Authorization: Bearer {jwt_token}
```

#### Get API Key Details

```http
GET /keys/{keyId}
Authorization: Bearer {jwt_token}
```

#### Revoke API Key

```http
DELETE /keys/{keyId}
Authorization: Bearer {jwt_token}
```

#### Rollover API Key

```http
POST /keys/{keyId}/rollover
Authorization: Bearer {jwt_token}
```

Generates a new key while keeping the same permissions and expiry.

### Wallet Operations

#### Get Wallet Balance

```http
GET /wallet/balance
Authorization: Bearer {jwt_token or api_key}
```

**Response:**

```json
{
  "balance": "15000.00",
  "walletNumber": "1234567890"
}
```

#### Get Wallet Details

```http
GET /wallet
Authorization: Bearer {jwt_token}
```

**Response:**

```json
{
  "id": "uuid",
  "walletNumber": "1234567890",
  "balance": "15000.00",
  "createdAt": "2024-12-01T10:00:00.000Z",
  "updatedAt": "2024-12-09T12:00:00.000Z"
}
```

#### Initiate Deposit

```http
POST /wallet/deposit
Authorization: Bearer {jwt_token or api_key}
Content-Type: application/json

{
  "amount": 5000
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Deposit initiated successfully",
  "authorization_url": "https://checkout.paystack.com/abc123",
  "reference": "TXN_1234567890",
  "amount": 5000
}
```

**Next Steps:**

1. Open the `authorization_url` in a browser
2. Complete payment with test card: `4084084084084081`
3. Webhook will automatically credit your wallet

#### Transfer Money

```http
POST /wallet/transfer
Authorization: Bearer {jwt_token or api_key}
Content-Type: application/json

{
  "wallet_number": "0987654321",
  "amount": 1000
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Transfer successful",
  "transaction": {
    "id": "uuid",
    "reference": "TXN_TRANSFER_123",
    "amount": "1000.00",
    "type": "TRANSFER",
    "status": "SUCCESS",
    "recipientWalletNumber": "0987654321"
  }
}
```

### Transaction History

#### Get All Transactions

```http
GET /wallet/transactions
Authorization: Bearer {jwt_token}
```

#### Get Transactions with Filters

```http
GET /wallet/transactions?type=DEPOSIT&status=SUCCESS&page=1&limit=10
Authorization: Bearer {jwt_token}
```

**Query Parameters:**

- `type` - DEPOSIT, TRANSFER
- `status` - PENDING, SUCCESS, FAILED
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "reference": "TXN_123",
      "amount": "5000.00",
      "type": "DEPOSIT",
      "status": "SUCCESS",
      "createdAt": "2024-12-09T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Get Transaction by Reference

```http
GET /wallet/transactions/{reference}
Authorization: Bearer {jwt_token}
```

## 🧪 Testing

### Using cURL

```bash
# Set your JWT token
export JWT_TOKEN="your_jwt_token_here"

# Get wallet balance
curl -X GET "http://localhost:4000/wallet/balance" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"

# Initiate deposit
curl -X POST "http://localhost:4000/wallet/deposit" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# Transfer money
curl -X POST "http://localhost:4000/wallet/transfer" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_number": "0987654321", "amount": 1000}'
```

### Paystack Test Cards

For testing payments in development:

| Card Number         | CVV | PIN  | OTP    | Result             |
| ------------------- | --- | ---- | ------ | ------------------ |
| 4084084084084081    | 408 | 0000 | 123456 | Success            |
| 5060666666666666666 | 123 | 1234 | 123456 | Insufficient Funds |
| 507850785078507812  | 884 | 3310 | 123456 | Token Declined     |

**Expiry:** Any future date (e.g., 12/25)

### Running Unit Tests

```bash
npm run test
```

### Running E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## 📁 Project Structure

```
wallet-service/
├── src/
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── permissions.decorator.ts
│   │   └── guards/
│   │       ├── auth.guard.ts
│   │       └── permissions.guard.ts
│   ├── config/
│   │   └── database.config.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── wallet.entity.ts
│   │   ├── transaction.entity.ts
│   │   └── api-key.entity.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── strategies/
│   │   │   │   ├── google.strategy.ts
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── api-keys/
│   │   │   ├── dto/
│   │   │   │   ├── create-api-key.dto.ts
│   │   │   │   └── rollover-api-key.dto.ts
│   │   │   ├── api-keys.controller.ts
│   │   │   ├── api-keys.service.ts
│   │   │   └── api-keys.module.ts
│   │   ├── wallet/
│   │   │   ├── dto/
│   │   │   │   ├── deposit.dto.ts
│   │   │   │   └── transfer.dto.ts
│   │   │   ├── wallet.controller.ts
│   │   │   ├── wallet.service.ts
│   │   │   └── wallet.module.ts
│   │   └── paystack/
│   │       ├── paystack.controller.ts
│   │       ├── paystack.service.ts
│   │       └── paystack.module.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── .env
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Security

### Best Practices Implemented

- ✅ Environment variables for sensitive data
- ✅ JWT token-based authentication
- ✅ HMAC signature verification for webhooks
- ✅ Input validation and sanitization
- ✅ SQL injection prevention via TypeORM
- ✅ Rate limiting (recommended to add)
- ✅ CORS configuration
- ✅ Helmet.js for security headers (recommended to add)

### Security Recommendations

1. **Never commit `.env` files** to version control
2. **Rotate API keys** regularly
3. **Use HTTPS** in production
4. **Implement rate limiting** for API endpoints
5. **Monitor webhook signatures** for tampering
6. **Regular security audits** of dependencies

## 🐛 Troubleshooting

### Common Issues

#### 1. Webhook not receiving payments

- ✅ Ensure ngrok is running: `ngrok http 4000`
- ✅ Update webhook URL in Paystack Dashboard
- ✅ Check ngrok terminal for incoming requests
- ✅ Verify webhook signature is correct

#### 2. Google OAuth not working

- ✅ Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- ✅ Verify redirect URI in Google Console matches your callback URL
- ✅ Ensure Google+ API is enabled

#### 3. Database connection errors

- ✅ Verify PostgreSQL is running: `pg_isready`
- ✅ Check database credentials in `.env`
- ✅ Ensure database exists: `createdb wallet_db`

#### 4. JWT token expired

- ✅ Re-authenticate via `/auth/google`
- ✅ Adjust `JWT_EXPIRATION` in `.env` if needed

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation for API changes
- Follow existing code style and conventions
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Paul Yusuf**

- GitHub: [@PaulsCreate](https://github.com/paulscreate)
