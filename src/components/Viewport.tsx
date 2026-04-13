import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameObject, ScreenItem } from '../types';

const SAFE_W = 667;
const SAFE_H = 375;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

interface ViewportProps {
  objects: GameObject[];
  selectedObjectId: string | null;
  screens: ScreenItem[];
  gridSize: number;
  showGrid: boolean;
  gridOpacity: number;
  snapToGrid: boolean;
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (id: string, updates: Partial<GameObject>) => void;
}

function getDistance(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function getMidpoint(t1: React.Touch, t2: React.Touch) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export default function Viewport({
  objects,
  selectedObjectId,
  screens,
  gridSize,
  showGrid,
  gridOpacity,
  snapToGrid,
  onSelectObject,
  onUpdateObject,
}: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.82);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);

  const isPanning = useRef(false);
  const panAnchor = useRef({ px: 0, py: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const lastPinchDist = useRef<number | null>(null);
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null);

  const dragging = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startObjX: number;
    startObjY: number;
  } | null>(null);

  const spaceDown = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && !initialized) {
      const rect = containerRef.current.getBoundingClientRect();
      const initZoom = 0.82;
      setPan({
        x: rect.width / 2 - (SAFE_W * initZoom) / 2,
        y: rect.height / 2 - (SAFE_H * initZoom) / 2,
      });
      setInitialized(true);
    }
  }, [initialized]);

  const activeScreenIds = screens.filter(s => s.isSelected).map(s => s.id);
  const defaultScreen = screens.find(s => s.isDefault) || screens[0];

  const visibleObjects = objects.filter(obj => {
    if (!obj.visible) return false;
    if (activeScreenIds.length === 0) {
      if (!obj.screenId) return true;
      return defaultScreen ? obj.screenId === defaultScreen.id : true;
    }
    return obj.screenId ? activeScreenIds.includes(obj.screenId) : false;
  });

  const applyZoom = useCallback((factor: number, cx: number, cy: number) => {
    const prevZoom = zoomRef.current;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
    setPan(prev => ({
      x: cx - (cx - prev.x) * (newZoom / prevZoom),
      y: cy - (cy - prev.y) * (newZoom / prevZoom),
    }));
    setZoom(newZoom);
  }, []);

  const centerView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const z = 0.82;
    setZoom(z);
    setPan({
      x: rect.width / 2 - (SAFE_W * z) / 2,
      y: rect.height / 2 - (SAFE_H * z) / 2,
    });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    applyZoom(factor, cx, cy);
  }, [applyZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDownBackground = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || spaceDown.current || e.altKey) {
      isPanning.current = true;
      panAnchor.current = {
        px: e.clientX,
        py: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      e.preventDefault();
      return;
    }
    if (e.button === 0) {
      onSelectObject(null);
    }
  }, [onSelectObject]);

  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panAnchor.current.px;
      const dy = e.clientY - panAnchor.current.py;
      setPan({ x: panAnchor.current.panX + dx, y: panAnchor.current.panY + dy });
    }
    if (dragging.current) {
      const z = zoomRef.current;
      const dx = (e.clientX - dragging.current.startClientX) / z;
      const dy = (e.clientY - dragging.current.startClientY) / z;
      let nx = dragging.current.startObjX + dx;
      let ny = dragging.current.startObjY + dy;
      if (snapToGrid) {
        nx = Math.round(nx / gridSize) * gridSize;
        ny = Math.round(ny / gridSize) * gridSize;
      }
      onUpdateObject(dragging.current.id, { x: nx, y: ny });
    }
  }, [snapToGrid, gridSize, onUpdateObject]);

  const handleMouseUpGlobal = useCallback(() => {
    isPanning.current = false;
    dragging.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [handleMouseMoveGlobal, handleMouseUpGlobal]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      const mid = getMidpoint(e.touches[0], e.touches[1]);
      lastPinchDist.current = dist;
      lastPinchMid.current = mid;
      isPanning.current = true;
      panAnchor.current = {
        px: mid.x,
        py: mid.y,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const dist = getDistance(e.touches[0], e.touches[1]);
      const mid = getMidpoint(e.touches[0], e.touches[1]);
      const cx = mid.x - rect.left;
      const cy = mid.y - rect.top;

      if (lastPinchDist.current !== null && lastPinchMid.current !== null) {
        const scaleFactor = dist / lastPinchDist.current;
        const prevZoom = zoomRef.current;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * scaleFactor));

        const prevMidX = lastPinchMid.current.x - rect.left;
        const prevMidY = lastPinchMid.current.y - rect.top;
        const panDX = cx - prevMidX;
        const panDY = cy - prevMidY;

        setPan(prev => ({
          x: cx - (cx - prev.x) * (newZoom / prevZoom) + panDX,
          y: cy - (cy - prev.y) * (newZoom / prevZoom) + panDY,
        }));
        setZoom(newZoom);
      }
      lastPinchDist.current = dist;
      lastPinchMid.current = mid;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastPinchDist.current = null;
      lastPinchMid.current = null;
      isPanning.current = false;
    }
  }, []);

  const handleObjectPointerDown = useCallback(
    (e: React.PointerEvent, obj: GameObject) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onSelectObject(obj.id);
      dragging.current = {
        id: obj.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startObjX: obj.x,
        startObjY: obj.y,
      };
    },
    [onSelectObject]
  );

  const gridCellPx = gridSize * zoom;
  const gridOffsetX = ((pan.x % gridCellPx) + gridCellPx) % gridCellPx;
  const gridOffsetY = ((pan.y % gridCellPx) + gridCellPx) % gridCellPx;

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{ cursor: isPanning.current ? 'grabbing' : 'default', background: '#08090b' }}
      onMouseDown={handleMouseDownBackground}
      onContextMenu={e => e.preventDefault()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Infinite Grid Layer (fixed to container, no transform) ── */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: gridOpacity,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)
            `,
            backgroundSize: `${gridCellPx}px ${gridCellPx}px`,
            backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          }}
        />
      )}

      {/* ── Major grid lines (every 5 cells) ── */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: gridOpacity * 0.6,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
            `,
            backgroundSize: `${gridCellPx * 5}px ${gridCellPx * 5}px`,
            backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          }}
        />
      )}

      {/* ── Transformed Canvas ── */}
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: SAFE_W,
          height: SAFE_H,
          willChange: 'transform',
        }}
      >
        {/* ── Outer dim: box-shadow creates darkness outside safe zone ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
            zIndex: 1,
          }}
        />

        {/* ── Safe Zone Background ── */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #12141a 0%, #0e1016 100%)',
            zIndex: 0,
          }}
        />

        {/* ── Safe Zone Corner Markers ── */}
        {[
          { top: -1, left: -1, borderTop: '2px solid', borderLeft: '2px solid', w: 14, h: 14 },
          { top: -1, right: -1, borderTop: '2px solid', borderRight: '2px solid', w: 14, h: 14 },
          { bottom: -1, left: -1, borderBottom: '2px solid', borderLeft: '2px solid', w: 14, h: 14 },
          { bottom: -1, right: -1, borderBottom: '2px solid', borderRight: '2px solid', w: 14, h: 14 },
        ].map((style, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              ...style,
              width: style.w,
              height: style.h,
              borderColor: '#6366f1',
              zIndex: 5,
            }}
          />
        ))}

        {/* ── Safe Zone Boundary Frame ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: '1.5px solid rgba(99,102,241,0.65)',
            zIndex: 5,
            boxSizing: 'border-box',
          }}
        />

        {/* ── Safe Zone Label ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -22,
            left: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              background: '#6366f1',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '2px 8px',
              borderRadius: '3px 3px 0 0',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Safe Zone · {SAFE_W} × {SAFE_H}
          </div>
        </div>

        {/* ── Safe Zone Bottom Dimension label ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: -18,
            right: 0,
            zIndex: 10,
            fontSize: 8,
            fontWeight: 600,
            color: 'rgba(99,102,241,0.5)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          16:9 · LANDSCAPE
        </div>

        {/* ── Objects Layer ── */}
        <div className="absolute inset-0" style={{ zIndex: 3 }}>
          {visibleObjects
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(obj => {
              const isSelected = selectedObjectId === obj.id;
              return (
                <div
                  key={obj.id}
                  className="absolute"
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height,
                    transform: `rotate(${obj.rotation}deg)`,
                    opacity: obj.opacity,
                    zIndex: obj.zIndex,
                    cursor: 'move',
                    boxSizing: 'border-box',
                    backgroundColor: obj.type === 'sprite' || obj.type === 'button' ? obj.color : 'transparent',
                    borderRadius: obj.type === 'sprite' ? 3 : obj.type === 'button' ? 6 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: obj.color,
                    fontSize: obj.fontSize || 16,
                    fontWeight: 'bold',
                    userSelect: 'none',
                    border: obj.type === 'container' ? `2px dashed ${obj.color}` : 'none',
                  }}
                  onPointerDown={e => handleObjectPointerDown(e, obj)}
                >
                  {(obj.type === 'text' || obj.type === 'button') && (
                    <span style={{ pointerEvents: 'none' }}>{obj.text || obj.name}</span>
                  )}

                  {/* ── Selection Gizmo ── */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        border: '1.5px solid #6366f1',
                        outline: '1px solid rgba(99,102,241,0.3)',
                        outlineOffset: 2,
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Corner handles */}
                      {[
                        { top: -4, left: -4 },
                        { top: -4, right: -4 },
                        { bottom: -4, left: -4 },
                        { bottom: -4, right: -4 },
                        { top: '50%', right: -4, transform: 'translateY(-50%)' },
                        { top: '50%', left: -4, transform: 'translateY(-50%)' },
                        { left: '50%', top: -4, transform: 'translateX(-50%)' },
                        { left: '50%', bottom: -4, transform: 'translateX(-50%)' },
                      ].map((s, i) => (
                        <div
                          key={i}
                          className="absolute"
                          style={{
                            ...s,
                            width: 8,
                            height: 8,
                            background: '#fff',
                            border: '1.5px solid #6366f1',
                            borderRadius: 1,
                          }}
                        />
                      ))}

                      {/* Rotation handle */}
                      <div
                        className="absolute"
                        style={{
                          top: -24,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            background: '#fff',
                            border: '1.5px solid #6366f1',
                            borderRadius: '50%',
                            cursor: 'alias',
                          }}
                        />
                        <div style={{ width: 1, height: 10, background: 'rgba(99,102,241,0.6)' }} />
                      </div>

                      {/* Object name label */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          marginBottom: 18,
                          background: '#6366f1',
                          color: '#fff',
                          fontSize: 8,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 2,
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {obj.name}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Zoom Indicator (HUD, not in canvas transform) ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,11,16,0.85)',
          border: '1px solid rgba(99,102,241,0.25)',
          color: '#94a3b8',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '4px 12px',
          borderRadius: 20,
          backdropFilter: 'blur(8px)',
          zIndex: 50,
        }}
      >
        {zoomPercent}%
      </div>

      {/* ── Active Screen Indicator ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,11,16,0.85)',
          border: '1px solid rgba(99,102,241,0.2)',
          color: '#94a3b8',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '3px 10px',
          borderRadius: 20,
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#6366f1',
            display: 'inline-block',
          }}
        />
        {activeScreenIds.length > 0
          ? screens
              .filter(s => s.isSelected)
              .map(s => s.name)
              .join(', ')
          : defaultScreen
          ? `${defaultScreen.name} (Default)`
          : 'No Screen'}
      </div>

      {/* ── Center Reset Button (touch-friendly) ── */}
      <button
        className="absolute pointer-events-auto"
        onClick={centerView}
        style={{
          bottom: 14,
          right: 14,
          background: 'rgba(10,11,16,0.85)',
          border: '1px solid rgba(99,102,241,0.25)',
          color: '#94a3b8',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '5px 10px',
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Reset View
      </button>
    </div>
  );
}
