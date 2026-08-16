import { useEffect, useRef } from 'react';
import type { Point, Stroke } from './logic';

interface DrawCanvasProps {
  strokes: Stroke[];
  currentPoints: Point[];
  onChangeCurrent: (points: Point[]) => void;
  enabled: boolean;
  className?: string;
}

function toLocal(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

function paint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Stroke[],
  currentPoints: Point[],
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111114';
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#f5f5f4';
  ctx.lineWidth = Math.max(3, Math.min(width, height) * 0.01);

  const drawPath = (points: Point[]) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x * width, points[0]!.y * height);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i]!.x * width, points[i]!.y * height);
    }
    ctx.stroke();
  };

  for (const stroke of strokes) drawPath(stroke.points);
  drawPath(currentPoints);
}

export function DrawCanvas({
  strokes,
  currentPoints,
  onChangeCurrent,
  enabled,
  className = '',
}: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const width = Math.floor(wrap.clientWidth);
      const height = Math.floor(wrap.clientHeight);
      if (width <= 0 || height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, width, height, strokes, currentPoints);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [strokes, currentPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width > 0 && height > 0) paint(ctx, width, height, strokes, currentPoints);
  }, [strokes, currentPoints]);

  const start = (clientX: number, clientY: number) => {
    if (!enabled || !canvasRef.current) return;
    drawingRef.current = true;
    pointsRef.current = [toLocal(canvasRef.current, clientX, clientY)];
    onChangeCurrent(pointsRef.current);
  };

  const move = (clientX: number, clientY: number) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const next = toLocal(canvasRef.current, clientX, clientY);
    pointsRef.current = [...pointsRef.current, next];
    onChangeCurrent(pointsRef.current);
  };

  const end = () => {
    drawingRef.current = false;
  };

  return (
    <div ref={wrapRef} className={['h-full w-full', className].filter(Boolean).join(' ')}>
      <canvas
        ref={canvasRef}
        className={[
          'touch-none block h-full w-full bg-[#111114]',
          enabled
            ? 'cursor-crosshair'
            : 'rounded-2xl border border-[var(--color-border)] opacity-95 shadow-[0_16px_48px_rgba(0,0,0,0.45)]',
        ].join(' ')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => move(e.clientX, e.clientY)}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  );
}
