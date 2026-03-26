import React, { forwardRef, useRef, useState, useCallback, useEffect } from 'react';
import { DiagramElement, Connector, ActiveTool } from '../types';

interface CanvasProps {
  elements: DiagramElement[];
  connectors: Connector[];
  selectedId: string | null;
  selectedConnectorId: string | null;
  connectingFrom: string | null;
  activeTool: ActiveTool;
  onCanvasClick: (x: number, y: number) => void;
  onSelectElement: (id: string | null) => void;
  onSelectConnector: (id: string | null) => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onDeleteElement: (id: string) => void;
  onDeleteConnector: (id: string) => void;
  onCancelConnectorMode: () => void;
}

const Canvas = forwardRef<SVGSVGElement, CanvasProps>(({
  elements, connectors, selectedId, selectedConnectorId, connectingFrom, activeTool,
  onCanvasClick, onSelectElement, onSelectConnector, onMoveElement, onDeleteElement, onDeleteConnector, onCancelConnectorMode,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<{
    id: string; startX: number; startY: number; elX: number; elY: number;
  } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [skipMouseUpClick, setSkipMouseUpClick] = useState(false);

  const connectorTools: ActiveTool[] = ['association', 'inheritance', 'realization', 'dependency', 'aggregation', 'composition', 'include', 'extend'];

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or alt+click => pan
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
      e.preventDefault();
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Check if clicking on an element
    const clickedEl = [...elements].reverse().find(el =>
      x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
    );

    if (clickedEl && activeTool === 'select') {
      setDragging({
        id: clickedEl.id,
        startX: e.clientX,
        startY: e.clientY,
        elX: clickedEl.x,
        elY: clickedEl.y,
      });
      onSelectElement(clickedEl.id);
      onSelectConnector(null);
      return;
    }

    if (activeTool === 'select') {
      const hitTolerance = 6 / zoom;

      const pointSegmentDistance = (
        px: number,
        py: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
      ) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        const cx = x1 + t * dx;
        const cy = y1 + t * dy;
        return Math.hypot(px - cx, py - cy);
      };

      let clickedConnector: Connector | null = null;
      for (let i = connectors.length - 1; i >= 0; i--) {
        const conn = connectors[i];
        const source = elements.find(el => el.id === conn.source_id);
        const target = elements.find(el => el.id === conn.target_id);
        if (!source || !target) continue;

        const sc = getCenterPoint(source);
        const tc = getCenterPoint(target);
        const isAssociation = conn.relation_type === 'association';
        const sp = isAssociation ? getPerimeterPoint(source, tc.x, tc.y) : getEdgePoint(source, tc.x, tc.y);
        const ep = isAssociation ? getPerimeterPoint(target, sc.x, sc.y) : getEdgePoint(target, sc.x, sc.y);
        const d = pointSegmentDistance(x, y, sp.x, sp.y, ep.x, ep.y);

        if (d <= hitTolerance) {
          clickedConnector = conn;
          break;
        }
      }

      if (clickedConnector) {
        onSelectConnector(clickedConnector.id);
        onSelectElement(null);
        setSkipMouseUpClick(true);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos(pos);

    if (panning) {
      setPan({
        x: panning.panX + (e.clientX - panning.startX),
        y: panning.panY + (e.clientY - panning.startY),
      });
      return;
    }

    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      const newX = Math.round((dragging.elX + dx) / 10) * 10; // snap-to-grid
      const newY = Math.round((dragging.elY + dy) / 10) * 10;
      onMoveElement(dragging.id, newX, newY);
      return;
    }

    const isConnectorTool = connectorTools.includes(activeTool);
    if (isConnectorTool && connectingFrom) {
      const snapThreshold = 18 / zoom; // keep snapping distance visually consistent across zoom levels

      const distanceToRect = (el: DiagramElement, x: number, y: number) => {
        const dx = Math.max(el.x - x, 0, x - (el.x + el.width));
        const dy = Math.max(el.y - y, 0, y - (el.y + el.height));
        return Math.hypot(dx, dy);
      };

      let best: { id: string; dist: number } | null = null;
      for (const el of elements) {
        if (el.id === connectingFrom) continue;
        const d = distanceToRect(el, pos.x, pos.y);
        if (d <= snapThreshold && (!best || d < best.dist)) {
          best = { id: el.id, dist: d };
        }
      }

      setHoverTargetId(best?.id || null);
    } else if (hoverTargetId) {
      setHoverTargetId(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (skipMouseUpClick) {
      setSkipMouseUpClick(false);
      return;
    }

    if (panning) {
      setPanning(null);
      return;
    }

    if (dragging) {
      setDragging(null);
      return;
    }

    // Canvas click (create element or connect)
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    const isConnectorTool = connectorTools.includes(activeTool);
    if (isConnectorTool && connectingFrom && hoverTargetId) {
      const targetEl = elements.find(el => el.id === hoverTargetId);
      if (targetEl) {
        const cx = targetEl.x + targetEl.width / 2;
        const cy = targetEl.y + targetEl.height / 2;
        onCanvasClick(cx, cy);
        return;
      }
    }

    onCanvasClick(x, y);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(3, Math.max(0.2, z * delta)));
  };

  // Keyboard handler — Delete removes selection; Escape cancels connector mode and deselects
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === 'Delete' && selectedId) {
        e.preventDefault();
        onDeleteElement(selectedId);
        return;
      }

      if (e.key === 'Delete' && selectedConnectorId) {
        e.preventDefault();
        onDeleteConnector(selectedConnectorId);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onSelectElement(null);
        onSelectConnector(null);
        onCancelConnectorMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, selectedConnectorId, onDeleteConnector, onCancelConnectorMode, onSelectConnector]);

  // Get center point of element for connectors
  function getCenterPoint(el: DiagramElement) {
    return {
      x: el.x + el.width / 2,
      y: el.y + el.height / 2,
    };
  }

  // Get edge point of rect towards a target point by snapping to one of 4 hardpoints
  function getEdgePoint(el: DiagramElement, targetX: number, targetY: number) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    
    // The 4 hardpoints of any element
    const hardpoints = [
      { x: cx, y: el.y },                // Top
      { x: cx, y: el.y + el.height },    // Bottom
      { x: el.x, y: cy },                // Left
      { x: el.x + el.width, y: cy }      // Right
    ];

    // Find the hardpoint closest to the target coordinate
    let minD = Infinity;
    let best = hardpoints[0];
    for (const p of hardpoints) {
      const d = Math.hypot(p.x - targetX, p.y - targetY);
      if (d < minD) {
        minD = d;
        best = p;
      }
    }
    return best;
  }

  // Get continuous perimeter intersection (no hardpoint snapping)
  function getPerimeterPoint(el: DiagramElement, targetX: number, targetY: number) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const dx = targetX - cx;
    const dy = targetY - cy;

    if (dx === 0 && dy === 0) {
      return { x: cx, y: cy };
    }

    const halfW = el.width / 2;
    const halfH = el.height / 2;

    if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) {
      const x = cx + Math.sign(dx) * halfW;
      const y = cy + dy * (halfW / Math.abs(dx));
      return { x, y };
    }

    const y = cy + Math.sign(dy) * halfH;
    const x = cx + dx * (halfH / Math.abs(dy));
    return { x, y };
  }

  // Render relationship arrow markers
  function renderMarkerDefs() {
    return (
      <defs>
        <marker id="arrow-association" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0,0 10,4 0,8" fill="#555" />
        </marker>
        <marker id="arrow-inheritance" markerWidth="12" markerHeight="10" refX="12" refY="5" orient="auto">
          <polygon points="0,0 12,5 0,10" fill="none" stroke="#555" strokeWidth="1.5" />
        </marker>
        <marker id="arrow-realization" markerWidth="12" markerHeight="10" refX="12" refY="5" orient="auto">
          <polygon points="0,0 12,5 0,10" fill="none" stroke="#555" strokeWidth="1.5" />
        </marker>
        <marker id="arrow-dependency" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0,0 10,4 0,8" fill="none" stroke="#555" strokeWidth="1.5" />
        </marker>
        <marker id="arrow-aggregation" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto">
          <polygon points="0,5 7,0 14,5 7,10" fill="none" stroke="#555" strokeWidth="1.5" />
        </marker>
        <marker id="arrow-composition" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto">
          <polygon points="0,5 7,0 14,5 7,10" fill="#555" />
        </marker>
        {/* Dot grid pattern */}
        <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="var(--canvas-grid-dot, #B9C6D8)" />
        </pattern>
      </defs>
    );
  }

  // Render single element
  function renderElement(el: DiagramElement) {
    const isSelected = el.id === selectedId;
    const isConnectingSource = el.id === connectingFrom;

    switch (el.element_type) {
      case 'class-box':
        return renderClassBox(el, isSelected, isConnectingSource);
      case 'actor':
        return renderActor(el, isSelected, isConnectingSource, 'default');
      case 'actor-user':
        return renderActor(el, isSelected, isConnectingSource, 'user');
      case 'actor-admin':
        return renderActor(el, isSelected, isConnectingSource, 'admin');
      case 'actor-system':
        return renderActor(el, isSelected, isConnectingSource, 'system');
      case 'usecase':
        return renderUseCase(el, isSelected, isConnectingSource);
      case 'component':
        return renderComponent(el, isSelected, isConnectingSource);
      case 'node':
        return renderNode(el, isSelected, isConnectingSource);
      case 'state':
      case 'activity':
        return renderRoundedBox(el, isSelected, isConnectingSource);
      default:
        return renderDefaultBox(el, isSelected, isConnectingSource);
    }
  }

  function selectionRect(el: DiagramElement, isSelected: boolean) {
    if (!isSelected) return null;
    return (
      <rect
        x={el.x - 4} y={el.y - 4}
        width={el.width + 8} height={el.height + 8}
        rx={6} fill="none"
        stroke="var(--brand-500)" strokeWidth="1.5" strokeDasharray="5 3"
      />
    );
  }

  function renderClassBox(el: DiagramElement, isSelected: boolean, isConnSrc: boolean) {
    const attrs = el.attributes || [];
    const methods = el.methods || [];
    const nameH = 28;
    const attrH = Math.max(attrs.length * 16 + 8, 24);
    const methH = Math.max(methods.length * 16 + 8, 24);
    const totalH = nameH + attrH + methH;

    return (
      <g key={el.id}>
        {selectionRect({ ...el, height: totalH }, isSelected)}
        <rect x={el.x} y={el.y} width={el.width} height={totalH}
          rx={4} fill={el.fill} stroke={isConnSrc ? '#534AB7' : el.stroke} strokeWidth={isConnSrc ? 2 : 1} />
        {/* Name compartment */}
        <text x={el.x + el.width / 2} y={el.y + 18}
          textAnchor="middle" fontSize="12" fontWeight="600"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">
          {el.label}
        </text>
        <line x1={el.x} y1={el.y + nameH} x2={el.x + el.width} y2={el.y + nameH}
          stroke={el.stroke} strokeWidth={0.8} />
        {/* Attributes */}
        {attrs.map((a, i) => (
          <text key={`a${i}`} x={el.x + 8} y={el.y + nameH + 16 + i * 16}
            fontSize="11" fill="#333" fontFamily="Inter, sans-serif">
            {a.visibility}{a.name}: {a.type}
          </text>
        ))}
        <line x1={el.x} y1={el.y + nameH + attrH} x2={el.x + el.width} y2={el.y + nameH + attrH}
          stroke={el.stroke} strokeWidth={0.8} />
        {/* Methods */}
        {methods.map((m, i) => (
          <text key={`m${i}`} x={el.x + 8} y={el.y + nameH + attrH + 16 + i * 16}
            fontSize="11" fill="#333" fontFamily="Inter, sans-serif">
            {m.visibility}{m.name}({m.params}): {m.returnType}
          </text>
        ))}
      </g>
    );
  }

  function renderActor(
    el: DiagramElement,
    isSelected: boolean,
    isConnSrc: boolean,
    variant: 'default' | 'user' | 'admin' | 'system',
  ) {
    const cx = el.x + el.width / 2;
    const headR = 10;
    const headY = el.y + headR + 4;
    const bodyTopY = headY + headR;
    const bodyBottomY = bodyTopY + 28;
    const armY = bodyTopY + 10;
    const legSpread = 14;
    const s = isConnSrc ? '#534AB7' : (el.stroke || '#555');
    return (
      <g key={el.id}>
        {selectionRect(el, isSelected)}
        <circle cx={cx} cy={headY} r={headR} fill="none" stroke={s} strokeWidth="1.5" />
        <line x1={cx} y1={bodyTopY} x2={cx} y2={bodyBottomY} stroke={s} strokeWidth="1.5" />
        <line x1={cx - legSpread} y1={armY} x2={cx + legSpread} y2={armY} stroke={s} strokeWidth="1.5" />
        <line x1={cx} y1={bodyBottomY} x2={cx - legSpread} y2={bodyBottomY + 20} stroke={s} strokeWidth="1.5" />
        <line x1={cx} y1={bodyBottomY} x2={cx + legSpread} y2={bodyBottomY + 20} stroke={s} strokeWidth="1.5" />
        {variant === 'user' && (
          <circle cx={cx + 14} cy={headY - 8} r={4.5} fill="none" stroke={s} strokeWidth="1" />
        )}
        {variant === 'admin' && (
          <path
            d={`M${cx} ${headY - 16} L${cx + 4} ${headY - 10} L${cx + 9} ${headY - 11} L${cx + 7} ${headY - 6} L${cx + 11} ${headY - 2} L${cx + 6} ${headY - 1} L${cx + 3} ${headY + 4} L${cx} ${headY} L${cx - 3} ${headY + 4} L${cx - 6} ${headY - 1} L${cx - 11} ${headY - 2} L${cx - 7} ${headY - 6} L${cx - 9} ${headY - 11} L${cx - 4} ${headY - 10} Z`}
            fill="none"
            stroke={s}
            strokeWidth="0.9"
          />
        )}
        {variant === 'system' && (
          <rect x={cx + 8} y={headY - 12} width={10} height={10} rx={1.5} fill="none" stroke={s} strokeWidth="1" />
        )}
        <text x={cx} y={el.y + el.height - 2} textAnchor="middle" fontSize="11"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">{el.label}</text>
      </g>
    );
  }

  function renderUseCase(el: DiagramElement, isSelected: boolean, isConnSrc: boolean) {
    return (
      <g key={el.id}>
        {selectionRect(el, isSelected)}
        <ellipse cx={el.x + el.width / 2} cy={el.y + el.height / 2}
          rx={el.width / 2} ry={el.height / 2}
          fill={el.fill} stroke={isConnSrc ? '#534AB7' : el.stroke} strokeWidth={isConnSrc ? 2 : 1} />
        <text x={el.x + el.width / 2} y={el.y + el.height / 2 + 4}
          textAnchor="middle" fontSize="11" fontWeight="500"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">{el.label}</text>
      </g>
    );
  }

  function renderComponent(el: DiagramElement, isSelected: boolean, isConnSrc: boolean) {
    return (
      <g key={el.id}>
        {selectionRect(el, isSelected)}
        <rect x={el.x} y={el.y} width={el.width} height={el.height}
          rx={4} fill={el.fill} stroke={isConnSrc ? '#534AB7' : el.stroke} strokeWidth={isConnSrc ? 2 : 1} />
        {/* Component icon — two small tabs */}
        <rect x={el.x - 6} y={el.y + 12} width={10} height={8} rx={1.5}
          fill={el.fill} stroke={el.stroke} strokeWidth={0.8} />
        <rect x={el.x - 6} y={el.y + 26} width={10} height={8} rx={1.5}
          fill={el.fill} stroke={el.stroke} strokeWidth={0.8} />
        <text x={el.x + el.width / 2} y={el.y + el.height / 2 + 4}
          textAnchor="middle" fontSize="11" fontWeight="500"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">{el.label}</text>
      </g>
    );
  }

  function renderNode(el: DiagramElement, isSelected: boolean, isConnSrc: boolean) {
    const d = 12; // 3D depth
    return (
      <g key={el.id}>
        {selectionRect(el, isSelected)}
        {/* Main face */}
        <rect x={el.x} y={el.y + d} width={el.width} height={el.height - d}
          rx={2} fill={el.fill} stroke={isConnSrc ? '#534AB7' : el.stroke} strokeWidth={isConnSrc ? 2 : 1} />
        {/* Top face */}
        <path d={`M${el.x},${el.y + d} L${el.x + d},${el.y} L${el.x + el.width + d},${el.y} L${el.x + el.width},${el.y + d} Z`}
          fill={el.fill} stroke={el.stroke} strokeWidth={1} />
        {/* Right face */}
        <path d={`M${el.x + el.width},${el.y + d} L${el.x + el.width + d},${el.y} L${el.x + el.width + d},${el.y + el.height} L${el.x + el.width},${el.y + el.height} Z`}
          fill={el.fill} stroke={el.stroke} strokeWidth={1} />
        <text x={el.x + el.width / 2} y={el.y + el.height / 2 + d / 2 + 4}
          textAnchor="middle" fontSize="11" fontWeight="500"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">{el.label}</text>
      </g>
    );
  }

  function renderRoundedBox(el: DiagramElement, isSelected: boolean, isConnSrc: boolean) {
    return (
      <g key={el.id}>
        {selectionRect(el, isSelected)}
        <rect x={el.x} y={el.y} width={el.width} height={el.height}
          rx={20} fill={el.fill} stroke={isConnSrc ? '#534AB7' : el.stroke} strokeWidth={isConnSrc ? 2 : 1} />
        <text x={el.x + el.width / 2} y={el.y + el.height / 2 + 4}
          textAnchor="middle" fontSize="11" fontWeight="500"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">{el.label}</text>
      </g>
    );
  }

  function renderDefaultBox(el: DiagramElement, isSelected: boolean, isConnSrc: boolean) {
    return (
      <g key={el.id}>
        {selectionRect(el, isSelected)}
        <rect x={el.x} y={el.y} width={el.width} height={el.height}
          rx={4} fill={el.fill} stroke={isConnSrc ? '#534AB7' : el.stroke} strokeWidth={isConnSrc ? 2 : 1} />
        {el.stereotype && (
          <text x={el.x + el.width / 2} y={el.y + 16} textAnchor="middle"
            fontSize="9" fill="#666" fontFamily="Inter, sans-serif">
            «{el.stereotype}»
          </text>
        )}
        <text x={el.x + el.width / 2} y={el.y + (el.stereotype ? 30 : el.height / 2 + 4)}
          textAnchor="middle" fontSize="11" fontWeight="500"
          fill="#1A1A2E" fontFamily="Inter, sans-serif">{el.label}</text>
      </g>
    );
  }

  // Render connectors
  function renderConnector(conn: Connector) {
    const source = elements.find(e => e.id === conn.source_id);
    const target = elements.find(e => e.id === conn.target_id);
    if (!source || !target) return null;

    const sc = getCenterPoint(source);
    const tc = getCenterPoint(target);
    const isAssociation = conn.relation_type === 'association';
    const sp = isAssociation ? getPerimeterPoint(source, tc.x, tc.y) : getEdgePoint(source, tc.x, tc.y);
    const ep = isAssociation ? getPerimeterPoint(target, sc.x, sc.y) : getEdgePoint(target, sc.x, sc.y);

    const isDashed = ['dependency', 'realization', 'include', 'extend'].includes(conn.relation_type);
    const markerId = `url(#arrow-${conn.relation_type})`;
    const dx = ep.x - sp.x;
    const dy = ep.y - sp.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    const labelX = (sp.x + ep.x) / 2 + px * 8;
    const labelY = (sp.y + ep.y) / 2 + py * 8;
    const sourceMultX = sp.x + ux * 14 + px * 10;
    const sourceMultY = sp.y + uy * 14 + py * 10;
    const targetMultX = ep.x - ux * 18 + px * 10;
    const targetMultY = ep.y - uy * 18 + py * 10;

    const isSelectedConnector = conn.id === selectedConnectorId;

    return (
      <g key={conn.id}>
        <line x1={sp.x} y1={sp.y} x2={ep.x} y2={ep.y}
          stroke={isSelectedConnector ? '#534AB7' : '#555'} strokeWidth={isSelectedConnector ? 2 : 1.2}
          strokeDasharray={isDashed ? '6 4' : undefined}
          markerEnd={markerId}
        />
        {conn.label && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="#1A1A2E"
            stroke="#FFFFFF"
            strokeWidth="2"
            paintOrder="stroke"
            fontFamily="var(--font-sans)"
          >
            {conn.label}
          </text>
        )}
        {conn.multiplicity_source && (
          <text
            x={sourceMultX}
            y={sourceMultY}
            fontSize="12"
            fontWeight="700"
            fill="#1A1A2E"
            stroke="#FFFFFF"
            strokeWidth="2"
            paintOrder="stroke"
            fontFamily="var(--font-sans)"
          >
            {conn.multiplicity_source}
          </text>
        )}
        {conn.multiplicity_target && (
          <text
            x={targetMultX}
            y={targetMultY}
            fontSize="12"
            fontWeight="700"
            fill="#1A1A2E"
            stroke="#FFFFFF"
            strokeWidth="2"
            paintOrder="stroke"
            fontFamily="var(--font-sans)"
          >
            {conn.multiplicity_target}
          </text>
        )}
      </g>
    );
  }

  function renderConnectorPreview() {
    const isConnectorTool = connectorTools.includes(activeTool);
    if (!isConnectorTool || !connectingFrom || !mouseCanvasPos) return null;

    const source = elements.find(e => e.id === connectingFrom);
    if (!source) return null;

    const targetEl = hoverTargetId ? elements.find(e => e.id === hoverTargetId) : undefined;
    const targetPoint = targetEl
      ? getCenterPoint(targetEl)
      : mouseCanvasPos;

    const isAssociation = activeTool === 'association';
    const sp = isAssociation
      ? getPerimeterPoint(source, targetPoint.x, targetPoint.y)
      : getEdgePoint(source, targetPoint.x, targetPoint.y);

    const ep = targetEl
      ? (isAssociation
        ? getPerimeterPoint(targetEl, sp.x, sp.y)
        : getEdgePoint(targetEl, sp.x, sp.y))
      : targetPoint;

    const isDashed = ['dependency', 'realization', 'include', 'extend'].includes(activeTool);
    const markerId = `url(#arrow-${activeTool})`;

    return (
      <g pointerEvents="none">
        {targetEl && (
          <rect
            x={targetEl.x - 5}
            y={targetEl.y - 5}
            width={targetEl.width + 10}
            height={targetEl.height + 10}
            rx={8}
            fill="none"
            stroke="#534AB7"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.8}
          />
        )}
        <line
          x1={sp.x}
          y1={sp.y}
          x2={ep.x}
          y2={ep.y}
          stroke="#534AB7"
          strokeWidth={1.5}
          strokeDasharray={isDashed ? '6 4' : undefined}
          markerEnd={markerId}
          opacity={0.9}
        />
      </g>
    );
  }

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: activeTool !== 'select' ? 'crosshair' : (dragging ? 'grabbing' : 'default') }}
    >
      <svg
        ref={ref}
        width="100%"
        height="100%"
        className="canvas-svg"
      >
        {renderMarkerDefs()}
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Dot grid background */}
          <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#dotGrid)" />

          {/* Connectors (render below elements) */}
          {connectors.map(renderConnector)}

          {/* Live connector preview (magnet behavior) */}
          {renderConnectorPreview()}

          {/* Elements */}
          {elements.map(renderElement)}

          {/* Hardpoints (Rendered on top of elements) */}
          {elements.map(el => {
            const isSelected = el.id === selectedId;
            const isConnectingSource = el.id === connectingFrom;
            const isConnectorTool = ['association', 'inheritance', 'realization', 'dependency', 'aggregation', 'composition', 'include', 'extend'].includes(activeTool);
            
            // Only show hardpoints if element is selected, or if we are using a connector tool
            if (!isSelected && !isConnectorTool && !isConnectingSource) return null;

            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const hardpoints = [
              { x: cx, y: el.y },                // Top
              { x: cx, y: el.y + el.height },    // Bottom
              { x: el.x, y: cy },                // Left
              { x: el.x + el.width, y: cy }      // Right
            ];

            return (
              <g key={`hp-${el.id}`}>
                {hardpoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3.5}
                    fill="#534AB7"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="canvas-zoom">
        <button onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}>−</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset">⌂</button>
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;
