import { Diagram, ViewType, ValidationError } from '../types';

interface ViewTabsProps {
  activeView: ViewType;
  diagrams: Diagram[];
  onSwitch: (view: ViewType) => void;
  activeDiagram?: Diagram;
  validationErrors: ValidationError[];
}

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'scenario', label: 'Scenario' },
  { key: 'logical', label: 'Logical' },
  { key: 'development', label: 'Development' },
  { key: 'process', label: 'Process' },
  { key: 'physical', label: 'Physical' },
];

export default function ViewTabs({ activeView, diagrams, onSwitch, activeDiagram, validationErrors }: ViewTabsProps) {
  return (
    <div className="view-tabs">
      <span className="view-tabs-label">4+1 Views:</span>
      {VIEWS.map(v => {
        const diagram = diagrams.find(d => d.view_type === v.key);
        const isActive = activeView === v.key;
        return (
          <button
            key={v.key}
            className={`view-tab ${isActive ? 'active' : ''}`}
            onClick={() => onSwitch(v.key)}
          >
            {v.label}
            {diagram && isActive && (
              <span className={`view-tab-dot ${validationErrors.length > 0 ? 'error' : 'valid'}`} />
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {activeDiagram && (
        <span className="view-tabs-info">
          Diagram: {activeDiagram.uml_type}
          <span className="view-tabs-sep">|</span>
          {validationErrors.length === 0 ? (
            <span className="view-tabs-valid">✓ Valid UML</span>
          ) : (
            <span className="view-tabs-invalid">{validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}</span>
          )}
        </span>
      )}
    </div>
  );
}
