import { describe, expect, it } from 'vitest';
import { buildHablaYaSystemPrompt, buildHablaYaUserPrompt } from './hablayaScore';

describe('Habla ya DeepSeek prompts', () => {
  it('avisa de que el texto es transcripción ASR e ignora fallos de palabras', () => {
    const system = buildHablaYaSystemPrompt('serious');
    expect(system).toMatch(/TRANSCRIPCI[ÓO]N automática/i);
    expect(system).toMatch(/Whisper|ASR|reconocidas/i);
    expect(system).toMatch(/No bajes la nota por errores/i);

    const invented = buildHablaYaSystemPrompt('invented');
    expect(invented).toMatch(/TRANSCRIPCI[ÓO]N automática/i);
    expect(invented).toMatch(/invent/i);
  });

  it('marca el user prompt como transcripción imperfecta', () => {
    const user = buildHablaYaUserPrompt({
      category: 'Avión',
      topicMode: 'serious',
      durationSec: 45,
      transcript: 'Una avión sirve para volar, Airbus y Boeing.',
    });
    expect(user).toMatch(/transcripción automática/i);
    expect(user).toMatch(/imperfecta|reconocimiento/i);
    expect(user).toContain('Una avión sirve para volar');
    expect(user).toContain('Avión');
  });
});
