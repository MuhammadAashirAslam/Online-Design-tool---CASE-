import { DiagramElement, Connector, Visibility } from '../types';

interface PropertiesPanelProps {
  element: DiagramElement | null;
  connector: Connector | null;
  onUpdateElement: (updates: Partial<DiagramElement>) => void;
  onDeleteElement: () => void;
  onUpdateConnector: (updates: Partial<Connector>) => void;
  onDeleteConnector: () => void;
  onGenerateCode: () => void;
  onValidate: () => void;
}

const FILL_COLORS = [
  '#E6F1FB', '#E1F5EE', '#FAEEDA', '#EEEDFE',
  '#FCEBEB', '#F0F0F3', '#FFF4E0', '#E8F4FD',
];

export default function PropertiesPanel({
  element,
  connector,
  onUpdateElement,
  onDeleteElement,
  onUpdateConnector,
  onDeleteConnector,
  onGenerateCode,
  onValidate,
}: PropertiesPanelProps) {
  if (!element && !connector) {
    return (
      <div className="properties-panel">
        <div className="props-empty">
          <div className="props-empty-icon">↖</div>
          <div className="props-empty-text">Select an element or relation to view its properties</div>
        </div>
      </div>
    );
  }

  if (connector) {
    return (
      <div className="properties-panel">
        <div className="props-header">Relation Properties</div>

        <div className="props-field">
          <label className="label">Type</label>
          <div className="props-readonly">{connector.relation_type}</div>
        </div>

        <div className="props-field">
          <label className="label">Label</label>
          <input
            className="input"
            value={connector.label || ''}
            placeholder="Relation label"
            onChange={e => onUpdateConnector({ label: e.target.value })}
          />
        </div>

        <div className="props-field">
          <label className="label">Source Multiplicity</label>
          <input
            className="input"
            value={connector.multiplicity_source || ''}
            placeholder="e.g. 1"
            onChange={e => onUpdateConnector({ multiplicity_source: e.target.value })}
          />
        </div>

        <div className="props-field">
          <label className="label">Target Multiplicity</label>
          <input
            className="input"
            value={connector.multiplicity_target || ''}
            placeholder="e.g. 0..*"
            onChange={e => onUpdateConnector({ multiplicity_target: e.target.value })}
          />
        </div>

        <div className="props-section">CASE Actions</div>
        <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 6 }}
          onClick={onValidate}>
          Validate diagram ↗
        </button>
        <button className="btn btn-danger btn-sm" style={{ width: '100%' }}
          onClick={onDeleteConnector}>
          Delete Relation
        </button>
      </div>
    );
  }

  if (!element) return null;

  const isClassBox = element.element_type === 'class-box';

  return (
    <div className="properties-panel">
      <div className="props-header">Properties</div>

      {/* Type (read-only) */}
      <div className="props-field">
        <label className="label">Type</label>
        <div className="props-readonly">{element.element_type}</div>
      </div>

      {/* Name */}
      <div className="props-field">
        <label className="label">Name</label>
        <input
          className="input"
          value={element.label}
          onChange={e => onUpdateElement({ label: e.target.value })}
        />
      </div>

      {/* Stereotype */}
      <div className="props-field">
        <label className="label">Stereotype</label>
        <input
          className="input"
          value={element.stereotype || ''}
          placeholder="optional"
          onChange={e => onUpdateElement({ stereotype: e.target.value })}
        />
      </div>

      {/* ── Style Section ── */}
      <div className="props-section">Style</div>

      <div className="props-field">
        <label className="label">Fill</label>
        <div className="props-colors">
          {FILL_COLORS.map(c => (
            <button
              key={c}
              className={`props-color-swatch ${element.fill === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => onUpdateElement({ fill: c })}
            />
          ))}
        </div>
      </div>

      {/* ── Attributes (for class-box) ── */}
      {isClassBox && (
        <>
          <div className="props-section">Attributes</div>
          {(element.attributes || []).map((attr, i) => (
            <div key={i} className="props-attr-row">
              <select
                className="input props-vis-select"
                value={attr.visibility}
                onChange={e => {
                  const newAttrs = [...(element.attributes || [])];
                  newAttrs[i] = { ...newAttrs[i], visibility: e.target.value as Visibility };
                  onUpdateElement({ attributes: newAttrs });
                }}
              >
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="#">#</option>
                <option value="~">~</option>
              </select>
              <input
                className="input"
                value={attr.name}
                placeholder="name"
                onChange={e => {
                  const newAttrs = [...(element.attributes || [])];
                  newAttrs[i] = { ...newAttrs[i], name: e.target.value };
                  onUpdateElement({ attributes: newAttrs });
                }}
              />
              <input
                className="input"
                value={attr.type}
                placeholder="type"
                onChange={e => {
                  const newAttrs = [...(element.attributes || [])];
                  newAttrs[i] = { ...newAttrs[i], type: e.target.value };
                  onUpdateElement({ attributes: newAttrs });
                }}
              />
              <button className="props-remove-btn" onClick={() => {
                const newAttrs = (element.attributes || []).filter((_, idx) => idx !== i);
                onUpdateElement({ attributes: newAttrs });
              }}>×</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 4 }}
            onClick={() => {
              const newAttrs = [...(element.attributes || []), { visibility: '+' as Visibility, name: 'newAttr', type: 'String' }];
              onUpdateElement({ attributes: newAttrs });
            }}>
            + Add Attribute
          </button>
        </>
      )}

      {/* ── Methods (for class-box) ── */}
      {isClassBox && (
        <>
          <div className="props-section">Methods</div>
          {(element.methods || []).map((meth, i) => (
            <div key={i} className="props-attr-row">
              <select
                className="input props-vis-select"
                value={meth.visibility}
                onChange={e => {
                  const newMethods = [...(element.methods || [])];
                  newMethods[i] = { ...newMethods[i], visibility: e.target.value as Visibility };
                  onUpdateElement({ methods: newMethods });
                }}
              >
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="#">#</option>
                <option value="~">~</option>
              </select>
              <input
                className="input"
                value={meth.name}
                placeholder="name"
                onChange={e => {
                  const newMethods = [...(element.methods || [])];
                  newMethods[i] = { ...newMethods[i], name: e.target.value };
                  onUpdateElement({ methods: newMethods });
                }}
              />
              <input
                className="input"
                value={meth.returnType}
                placeholder="return"
                style={{ width: 60 }}
                onChange={e => {
                  const newMethods = [...(element.methods || [])];
                  newMethods[i] = { ...newMethods[i], returnType: e.target.value };
                  onUpdateElement({ methods: newMethods });
                }}
              />
              <button className="props-remove-btn" onClick={() => {
                const newMethods = (element.methods || []).filter((_, idx) => idx !== i);
                onUpdateElement({ methods: newMethods });
              }}>×</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 4 }}
            onClick={() => {
              const newMethods = [...(element.methods || []), { visibility: '+' as Visibility, name: 'newMethod', returnType: 'void', params: '' }];
              onUpdateElement({ methods: newMethods });
            }}>
            + Add Method
          </button>
        </>
      )}

      {/* ── Notes ── */}
      <div className="props-section">Notes</div>
      <textarea
        className="input"
        rows={3}
        placeholder="Add notes..."
        value={element.notes || ''}
        onChange={e => onUpdateElement({ notes: e.target.value })}
      />

      {/* ── CASE Actions ── */}
      <div className="props-section">CASE Actions</div>
      <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 6 }}
        onClick={onGenerateCode}>
        Generate code stub ↗
      </button>
      <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 6 }}
        onClick={onValidate}>
        Validate diagram ↗
      </button>
      <button className="btn btn-danger btn-sm" style={{ width: '100%' }}
        onClick={onDeleteElement}>
        Delete Element
      </button>
    </div>
  );
}
