import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { eq, schema as s } from '@gutta/db';
import { completeOnboarding, ownerDb, setFeatures, signUp, uniqueEmail } from './helpers';
import { textPdf } from './pdf';

// Cognuss Competências, Meus Certificados (docs/competencias, K1): o aluno envia o certificado,
// o Cognuss lê (leitor de teste no E2E), o aluno confere e confirma, e as horas somam.
const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()).violations;

test.describe('Meus Certificados', () => {
  test.beforeAll(() => setFeatures(['competencias']));
  test.afterAll(() => setFeatures([]));

  test('envia, confere, confirma e soma as horas; pastas e filtros', async ({ page }, info) => {
    test.setTimeout(180_000);
    const email = uniqueEmail('certificados');
    await signUp(page, 'Maria Eduarda Santos', email);
    await completeOnboarding(page);
    // Autorização de leitura com IA dos materiais (a mesma da Ajuda Cognuss).
    const db = ownerDb();
    const user = (await db.query.authUsers.findFirst({ where: eq(s.authUsers.email, email) }))!;
    await db.insert(s.consentRecords).values({
      userId: user.id,
      purpose: 'ai_materials',
      granted: true,
      policyVersion: '2026-11-14',
    });

    await page.goto('/app/competencias');
    await expect(page.getByRole('heading', { name: 'Meus Certificados', level: 1 })).toBeVisible();
    await expect(page.getByText('Nenhum certificado ainda.')).toBeVisible();
    expect(await axe(page)).toEqual([]);

    // Pasta nova.
    await page.getByLabel('Nova pasta').fill('Congressos');
    await page.getByRole('button', { name: 'Criar pasta' }).click();
    const pastas = page.getByRole('navigation', { name: 'Pastas' });
    await expect(pastas.getByRole('link', { name: /Congressos/ })).toBeVisible();

    // Envia o PDF do certificado: o Cognuss lê e propõe os campos.
    const pdf = info.outputPath('certificado.pdf');
    writeFileSync(
      pdf,
      textPdf([
        'CERTIFICADO',
        'Título: XXI Congresso Brasileiro de Clínica Médica',
        'Instituição: Sociedade Brasileira de Clínica Médica',
        'Nome: Maria Eduarda dos Santos',
        'Tipo: evento',
        'Início: 2026-08-10',
        'Fim: 2026-08-12',
        'Carga horária: 20 horas',
      ]),
    );
    await page.getByLabel('Arquivo do certificado').setInputFiles(pdf);
    await expect(page).toHaveURL(/\/app\/competencias\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(
      page.getByText('Gerado por IA, sem revisão: confira antes de confirmar.'),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByLabel('Nome da atividade')).toHaveValue(
      'XXI Congresso Brasileiro de Clínica Médica',
    );
    await expect(page.getByLabel('Carga horária')).toHaveValue('20');
    await expect(page.getByLabel('Início')).toHaveValue('2026-08-10');
    expect(await axe(page)).toEqual([]);

    // O aluno corrige a carga horária, põe na pasta e confirma.
    await page.getByLabel('Carga horária').fill('24h');
    await page.getByLabel('Pasta').selectOption({ label: 'Congressos' });
    await page.getByRole('button', { name: 'Conferi, confirmar' }).click();
    await expect(
      page.getByText('Certificado conferido. Ele já entra na soma de horas.'),
    ).toBeVisible();
    await expect(page.getByText('Conferido', { exact: true })).toBeVisible();

    // Um registro sem arquivo, deixado para conferir depois: não entra na soma.
    await page.goto('/app/competencias');
    await page.getByRole('button', { name: 'Registrar sem arquivo' }).click();
    await expect(page).toHaveURL(/\/app\/competencias\/[0-9a-f-]{36}$/);
    await page.getByLabel('Nome da atividade').fill('Monitoria de Fisiologia');
    await page.getByLabel('Tipo').selectOption({ label: 'Monitoria' });
    await page.getByLabel('Carga horária').fill('60');
    await page.getByRole('button', { name: 'Salvar e conferir depois' }).click();
    await expect(page.getByText('Alterações salvas.')).toBeVisible();

    await page.goto('/app/competencias');
    const horas = page.getByRole('region', { name: 'Horas conferidas' });
    await expect(horas.getByText('24 h', { exact: true })).toBeVisible();
    await expect(
      horas.getByText(/1 certificado conferido · 1 esperando a sua conferência/),
    ).toBeVisible();
    await expect(horas.getByText('Congresso ou evento: 24 h')).toBeVisible();

    const lista = page.getByRole('list', { name: 'Lista de certificados' });
    await expect(lista.getByRole('listitem')).toHaveCount(2);
    // Filtros: pasta, situação e busca.
    await pastas.getByRole('link', { name: /Congressos/ }).click();
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista.getByText('XXI Congresso Brasileiro de Clínica Médica')).toBeVisible();
    await page.goto('/app/competencias?situacao=a-conferir');
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista.getByText('Monitoria de Fisiologia')).toBeVisible();
    await page.goto('/app/competencias?q=congresso&vista=lista');
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    expect(await axe(page)).toEqual([]);
  });
});
