"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  /** Returns a base64 PNG data URL, or null if nothing has been drawn. */
  toDataURL: () => string | null;
}

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  /** Fired every time the signature changes (drawn on, or cleared). */
  onChange?: (dataUrl: string | null) => void;
  className?: string;
}

/**
 * A touch/mouse/pen-friendly signature canvas. Renders at devicePixelRatio
 * so signatures stay crisp on retina phone screens, and exposes an
 * imperative handle so the parent form can pull the final PNG on submit.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onChange, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const lastPoint = useRef<Point | null>(null);
    const hasInk = useRef(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const getContext = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d");
    }, []);

    // Size the backing store for the device pixel ratio, keep CSS size fixed.
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#701a75";
      }
    }, []);

    useEffect(() => {
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const emitChange = useCallback(() => {
      const canvas = canvasRef.current;
      onChange?.(hasInk.current && canvas ? canvas.toDataURL("image/png") : null);
    }, [onChange]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const ctx = getContext();
      if (!ctx) return;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      drawing.current = true;
      const point = getPoint(e);
      lastPoint.current = point;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current) return;
      const ctx = getContext();
      if (!ctx) return;
      const point = getPoint(e);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPoint.current = point;
      if (!hasInk.current) {
        hasInk.current = true;
        setIsEmpty(false);
      }
    };

    const endStroke = () => {
      if (!drawing.current) return;
      drawing.current = false;
      lastPoint.current = null;
      emitChange();
    };

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      hasInk.current = false;
      setIsEmpty(true);
      onChange?.(null);
    }, [getContext, onChange]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        isEmpty: () => !hasInk.current,
        toDataURL: () => (hasInk.current ? canvasRef.current?.toDataURL("image/png") ?? null : null),
      }),
      [clear]
    );

    return (
      <div className={className}>
        <div className="relative rounded-xl border-2 border-dashed border-brand-200 bg-white">
          <canvas
            ref={canvasRef}
            className="h-40 w-full touch-none rounded-xl"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
          {isEmpty && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              חתמו כאן באצבע או בעט חכם
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={clear}
          className="mt-2 text-sm font-medium text-brand-600 active:text-brand-800"
        >
          נקה חתימה
        </button>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
