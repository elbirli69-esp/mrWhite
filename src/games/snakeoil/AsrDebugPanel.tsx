import { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { normalizeGameTranscript } from './asrNormalize';

const SAMPLE_LINES = [
  'Este es el DinoSock 3000, un calcetín inteligente capaz de detectar dinosaurios.',
  'Mi producto utiliza una antena térmica para localizar dinosaurios.',
  'Si eres un astronauta y tienes miedo de los gatos, necesitas este producto.',
];

/**
 * Panel de diagnóstico ASR (?asr=1).
 * Compara texto simulado / normalización sin depender de micrófono.
 */
export function AsrDebugPanel({
  words,
  productName,
}: {
  words: string[];
  productName: string;
}) {
  const [raw, setRaw] = useState(SAMPLE_LINES[0]!);
  const result = useMemo(
    () => normalizeGameTranscript(raw, words.length ? words : ['calcetín', 'dinosaurio', 'microondas'], productName || 'DinoSock 3000'),
    [raw, words, productName],
  );

  return (
    <Card>
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
        🛠️ Diagnóstico ASR
      </p>
      <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
        Activo con <code>?asr=1</code>. Prueba frases y mira la normalización controlada.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLE_LINES.map((line) => (
          <button
            key={line}
            type="button"
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-left text-xs"
            onClick={() => setRaw(line)}
          >
            {line.slice(0, 42)}…
          </button>
        ))}
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm"
      />
      <p className="mt-3 text-[length:var(--text-body-sm)]">
        <span className="font-semibold">Normalizada:</span> {result.normalized || '—'}
      </p>
      {result.hits.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-xs text-[var(--color-text-muted)]">
          {result.hits.map((h) => (
            <li key={`${h.from}-${h.to}`}>
              {h.from} → {h.to} ({h.reason})
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Sin correcciones léxicas.</p>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          try {
            localStorage.setItem('snakeoil-asr-debug', '1');
          } catch {
            /* ignore */
          }
        }}
      >
        Fijar debug en localStorage
      </Button>
    </Card>
  );
}
