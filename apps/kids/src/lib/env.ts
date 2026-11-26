import 'server-only';
import { z } from 'zod';

// Variáveis do servidor do Kids, validadas uma vez. Nenhuma vai para o navegador.
// O Kids usa o próprio banco (ADR 0022): KIDS_DATABASE_URL, nunca o DATABASE_URL do Cognuss.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3100'),
  KIDS_DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET precisa de 32+ caracteres'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('Cognuss Kids <nao-responda@gutta.tudomudou.com.br>'),
  MAIL_OUTBOX_FILE: z.string().optional(),
  AUTH_RATE_LIMIT: z.enum(['on', 'off']).optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
});

type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new Error(`Configuração inválida:\n${issues.join('\n')}`);
    }
    cached = parsed.data;
  }
  return cached;
}
