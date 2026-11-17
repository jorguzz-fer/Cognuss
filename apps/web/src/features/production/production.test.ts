import { describe, expect, it } from 'vitest';
import { production } from '@gutta/contracts';
import { PIECE_CREDITS, PIECE_TYPE_LABEL, PIECE_TYPES } from '@gutta/core';
import { BATCH_STATUS } from './labels';

// O contrato da API repete a lista de tipos de peça (contracts não depende do core).
describe('produção de aulas: tipos de peça', () => {
  it('o contrato e o core têm os mesmos tipos, com rótulo e créditos', () => {
    expect(production.PieceType.options).toEqual([...PIECE_TYPES]);
    for (const t of PIECE_TYPES) {
      expect(PIECE_TYPE_LABEL[t]).toBeTruthy();
      expect(PIECE_CREDITS[t]).toBeGreaterThanOrEqual(0);
    }
  });

  it('toda situação de lote tem rótulo', () => {
    expect(Object.keys(BATCH_STATUS).sort()).toEqual([...production.BatchStatus.options].sort());
  });
});
