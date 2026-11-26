import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { completeOnboarding, promote, signUp, uniqueEmail } from './helpers';

test('mapa de atores: só a equipe abre', async ({ page, browser, baseURL }) => {
  // Sem sessão, vai para o login.
  const anon = await (await browser.newContext({ baseURL })).newPage();
  await anon.goto('/mapa');
  await expect(anon).toHaveURL(/\/entrar\?next=%2Fmapa/);

  // Aluno não abre.
  const student = await (await browser.newContext({ baseURL })).newPage();
  await signUp(student, 'Lia Aluna', uniqueEmail('mapa-aluno'));
  await completeOnboarding(student);
  await student.goto('/mapa');
  await expect(student).toHaveURL(/\/app\?aviso=sem-acesso/);

  // Professor abre, com os diagramas já desenhados e o tema escuro como padrão.
  const email = uniqueEmail('mapa-prof');
  await signUp(page, 'Iris Professora', email);
  await promote(email, 'teacher');
  await page.goto('/professor');
  await page.getByRole('link', { name: 'Mapa de atores' }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.getByRole('heading', { level: 1, name: /Mapa de Atores/ })).toBeVisible();
  await expect(page.locator('.diagram .d-dark svg').first()).toBeVisible();
  await expect(page.locator('.diagram .d-light svg').first()).toBeHidden();
  await expect(page.locator('.diagram')).toHaveCount(12);

  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(page.locator('.diagram .d-light svg').first()).toBeVisible();

  const res = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.diagram')
    .analyze();
  expect(res.violations.map((v) => v.id)).toEqual([]);
});
