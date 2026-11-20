import 'server-only';
import { hashPassword, schema, verifyPassword } from '@gutta/db-kids';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { db } from '../db';
import { env } from '../env';
import { mailer } from '../mail';
import { resetPasswordEmail, verificationEmail } from '../mail/templates';

// Mesma configuração do Cognuss (ADR 0002): sessão no banco, Argon2id, e-mail confirmado,
// 2FA TOTP. Contas não se cadastram sozinhas: entram por convite (USR-01, Fase 1).
// O login do aluno do Fundamental I sem e-mail (K-D07) entra na Fase 1.
function createAuth() {
  const e = env();
  return betterAuth({
    appName: 'Cognuss Kids',
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    trustedOrigins: [e.APP_URL],
    database: drizzleAdapter(db(), {
      provider: 'pg',
      schema: {
        user: schema.authUsers,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
        twoFactor: schema.authTwoFactors,
      },
    }),
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: e.APP_URL.startsWith('https://'),
      // Prefixo próprio: os cookies do Kids nunca se confundem com os do Cognuss.
      cookiePrefix: 'kids',
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 120 },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: async ({ user, url }) => {
        await mailer().send({ to: user.email, ...resetPasswordEmail(user.name, url) });
      },
    },
    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await mailer().send({ to: user.email, ...verificationEmail(user.name, url) });
      },
    },
    rateLimit: {
      enabled: e.AUTH_RATE_LIMIT ? e.AUTH_RATE_LIMIT === 'on' : e.NODE_ENV === 'production',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/request-password-reset': { window: 300, max: 5 },
        '/send-verification-email': { window: 300, max: 5 },
        '/two-factor/verify-totp': { window: 60, max: 10 },
      },
    },
    plugins: [
      twoFactor({ issuer: 'Cognuss Kids', trustDeviceMaxAge: 12 * 60 * 60 }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as unknown as { __kidsAuth?: Auth };

export function auth(): Auth {
  if (!g.__kidsAuth) g.__kidsAuth = createAuth();
  return g.__kidsAuth;
}
