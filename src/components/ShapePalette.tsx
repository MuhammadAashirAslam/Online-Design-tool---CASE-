import { ReactNode } from 'react';
import { ActiveTool, ArchStyle, ViewType } from '../types';
import { getViewTools } from '../lib/architectureTemplates';

interface ShapePaletteProps {
  activeTool: ActiveTool;
  onToolSelect: (tool: ActiveTool) => void;
  activeView: ViewType;
  archStyle: ArchStyle;
  onValidate: () => void;
}

const TOOL_ICONS: Record<string, { label: string; icon: ReactNode }> = {
  'select': {
    label: 'Select',
    icon: <span style={{ fontSize: 16 }}>↖</span>,
  },
  'class-box': {
    label: 'Class',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1" />
        <line x1="2" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  'actor': {
    label: 'Actor',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="6.5" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="14" x2="6" y2="18" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="14" x2="14" y2="18" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'usecase': {
    label: 'Use Case',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16">
        <ellipse cx="11" cy="8" rx="9" ry="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'component': {
    label: 'Component',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="4" y="3" width="12" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="6" width="5" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="1" y="11" width="5" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  'node': {
    label: 'Node',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="3" y="5" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 5L8 1H17L17 13" fill="none" stroke="currentColor" strokeWidth="1" />
        <line x1="8" y1="1" x2="8" y2="5" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  'interface': {
    label: 'Interface',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="12" x2="10" y2="18" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'package': {
    label: 'Package',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2" y="6" width="16" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <rect x="2" y="2" width="8" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  'note': {
    label: 'Note',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M2 2H14L18 6V18H2Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M14 2V6H18" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  'object': {
    label: 'Object',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2" y="4" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  'state': {
    label: 'State',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16">
        <rect x="1" y="1" width="20" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'activity': {
    label: 'Activity',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16">
        <rect x="1" y="1" width="20" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'association': {
    label: 'Association',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="14,4 20,7 14,10" fill="currentColor" />
      </svg>
    ),
  },
  'inheritance': {
    label: 'Inheritance',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="13,3 20,7 13,11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'realization': {
    label: 'Realization',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
        <polygon points="13,3 20,7 13,11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'dependency': {
    label: 'Dependency',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
        <polygon points="14,4 20,7 14,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'aggregation': {
    label: 'Aggregation',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="8" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="0,7 4,3 8,7 4,11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  'composition': {
    label: 'Composition',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="8" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="0,7 4,3 8,7 4,11" fill="currentColor" />
      </svg>
    ),
  },
  'include': {
    label: '«include»',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
        <polygon points="14,4 20,7 14,10" fill="currentColor" />
      </svg>
    ),
  },
  'extend': {
    label: '«extend»',
    icon: (
      <svg width="22" height="14" viewBox="0 0 22 14">
        <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
        <polygon points="14,4 20,7 14,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
};

export default function ShapePalette({ activeTool, onToolSelect, activeView, archStyle, onValidate }: ShapePaletteProps) {
  const tools = getViewTools(archStyle, activeView);

  // Separate into shapes and connectors
  const shapeTools = tools.filter(t => !['association', 'inheritance', 'realization', 'dependency', 'aggregation', 'composition', 'include', 'extend'].includes(t));
  const connectorTools = tools.filter(t => ['association', 'inheritance', 'realization', 'dependency', 'aggregation', 'composition', 'include', 'extend'].includes(t));

  return (
    <div className="shape-palette">
      <div className="palette-label">SHAPES</div>
      {shapeTools.map(tool => {
        const info = TOOL_ICONS[tool];
        if (!info) return null;
        return (
          <button
            key={tool}
            className={`palette-btn ${activeTool === tool ? 'active' : ''}`}
            onClick={() => onToolSelect(tool)}
            title={info.label}
          >
            {info.icon}
          </button>
        );
      })}

      <div className="palette-divider" />
      <div className="palette-label">RELATIONS</div>
      {connectorTools.map(tool => {
        const info = TOOL_ICONS[tool];
        if (!info) return null;
        return (
          <button
            key={tool}
            className={`palette-btn ${activeTool === tool ? 'active' : ''}`}
            onClick={() => onToolSelect(tool)}
            title={info.label}
          >
            {info.icon}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />
      <button className="palette-btn" onClick={onValidate} title="Validate Diagram">
        <span style={{ fontSize: 16 }}>✓</span>
      </button>
    </div>
  );
}
