'use client';
import { useState, useTransition } from 'react';
import { Button } from '@gutta/ui/button';
import { Alert, Card } from '@gutta/ui/card';
import { Textarea } from '@gutta/ui/field';
import {
  answerQuestion,
  submitAttempt,
  type AnswerFeedback,
} from '@/app/estudar/avaliacoes/actions';

type Answer = { choice?: number; value?: boolean; text?: string };
type Q = {
  pos: number;
  kind: 'multiple_choice' | 'true_false' | 'short_answer';
  stem: string;
  options: string[] | null;
  answer: Answer | null;
  isCorrect: boolean | null;
  explanation: string | null;
};

type Speech = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onend: () => void;
  start: () => void;
};

// Uma questão por tela, com progresso visível (docs/ux.md). No simulado, a correção vem na
// hora; na prova, as respostas são guardadas e a nota sai ao enviar. Errar não é fracasso.
export function AttemptRunner({
  attemptId,
  practice,
  questions,
}: {
  attemptId: string;
  practice: boolean;
  questions: Q[];
}) {
  const [i, setI] = useState(() =>
    Math.max(
      0,
      questions.findIndex((q) => !q.answer),
    ),
  );
  const [answers, setAnswers] = useState<Record<number, Answer | null>>(
    Object.fromEntries(questions.map((q) => [q.pos, q.answer])),
  );
  const [feedback, setFeedback] = useState<Record<number, AnswerFeedback>>(
    Object.fromEntries(
      questions
        .filter((q) => q.isCorrect !== null)
        .map((q) => [q.pos, { ok: true, correct: q.isCorrect!, explanation: q.explanation }]),
    ),
  );
  const [draft, setDraft] = useState<Answer | null>(null);
  const [error, setError] = useState(false);
  const [listening, setListening] = useState(false);
  const [pending, start] = useTransition();
  const atEnd = i >= questions.length;
  const q = questions[Math.min(i, questions.length - 1)]!;
  const saved = answers[q.pos] ?? null;
  const current = draft ?? saved;
  const fb = feedback[q.pos];
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const save = () => {
    if (!current) return;
    start(async () => {
      const r = await answerQuestion(attemptId, q.pos, current);
      if (!r.ok) {
        setError(true);
        return;
      }
      setError(false);
      setAnswers((a) => ({ ...a, [q.pos]: current }));
      setDraft(null);
      if (practice) setFeedback((f) => ({ ...f, [q.pos]: r }));
      else setI((n) => n + 1);
    });
  };

  const dictate = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Speech;
      webkitSpeechRecognition?: new () => Speech;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.onresult = (e) =>
      setDraft({
        text: `${current?.text ? `${current.text} ` : ''}${e.results[0]![0].transcript}`,
      });
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  if (atEnd) {
    return (
      <Card className="grid justify-items-start gap-3">
        <p className="font-display text-2xl">Pronto para enviar?</p>
        <p className="text-muted">
          Você respondeu {answeredCount} de {questions.length}. Questão sem resposta conta como
          errada.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" loading={pending} onClick={() => start(() => submitAttempt(attemptId))}>
            {practice ? 'Ver o resultado' : 'Enviar prova'}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setI(0)}>
            Revisar respostas
          </Button>
        </div>
      </Card>
    );
  }

  const choose = (a: Answer) => {
    if (practice && fb) return;
    setDraft(a);
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Questão {i + 1} de {questions.length}
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answeredCount}
        aria-label="Questões respondidas"
      >
        <div
          className="h-full bg-accent"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>
      {error ? <Alert tone="danger">Não deu para salvar. Tente de novo.</Alert> : null}
      <Card className="grid gap-4">
        <p className="font-display text-xl">{q.stem}</p>
        {q.kind === 'multiple_choice' ? (
          <div className="grid gap-2" role="radiogroup" aria-label="Alternativas">
            {q.options?.map((o, k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={current?.choice === k}
                onClick={() => choose({ choice: k })}
                className="min-h-12 rounded-[var(--radius)] border border-line-strong px-4 text-left aria-checked:border-accent aria-checked:bg-accent-soft"
              >
                {String.fromCharCode(97 + k)}) {o}
              </button>
            ))}
          </div>
        ) : null}
        {q.kind === 'true_false' ? (
          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Verdadeiro ou falso"
          >
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={current?.value === v}
                onClick={() => choose({ value: v })}
                className="min-h-12 rounded-[var(--radius)] border border-line-strong px-4 font-semibold aria-checked:border-accent aria-checked:bg-accent-soft"
              >
                {v ? 'Verdadeiro' : 'Falso'}
              </button>
            ))}
          </div>
        ) : null}
        {q.kind === 'short_answer' ? (
          <div className="grid gap-2">
            <Textarea
              aria-label="Sua resposta"
              rows={4}
              value={current?.text ?? ''}
              onChange={(e) => choose({ text: e.target.value })}
              readOnly={Boolean(practice && fb)}
            />
            {!(practice && fb) ? (
              <Button
                type="button"
                variant="ghost"
                onClick={dictate}
                loading={listening}
                className="justify-self-start"
              >
                Responder falando
              </Button>
            ) : null}
          </div>
        ) : null}
        {practice && fb ? (
          <Alert tone={fb.correct ? 'success' : 'warn'}>
            <b>{fb.correct ? 'Isso aí!' : 'Quase!'}</b> {fb.explanation ?? ''}
            {!fb.correct && fb.model_answer ? (
              <span className="block">Uma boa resposta: {fb.model_answer}</span>
            ) : null}
          </Alert>
        ) : null}
      </Card>
      <div className="sticky bottom-3 flex flex-wrap gap-2">
        {i > 0 ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setDraft(null);
              setI((n) => n - 1);
            }}
          >
            Voltar
          </Button>
        ) : null}
        {practice && fb ? (
          <Button size="lg" onClick={() => setI((n) => n + 1)}>
            {i + 1 === questions.length ? 'Terminar' : 'Próxima'}
          </Button>
        ) : (
          <Button size="lg" loading={pending} disabled={!current} onClick={save}>
            {practice
              ? 'Responder'
              : i + 1 === questions.length
                ? 'Guardar e terminar'
                : 'Guardar e seguir'}
          </Button>
        )}
        {!practice ? (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setDraft(null);
              setI((n) => n + 1);
            }}
          >
            Pular
          </Button>
        ) : null}
      </div>
    </div>
  );
}
