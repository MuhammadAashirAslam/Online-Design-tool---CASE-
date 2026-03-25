import { ValidationError } from '../lib/validationEngine';
import { DiagramElement } from '../types';

interface ValidationPanelProps {
  errors: ValidationError[];
  elements: DiagramElement[];
  onClose: () => void;
  onLocate: (elementId: string) => void;
}

export default function ValidationPanel({ errors, elements, onClose, onLocate }: ValidationPanelProps) {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel-slide" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="panel-header">
          <h2>UML Validation Results</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="panel-summary">
          {errors.length === 0 ? (
            <div className="badge badge-success" style={{ fontSize: 13, padding: '6px 14px' }}>
              ✓ Diagram is valid — no issues found
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {errorCount > 0 && (
                <div className="badge badge-error">{errorCount} error{errorCount !== 1 ? 's' : ''}</div>
              )}
              {warningCount > 0 && (
                <div className="badge badge-info">{warningCount} warning{warningCount !== 1 ? 's' : ''}</div>
              )}
            </div>
          )}
        </div>

        <div className="validation-list">
          {errors.map((err, i) => {
            const element = err.elementId ? elements.find(e => e.id === err.elementId) : null;
            return (
              <div key={i} className={`validation-item severity-${err.severity}`}>
                <div className="validation-icon">
                  {err.severity === 'error' ? '✕' : err.severity === 'warning' ? '⚠' : 'ℹ'}
                </div>
                <div className="validation-content">
                  <div className="validation-message">{err.message}</div>
                  <div className="validation-rule">{err.rule}</div>
                </div>
                {err.elementId && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onLocate(err.elementId!)}
                  >
                    Locate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
