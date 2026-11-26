'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { previewIntervals, RATING_LABEL, type Rating } from '@gutta/core';
import { Button, buttonClass } from '@gutta/ui/button';
import { Alert, Card } from '@gutta/ui/card';
import { reviewCard } from '@/app/estudar/actions';

type Card = {
  id: string;
  front: string;
  back: string;
  repetitions: number;
  intervalDays: number;
  ease: number;
  lapses: number;
};

const TZ = 'America/Sao_Paulo';

// Uma decisão por tela (docs/ux.md): ver a frente, mostrar o verso, dizer como foi. "Bom" é o
// destaque; cada botão mostra quando o cartão volta. Errar não é fracasso: o cartão só volta antes.
export function ReviewSession({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const card = cards[i];
  if (!card) {
    return (
      <Card className="grid justify-items-start gap-3">
        <p className="font-display text-2xl">Revisão feita!</p>
        <p className="text-muted">
          {cards.length} {cards.length === 1 ? 'cartão revisado' : 'cartões revisados'}. Eles voltam
          no dia certo.
        </p>
        <Link href="/estudar" className={buttonClass()}>
          Voltar para Hoje
        </Link>
      </Card>
    );
  }
  const intervals = previewIntervals(card, new Date(), TZ);
  const rate = (rating: Rating) =>
    start(async () => {
      const r = await reviewCard(card.id, rating);
      if (!r.ok) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setShown(false);
      setI((n) => n + 1);
    });
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Cartão {i + 1} de {cards.length}
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={i}
        aria-label="Cartões revisados"
      >
        <div className="h-full bg-accent" style={{ width: `${(i / cards.length) * 100}%` }} />
      </div>
      {failed ? <Alert tone="danger">Não deu para salvar. Tente de novo.</Alert> : null}
      <Card className="grid min-h-48 content-center gap-4 text-center">
        <p className="font-display text-2xl">{card.front}</p>
        {shown ? <p className="text-xl">{card.back}</p> : null}
      </Card>
      {shown ? (
        <div className="sticky bottom-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([0, 1, 2, 3] as Rating[]).map((r) => (
            <Button
              key={r}
              size="lg"
              variant={r === 2 ? 'primary' : 'secondary'}
              loading={pending}
              onClick={() => rate(r)}
              className="flex-col gap-0"
            >
              <span>{RATING_LABEL[r]}</span>
              <span className="text-xs font-normal opacity-80">{intervals[r]}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Button size="lg" onClick={() => setShown(true)} className="sticky bottom-3">
          Mostrar resposta
        </Button>
      )}
    </div>
  );
}
