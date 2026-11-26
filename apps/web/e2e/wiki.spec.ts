import { expect, test } from '@playwright/test';
import { completeOnboarding, promote, signUp, uniqueEmail } from './helpers';

test('wiki: a equipe lê e navega; o aluno não entra', async ({ page, browser, baseURL }) => {
  const email = uniqueEmail('wiki-prof');
  await signUp(page, 'Vera Professora', email);
  await promote(email, 'teacher');
  await page.goto('/professor');
  await page.getByRole('link', { name: 'Wiki', exact: true }).first().click();
  await expect(page).toHaveURL(/\/wiki$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Wiki do Cognuss' })).toBeVisible();

  await page.getByRole('link', { name: 'Como criar uma turma e passar o código' }).click();
  await expect(page).toHaveURL(/\/wiki\/professor\/criar-turma$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Passo a passo' })).toBeVisible();
  await expect(page.locator('.wiki-doc ol li').first()).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Trilha' })
    .getByRole('link', { name: 'Wiki' })
    .click();
  await expect(page).toHaveURL(/\/wiki$/);

  const res = await page.goto('/wiki/admin/nao-existe');
  expect(res?.status()).toBe(404);

  const student = await (await browser.newContext({ baseURL })).newPage();
  await signUp(student, 'Caio Aluno', uniqueEmail('wiki-aluno'));
  await completeOnboarding(student);
  await student.goto('/wiki');
  await expect(student).toHaveURL(/\/app\?aviso=sem-acesso/);
});
