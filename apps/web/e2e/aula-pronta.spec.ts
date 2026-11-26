import path from 'node:path';
import { expect, test } from '@playwright/test';
import { becomeAdmin, promote, signUp, uniqueEmail } from './helpers';

// Aula pronta (HTML) no módulo do catálogo: envio com antivírus, fontes embutidas, prévia
// isolada para o admin e o revisor, e a troca só com o módulo em rascunho.
const AULA = path.join(import.meta.dirname, 'fixtures/aula-pronta.html');

test('admin envia a aula pronta; o revisor vê a prévia e aprova', async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  await becomeAdmin(page);
  const tag = Date.now().toString(36);
  await page.goto('/admin/cursos');
  await page.getByLabel('Nome').fill(`Farmácia ${tag}`);
  await page.getByRole('button', { name: 'Criar curso' }).click();
  await expect(page.getByText('Curso criado.')).toBeVisible();
  await page.getByLabel('Nome', { exact: true }).first().fill('Farmacologia');
  await page.getByRole('button', { name: 'Criar disciplina' }).click();
  await page.getByLabel('Novo assunto').fill('Farmacocinética');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByLabel('Título').fill(`Conceitos em Farmacologia ${tag}`);
  await page.getByLabel('Assunto', { exact: true }).selectOption({ label: 'Farmacocinética' });
  await page.getByRole('button', { name: 'Criar como rascunho' }).click();
  await expect(page.getByText('Módulo criado como rascunho.')).toBeVisible();
  await expect(page.getByText('Este módulo ainda não tem aula interativa.')).toBeVisible();

  await page.getByLabel('Arquivo da aula pronta').setInputFiles(AULA);
  await expect(page.getByText(/^Aula enviada|fontes do sistema/)).toBeVisible({ timeout: 45_000 });
  const preview = page.frameLocator('iframe[title^="Prévia da aula"]');
  await expect(preview.getByRole('heading', { name: 'Farmacocinética em 3 passos' })).toBeVisible();
  await expect(preview.getByText('Script rodou dentro da aula.')).toBeVisible();

  // A aula sai com a política isolada e sem os links do Google.
  const src = await page.locator('iframe[title^="Prévia da aula"]').getAttribute('src');
  expect(src).toMatch(/^\/api\/v1\/catalog\/lessons\/[0-9a-f-]{36}$/);
  const res = await page.request.get(src!);
  expect(res.headers()['content-security-policy']).toContain('sandbox allow-scripts');
  expect(await res.text()).not.toContain('fonts.googleapis.com');
  // Sem login, nada.
  expect((await request.get(src!, { headers: { cookie: '' } })).status()).toBe(401);

  // Fora do rascunho, a aula não troca.
  await page.getByRole('button', { name: 'Enviar para revisão' }).click();
  await expect(page.getByText('Em revisão', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trocar a aula pronta (.html)' })).toBeDisabled();

  const reviewerEmail = uniqueEmail('rev-aula');
  const reviewer = await (await browser.newContext({ baseURL })).newPage();
  await signUp(reviewer, 'Rafa Revisor', reviewerEmail);
  await promote(reviewerEmail, 'reviewer');
  await reviewer.goto('/admin/revisao');
  await reviewer.getByRole('link', { name: `Conceitos em Farmacologia ${tag}` }).click();
  await expect(
    reviewer
      .frameLocator('iframe[title^="Prévia da aula"]')
      .getByRole('heading', { name: 'Farmacocinética em 3 passos' }),
  ).toBeVisible();
  await expect(reviewer.getByRole('button', { name: /aula pronta/ })).toHaveCount(0);
  await reviewer.getByRole('button', { name: 'Aprovar' }).click();
  await expect(reviewer.getByText('Aprovado', { exact: true })).toBeVisible();
});

test('aluno não envia HTML', async ({ page }) => {
  await signUp(page, 'Beto Aluno', uniqueEmail('html-aluno'));
  const res = await page.request.post('/api/v1/files', {
    data: { name: 'x.html', mime: 'text/html', sizeBytes: 10, sha256: 'a'.repeat(64) },
  });
  expect([403, 404]).toContain(res.status());
});
