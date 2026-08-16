import { useEffect, useRef } from 'react';
import type { Point, Stroke } from './logic';

interface DrawCanvasProps {
  strokes: Stroke[];
  currentPoints: Point[];
  onChangeCurrent: (points: Point[]) => void;
  enabled: boolean;
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
  ctx.lineWidth = Math.max(2.5, width * 0.008);

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

export function DrawCanvas({ strokes, currentPoints, onChangeCurrent, enabled }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const size = Math.min(parent.clientWidth, parent.clientHeight || parent.clientWidth);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, size, size, strokes, currentPoints);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [strokes, currentPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    paint(ctx, width, height, strokes, currentPoints);
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
    <canvas
      ref={canvasRef}
      className={[
        'touch-none rounded-3xl border border-[var(--color-border)] bg-[#111114]',
        enabled ? 'cursor-crosshair' : 'opacity-90',
      ].join(' ')}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
