import confetti from 'canvas-confetti';

/** Lanza una ráfaga de confeti elegante (tonos claros + dorado). */
export function fireConfetti(): void {
  const colors = ['#F5F5F4', '#E8B86D', '#A8A29E', '#FFFFFF', '#D4A574'];

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.65 },
    colors,
    ticks: 200,
    gravity: 0.9,
    scalar: 1.05,
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
  }, 220);
}
