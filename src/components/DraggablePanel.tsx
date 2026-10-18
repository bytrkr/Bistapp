import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GripHorizontal,
  RotateCcw,
  Lock,
  Unlock,
  Minimize2,
  Maximize2,
  Move
} from 'lucide-react';

// Global z-index sayacı: sürüklenen veya tıklanan pencereyi en üste taşır
let globalTopZIndex = 40;

export const RESET_ALL_PANELS_EVENT = 'mt16:reset-all-draggable-panels';

export function triggerResetAllDraggablePanels(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RESET_ALL_PANELS_EVENT));
  }
}

export interface DraggablePanelProps {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  accentColor?: 'emerald' | 'cyan' | 'amber' | 'blue' | 'purple' | 'rose';
  children: React.ReactNode;
  className?: string;
  defaultLocked?: boolean;
  defaultCollapsed?: boolean;
  compactHeader?: boolean;
  defaultOffset?: { x: number; y: number };
}

interface OffsetPosition {
  x: number;
  y: number;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id,
  title,
  subtitle,
  badgeText,
  accentColor = 'emerald',
  children,
  className = '',
  defaultLocked = false,
  defaultCollapsed = false,
  compactHeader = false,
  defaultOffset = { x: 0, y: 0 },
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStartPointerRef = useRef<OffsetPosition>({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef<OffsetPosition>(defaultOffset);
  const initialRectRef = useRef<DOMRect | null>(null);
  const activeDraggingRef = useRef<boolean>(false);

  const [offset, setOffset] = useState<OffsetPosition>(defaultOffset);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(defaultLocked);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const [zIndex, setZIndex] = useState<number>(10);

  const isMoved = offset.x !== 0 || offset.y !== 0;

  const bringToFront = useCallback(() => {
    globalTopZIndex += 1;
    setZIndex(globalTopZIndex);
  }, []);

  const handleReset = useCallback(() => {
    activeDraggingRef.current = false;
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onGlobalReset = () => {
      activeDraggingRef.current = false;
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      setIsCollapsed(false);
    };
    window.addEventListener(RESET_ALL_PANELS_EVENT, onGlobalReset);
    return () => {
      window.removeEventListener(RESET_ALL_PANELS_EVENT, onGlobalReset);
    };
  }, []);

  // Ekran yeniden boyutlandığında sınırların dışına taşmayı engelle
  useEffect(() => {
    const handleResize = () => {
      if (!panelRef.current || (offset.x === 0 && offset.y === 0)) return;
      const rect = panelRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let nextX = offset.x;
      let nextY = offset.y;

      const minVisibleX = Math.min(120, rect.width * 0.35);
      if (rect.right < minVisibleX) {
        nextX += minVisibleX - rect.right;
      } else if (rect.left > vw - minVisibleX) {
        nextX -= rect.left - (vw - minVisibleX);
      }

      if (rect.top < 8) {
        nextY += 8 - rect.top;
      } else if (rect.top > vh - 64) {
        nextY -= rect.top - (vh - 64);
      }

      if (nextX !== offset.x || nextY !== offset.y) {
        setOffset({ x: Math.round(nextX), y: Math.round(nextY) });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [offset]);

  const applyClampedDrag = useCallback((clientX: number, clientY: number) => {
    if (!activeDraggingRef.current || isLocked) return;

    const rawDx = clientX - dragStartPointerRef.current.x;
    const rawDy = clientY - dragStartPointerRef.current.y;

    let nextX = dragStartOffsetRef.current.x + rawDx;
    let nextY = dragStartOffsetRef.current.y + rawDy;

    // Sınır ve Taşma Korunumu (Boundary Clamping)
    if (typeof window !== 'undefined' && initialRectRef.current) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const base = initialRectRef.current;

      // Yatay sınır: panelin başlık çubuğunun en az %60'ı veya 140px'i görünür kalmalı
      const marginX = Math.min(90, base.width * 0.25);
      const minX = -base.left + 8 - marginX;
      const maxX = vw - (base.left + base.width) - 8 + marginX;

      // Dikey sınır: üst başlık ekranın en üstünden (8px) çıkamaz
      const minY = -base.top + 8;
      const maxY = Math.max(minY + 140, vh - base.top - 56);

      nextX = Math.max(minX, Math.min(maxX, nextX));
      nextY = Math.max(minY, Math.min(maxY, nextY));
    }

    setOffset({
      x: Math.round(nextX),
      y: Math.round(nextY),
    });
  }, [isLocked]);

  // Global window pointer/mouse/touch dinleyicileri: hızlı sürüklemede imleç dışarı çıksa bile kesintisiz takip
  useEffect(() => {
    if (!isDragging) return;

    const onWindowPointerMove = (ev: PointerEvent) => {
      applyClampedDrag(ev.clientX, ev.clientY);
    };

    const onWindowPointerUp = () => {
      activeDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [isDragging, applyClampedDrag]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isLocked) return;
      // Sağ tık veya buton/input tıklamalarını yoksay
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const targetEl = e.target as HTMLElement;
      if (
        targetEl.closest('button') ||
        targetEl.closest('input') ||
        targetEl.closest('a') ||
        targetEl.closest('select') ||
        targetEl.closest('textarea')
      ) {
        return;
      }

      bringToFront();

      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        // Orijinal (offset'siz) kutu koordinatlarını kaydet
        initialRectRef.current = new DOMRect(
          rect.left - offset.x,
          rect.top - offset.y,
          rect.width,
          rect.height
        );
      }

      dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
      dragStartOffsetRef.current = { x: offset.x, y: offset.y };
      activeDraggingRef.current = true;
      setIsDragging(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Sentetik olaylarda veya desteklenmeyen ortamlarda window listener devrededir
      }
    },
    [isLocked, offset.x, offset.y, bringToFront]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || isLocked) return;
      applyClampedDrag(e.clientX, e.clientY);
    },
    [isDragging, isLocked, applyClampedDrag]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      activeDraggingRef.current = false;
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    },
    [isDragging]
  );

  const accentBorderMap: Record<NonNullable<DraggablePanelProps['accentColor']>, string> = {
    emerald: isDragging
      ? 'border-emerald-400/95 ring-2 ring-emerald-400/45 shadow-[0_24px_64px_rgba(16,185,129,0.4)]'
      : 'border-emerald-500/25 hover:border-emerald-500/45',
    cyan: isDragging
      ? 'border-cyan-400/95 ring-2 ring-cyan-400/45 shadow-[0_24px_64px_rgba(6,182,212,0.4)]'
      : 'border-cyan-500/25 hover:border-cyan-500/45',
    amber: isDragging
      ? 'border-amber-400/95 ring-2 ring-amber-400/45 shadow-[0_24px_64px_rgba(245,158,11,0.4)]'
      : 'border-amber-500/25 hover:border-amber-500/45',
    blue: isDragging
      ? 'border-blue-400/95 ring-2 ring-blue-400/45 shadow-[0_24px_64px_rgba(59,130,246,0.4)]'
      : 'border-blue-500/25 hover:border-blue-500/45',
    purple: isDragging
      ? 'border-purple-400/95 ring-2 ring-purple-400/45 shadow-[0_24px_64px_rgba(168,85,247,0.4)]'
      : 'border-purple-500/25 hover:border-purple-500/45',
    rose: isDragging
      ? 'border-rose-400/95 ring-2 ring-rose-400/45 shadow-[0_24px_64px_rgba(244,63,94,0.4)]'
      : 'border-rose-500/25 hover:border-rose-500/45',
  };

  const accentBadgeMap: Record<NonNullable<DraggablePanelProps['accentColor']>, string> = {
    emerald: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
    cyan: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/35',
    amber: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
    blue: 'text-blue-300 bg-blue-500/15 border-blue-500/35',
    purple: 'text-purple-300 bg-purple-500/15 border-purple-500/35',
    rose: 'text-rose-300 bg-rose-500/15 border-rose-500/35',
  };

  return (
    <div
      ref={panelRef}
      data-panel-id={id}
      onMouseDown={bringToFront}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        zIndex: isDragging ? 999 : isMoved ? zIndex : undefined,
      }}
      className={`relative rounded-2xl border transition-[box-shadow,border-color,background-color,opacity] duration-200 ${
        isDragging
          ? 'bg-slate-900/60 backdrop-blur-2xl opacity-90 scale-[1.006] select-none'
          : isMoved
          ? 'bg-slate-900/85 backdrop-blur-xl shadow-[0_18px_52px_rgba(0,0,0,0.85)]'
          : 'bg-slate-900/45 backdrop-blur-md'
      } ${accentBorderMap[accentColor]} ${className}`}
    >
      {/* 🧭 TAKTİKSEL SAVAŞ ODASI SÜRÜKLENEBİLİR PENCERE BAŞLIĞI (DRAG HANDLE) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleReset}
        title={
          isLocked
            ? 'Pencere kilitli (Kilidi açmak için sağdaki ikona tıklayın)'
            : 'Savaş Odası Başlık Çubuğu: Tutup sürükleyerek taşıyın • Sıfırlamak için çift tıklayın'
        }
        className={`flex items-center justify-between gap-2 px-3.5 ${
          compactHeader ? 'py-1.5' : 'py-2'
        } rounded-t-2xl border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl select-none touch-none ${
          isLocked ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`p-1 rounded-lg border transition-colors ${
              isDragging
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-emerald-300'
            }`}
          >
            {isDragging ? <Move className="w-3.5 h-3.5 animate-pulse" /> : <GripHorizontal className="w-3.5 h-3.5" />}
          </div>

          <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-200 truncate">
            {title}
          </span>

          {subtitle && (
            <span className="hidden sm:inline text-[10px] font-mono text-slate-500 truncate">
              · {subtitle}
            </span>
          )}

          {badgeText && (
            <span
              className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${accentBadgeMap[accentColor]}`}
            >
              {badgeText}
            </span>
          )}
        </div>

        {/* Sağ Kontrol Aksiyonları: Koordinat, Sıfırla, Sabitle, Küçült */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(isMoved || isDragging) && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-500/35 text-[9px] font-mono text-cyan-300">
              X:{offset.x >= 0 ? `+${offset.x}` : offset.x} Y:{offset.y >= 0 ? `+${offset.y}` : offset.y}
            </span>
          )}

          {isMoved && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
              title="Pencereyi Orijinal Konumuna Sıfırla"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Hizala</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(prev => !prev);
            }}
            className={`p-1 rounded-lg border text-[10px] transition cursor-pointer ${
              isLocked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isLocked ? 'Pencere Kilidini Aç' : 'Pencere Konumunu Sabitle'}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(prev => !prev);
            }}
            className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
            title={isCollapsed ? 'Pencereyi Genişlet' : 'Pencereyi Küçült'}
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* PENCERE İÇERİĞİ */}
      {!isCollapsed && (
        <div className={isDragging ? 'pointer-events-none' : ''}>
          {children}
        </div>
      )}
    </div>
  );
};
