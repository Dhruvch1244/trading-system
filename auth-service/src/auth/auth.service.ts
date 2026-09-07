import { ConflictException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

export interface JwtClaims {
  sub: string; // account_id
  email: string;
  firstName: string;
  lastName: string;
}

const REFRESH_TOKEN_BYTES = 48;
const ACCOUNT_REF_PREFIX = 'ACC';

// A real, syntactically valid bcrypt hash of an arbitrary fixed string - never matches a real
// password, but costs the same CPU time as a genuine compare, so an unknown email can't be
// timed against a known one.
const DUMMY_BCRYPT_HASH = '$2b$10$vrEClnRWXpjxv5kRk3a83.7oXZB1GKeSnB.2GtwnGtzjOzmSZzUH6';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

interface FailedAttemptState {
  count: number;
  lockedUntil: number | null;
}

@Injectable()
export class AuthService {
  // Per-instance, in-memory lockout state. Fine for a single auth-service replica; if this
  // ever scales horizontally, move it to Redis so lockouts are shared across instances.
  private readonly failedAttempts = new Map<string, FailedAttemptState>();

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private assertNotLockedOut(email: string): void {
    const state = this.failedAttempts.get(email);
    if (state?.lockedUntil && state.lockedUntil > Date.now()) {
      throw new HttpException('too many failed attempts, try again shortly', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private registerFailedAttempt(email: string): void {
    const state = this.failedAttempts.get(email) ?? { count: 0, lockedUntil: null };
    state.count += 1;
    if (state.count >= MAX_FAILED_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCKOUT_MS;
      state.count = 0;
    }
    this.failedAttempts.set(email, state);
  }

  private clearFailedAttempts(email: string): void {
    this.failedAttempts.delete(email);
  }

  private async issueTokens(claims: JwtClaims) {
    const accessToken = this.jwtService.sign(claims, {
      expiresIn: (process.env.JWT_EXPIRY || '15m') as unknown as number,
    });

    const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshExpiry));

    await this.pool.query(
      `INSERT INTO auth.refresh_tokens (account_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [claims.sub, this.hashRefreshToken(refreshToken), expiresAt],
    );

    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT 1 FROM auth.users WHERE email = $1', [dto.email]);
      if ((existing.rowCount ?? 0) > 0) {
        throw new ConflictException('email already registered');
      }

      const accountRef = `${ACCOUNT_REF_PREFIX}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const accountResult = await client.query(
        `INSERT INTO accounts (account_reference, cash_balance, buying_power, status)
         VALUES ($1, 0, 0, 'ACTIVE') RETURNING id`,
        [accountRef],
      );
      const accountId: string = accountResult.rows[0].id;

      const passwordHash = await bcrypt.hash(dto.password, 10);
      await client.query(
        `INSERT INTO auth.users (account_id, first_name, last_name, email, phone_no, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [accountId, dto.firstName, dto.lastName, dto.email, dto.phoneNo ?? null, passwordHash],
      );

      await client.query('COMMIT');

      const claims: JwtClaims = {
        sub: accountId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      };
      const tokens = await this.issueTokens(claims);
      return { ...tokens, account: { accountId, accountReference: accountRef } };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto) {
    this.assertNotLockedOut(dto.email);

    const result = await this.pool.query(
      `SELECT account_id, first_name, last_name, email, password_hash FROM auth.users WHERE email = $1`,
      [dto.email],
    );

    // Always run bcrypt.compare, even for an unknown email, against a fixed dummy hash - this
    // equalizes response time so timing can't be used to enumerate registered emails.
    const row = result.rows[0];
    const valid = await bcrypt.compare(dto.password, row?.password_hash ?? DUMMY_BCRYPT_HASH);

    if (!row || !valid) {
      this.registerFailedAttempt(dto.email);
      throw new UnauthorizedException('invalid credentials');
    }

    this.clearFailedAttempts(dto.email);

    const claims: JwtClaims = {
      sub: String(row.account_id),
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    };
    return this.issueTokens(claims);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const result = await this.pool.query(
      `SELECT rt.account_id, rt.expires_at, rt.revoked_at, u.email, u.first_name, u.last_name
       FROM auth.refresh_tokens rt
       JOIN auth.users u ON u.account_id = rt.account_id
       WHERE rt.token_hash = $1`,
      [tokenHash],
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedException('invalid refresh token');
    }

    const row = result.rows[0];
    if (row.revoked_at || new Date(row.expires_at) < new Date()) {
      throw new UnauthorizedException('refresh token expired or revoked');
    }

    // Rotate: revoke the used token, issue a new pair.
    await this.pool.query(`UPDATE auth.refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [
      tokenHash,
    ]);

    const claims: JwtClaims = {
      sub: String(row.account_id),
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    };
    return this.issueTokens(claims);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.pool.query(
      `UPDATE auth.refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
    // No error on an unknown/already-revoked token - logout is idempotent from the client's view.
  }

  async currentUser(accountId: string) {
    const result = await this.pool.query(
      `SELECT account_id, first_name, last_name, email, phone_no FROM auth.users WHERE account_id = $1`,
      [accountId],
    );
    if (result.rowCount === 0) {
      throw new UnauthorizedException('user not found');
    }
    const row = result.rows[0];
    return {
      accountId: String(row.account_id),
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phoneNo: row.phone_no,
    };
  }
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}
