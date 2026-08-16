import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface OnlineJoinPageProps {
  connectionLabel: string;
  error: string | null;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  onBack: () => void;
}

export function OnlineJoinPage({
  connectionLabel,
  error,
  onCreate,
  onJoin,
  onBack,
}: OnlineJoinPageProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && (mode === 'create' || code.trim().length >= 3);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Sala online
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Entra con tu nombre. El anfitrión comparte el código.
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{connectionLabel}</p>
      </header>

      <Card>
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={[
              'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              mode === 'create'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)]',
            ].join(' ')}
          >
            Crear sala
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={[
              'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              mode === 'join'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)]',
            ].join(' ')}
          >
            Unirme
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm text-[var(--color-text-muted)]">Tu nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder="Cómo te ven los demás"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        {mode === 'join' ? (
          <label className="mb-4 block">
            <span className="mb-2 block text-sm text-[var(--color-text-muted)]">Código de sala</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              placeholder="AB7K"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 font-mono text-lg tracking-[0.2em] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
          </label>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            disabled={!canSubmit}
            onClick={() => {
              if (mode === 'create') onCreate(trimmedName);
              else onJoin(code.trim(), trimmedName);
            }}
          >
            {mode === 'create' ? 'Crear sala' : 'Entrar a la sala'}
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
}
