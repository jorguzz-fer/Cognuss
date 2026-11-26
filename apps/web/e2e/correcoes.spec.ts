import { expect, test } from '@playwright/test';
import { completeOnboarding, setFeatures, signUp, totp, uniqueEmail } from './helpers';

// Correções da rodada de 26/11/2026 (achados da wiki): 2FA de quem não é admin, 404 em
// português, edição da disciplina do aluno e entrada dos módulos sem o Meu Espaço.
test.describe('correções', () => {
  test.beforeAll(() => setFeatures(['disciplinas', 'agenda']));
  test.afterAll(() => setFeatures([]));

  test('aluno ativa o 2FA, volta ao app, gera códigos novos e desliga', async ({ page }) => {
    await signUp(page, 'Tais Aluna', uniqueEmail('2fa-aluno'));
    await completeOnboarding(page);
    await page.goto('/seguranca/dois-fatores');
    await page.getByLabel('Confirme sua senha').fill('senha-e2e-segura-1');
    await page.getByRole('button', { name: 'Continuar' }).click();
    const secret = (await page.locator('code').innerText()).trim();
    await page.getByLabel('Código de 6 dígitos do app').fill(totp(secret));
    await page.getByRole('button', { name: 'Ativar', exact: true }).click();
    await expect(page.getByText('Verificação em duas etapas ativa.')).toBeVisible();
    await page.getByRole('button', { name: 'Voltar ao Cognuss' }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.goto('/seguranca/dois-fatores');
    await expect(page.getByText('Já está ativa nesta conta.')).toBeVisible();
    await page.getByLabel('Confirme sua senha').first().fill('senha-e2e-segura-1');
    await page.getByRole('button', { name: 'Gerar novos códigos' }).click();
    await expect(page.getByText('Seus novos códigos de recuperação')).toBeVisible();

    await page.getByLabel('Confirme sua senha').last().fill('senha-e2e-segura-1');
    await page.getByRole('button', { name: 'Desligar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });

  test('página que não existe aparece em português', async ({ page }) => {
    await signUp(page, 'Ivo Aluno', uniqueEmail('404'));
    await completeOnboarding(page);
    const res = await page.goto('/app/nao-existe');
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Esta página não está disponível' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Ir para o início' }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test('Hoje mostra os módulos ligados; disciplina é editada e arquivada com confirmação', async ({
    page,
  }) => {
    await signUp(page, 'Lara Aluna', uniqueEmail('disc-edit'));
    await completeOnboarding(page);
    const atalhos = page.getByRole('navigation', { name: 'Organização do semestre' });
    await expect(atalhos.getByRole('link', { name: 'Minhas disciplinas' })).toBeVisible();
    await expect(atalhos.getByRole('link', { name: 'Agenda' })).toBeVisible();
    await expect(atalhos.getByRole('link', { name: 'Faltas' })).toHaveCount(0);

    await atalhos.getByRole('link', { name: 'Minhas disciplinas' }).click();
    await page.getByLabel('Nome da disciplina').fill('Farmacologia gera');
    await page.getByRole('button', { name: 'Adicionar disciplina' }).click();
    await page.getByRole('button', { name: 'Editar Farmacologia gera' }).click();
    const form = page.locator('form').filter({ hasText: 'Salvar alterações' });
    await form.getByLabel('Nome da disciplina').fill('Farmacologia geral');
    await form.getByLabel('Sigla').fill('Farmaco');
    await form.getByLabel('Docentes').fill('Prof. Dr. Paulo Lima');
    await form.getByRole('button', { name: 'Salvar alterações' }).click();
    const item = page.getByRole('listitem').filter({ hasText: 'Farmacologia geral' }).first();
    await expect(item).toContainText('Farmaco');
    await expect(item).toContainText('Prof. Dr. Paulo Lima');

    page.once('dialog', (d) => void d.accept());
    await item.getByRole('button', { name: 'Arquivar Farmacologia geral' }).click();
    await expect(page.getByText('Farmacologia geral')).toHaveCount(0);
  });
});
