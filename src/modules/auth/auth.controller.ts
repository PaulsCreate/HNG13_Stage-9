// src/modules/auth/auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiExcludeEndpoint 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('🔐 Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @ApiOperation({ 
    summary: '🚀 Get Google Login URL',
    description: `
**Returns Google OAuth URL**

### How to use:
1. Click "Try it out" → "Execute"
2. Copy the complete URL from response body
3. Paste it in your browser address bar
4. Complete Google login
5. You'll get a JSON with your JWT token
6. Copy the token and use in Swagger

### Example URL:
\`https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=...\`

### After login, you'll see:
\`\`\`json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
\`\`\`
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns Google OAuth URL',
    content: {
      'text/plain': {
        example: 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=1234567890.apps.googleusercontent.com&redirect_uri=http://localhost:4000/auth/google/callback&scope=email%20profile&access_type=offline&prompt=consent'
      }
    }
  })
  getGoogleAuthUrl() {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const redirectUri = `${this.configService.get('BACKEND_URL')}/auth/google/callback`;
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    // Return as plain text so user can easily copy
    return url;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    try {
      const user = await this.authService.validateGoogleUser(req.user);
      const token = this.authService.generateJwtToken(user);

      return res.json({
        success: true,
        message: 'Google authentication successful',
        token: token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          wallet: user.wallet ? {
            id: user.wallet.id,
            walletNumber: user.wallet.walletNumber,
            balance: user.wallet.balance,
          } : null,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authentication failed',
        error: error.message,
      });
    }
  }
}