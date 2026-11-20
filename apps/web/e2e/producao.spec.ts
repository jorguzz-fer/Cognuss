import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { becomeAdmin, setFeatures } from './helpers';

// Produção de aulas, Fase 1 (docs/producao/ESPECIFICACAO.md; ADR 0021): o admin envia a aula,
// o worker separa os slides e acha os pedidos, a IA (falsa no E2E) planeja, e o admin decide.
const AULA = path.join(import.meta.dirname, '../../worker/test/fixtures/aula-producao.pptx');

const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()).violations;

test.describe('produção de aulas', () => {
  // O envio de arquivos depende de um módulo com arquivos ligado.
  test.beforeAll(() => setFeatures(['materiais']));
  test.afterAll(() => setFeatures([]));

  test('envia a aula, vê os pedidos ao lado dos slides e aprova, edita e descarta', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const title = `Aula de teste · ${Date.now().toString(36)}`;
    await becomeAdmin(page, 'Paula Produção');
    await page.goto('/admin/producao');
    await expect(page.getByRole('heading', { name: 'Produção de aulas', level: 1 })).toBeVisible();
    expect(await axe(page)).toEqual([]);

    await page.getByLabel('Nome da aula').fill(title);
    await page.getByLabel('Arquivo da aula').setInputFiles(AULA);
    await page.getByRole('button', { name: 'Enviar e criar o lote' }).click();
    await expect(page).toHaveURL(/\/admin\/producao\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    // A tela se atualiza sozinha enquanto o worker trabalha.
    await expect(page.getByText('Plano pronto')).toBeVisible({ timeout: 90_000 });
    await expect(
      page.getByText('7 slides, 3 com pedidos do professor, que formam 2 tarefas.'),
    ).toBeVisible();
    const tasks = page.getByRole('list', { name: 'Tarefas do lote' }).getByRole('article');
    await expect(tasks).toHaveCount(2);
    await expect(tasks.nth(0).getByText('01 · Pedido no slide 3')).toBeVisible();
    await expect(tasks.nth(1).getByText('02 · Pedido nos slides 6–7')).toBeVisible();
    await expect(tasks.nth(1).getByText('Prioridade do professor')).toBeVisible();
    // Slides de conteúdo do pedido, lado a lado com a tarefa.
    await expect(tasks.nth(1).getByRole('img', { name: 'Slide 4' })).toBeVisible();
    await expect(tasks.nth(1).getByRole('img', { name: 'Slide 5' })).toBeVisible();
    await tasks.nth(0).getByText('Pedido do professor').click();
    await expect(
      tasks
        .nth(0)
        .getByRole('paragraph')
        .filter({ hasText: /MONTAR UM ESQUEMA PARA SINALIZAÇÃO PARÁCRINA/ }),
    ).toBeVisible();
    expect(await axe(page)).toEqual([]);

    const credits = page.getByRole('region', { name: 'Decisão do plano' });
    await expect(credits.getByText('0 créditos', { exact: true })).toBeVisible();

    // Aprovar a primeira.
    await tasks.nth(0).getByRole('button', { name: 'Aprovar' }).click();
    await expect(tasks.nth(0).getByText('Aprovada', { exact: true })).toBeVisible();

    // Editar a segunda: vira vídeo, e o custo estimado sobe.
    await tasks.nth(1).getByRole('button', { name: 'Editar' }).click();
    await tasks.nth(1).getByLabel('Título').fill('O termostato hormonal');
    await tasks.nth(1).getByLabel('Tipo de peça').selectOption({ label: 'Vídeo com narração' });
    await tasks.nth(1).getByRole('button', { name: 'Salvar' }).click();
    await expect(
      tasks.nth(1).getByRole('heading', { name: 'O termostato hormonal' }),
    ).toBeVisible();
    await expect(credits.getByText('100 créditos', { exact: true })).toBeVisible();

    // Descartar a segunda: o custo volta.
    await tasks.nth(1).getByRole('button', { name: 'Descartar' }).click();
    await expect(tasks.nth(1).getByText('Descartada', { exact: true })).toBeVisible();
    await expect(credits.getByText('0 créditos', { exact: true })).toBeVisible();

    // A decisão fica salva.
    await page.reload();
    await expect(tasks.nth(0).getByText('Aprovada', { exact: true })).toBeVisible();
    await expect(tasks.nth(1).getByText('Descartada', { exact: true })).toBeVisible();

    // O slide oculto com o pedido aparece na lista completa, sem imagem.
    await page.getByText('Todos os slides (7)').click();
    await expect(page.getByText('Slide oculto').first()).toBeVisible();

    await page.goto('/admin/producao');
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  });
});
