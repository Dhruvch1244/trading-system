import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService, JwtClaims } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: JwtClaims }) {
    return this.authService.currentUser(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async changePassword(@Req() req: { user: JwtClaims }, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.authService.changePassword(req.user.sub, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  sessions(@Req() req: { user: JwtClaims }) {
    return this.authService.listSessions(req.user.sub);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async revokeSession(@Req() req: { user: JwtClaims }, @Param('id') sessionId: string): Promise<void> {
    await this.authService.revokeSession(req.user.sub, sessionId);
  }
}
