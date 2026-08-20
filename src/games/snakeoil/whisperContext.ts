import { spanishWhisperPromptWithLexicon } from '../hablaya/whisperLocal';
import type { Customer } from './types';

/** Contexto ASR para sesgar Whisper sin inventar el discurso. */
export function buildSnakeOilWhisperPrompt(input: {
  customer: Pick<Customer, 'name' | 'need'>;
  productName: string;
  words: string[];
}): string {
  const topic = `${input.productName} · cliente ${input.customer.name}`;
  return spanishWhisperPromptWithLexicon({
    topic,
    lexicon: [...input.words, input.productName, input.customer.name],
  });
}

export function snakeOilLexicon(input: {
  words: string[];
  productName: string;
  customerName?: string;
}): string[] {
  return [
    ...input.words,
    ...input.productName.split(/[\s\-_/]+/).filter((p) => p.length >= 3),
    ...(input.customerName ? [input.customerName] : []),
  ];
}
