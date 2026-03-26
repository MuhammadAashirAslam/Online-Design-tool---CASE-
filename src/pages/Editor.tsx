import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Project, Diagram, DiagramElement, Connector, ViewType, ActiveTool, ElementType, RelationType } from '../types';
import Canvas from '../components/Canvas';
import ShapePalette from '../components/ShapePalette';
import PropertiesPanel from '../components/PropertiesPanel';
import ViewTabs from '../components/ViewTabs';
import ValidationPanel from '../components/ValidationPanel';
import CodeGenPanel from '../components/CodeGenPanel';
import ExportDialog from '../components/ExportDialog';
import { validateDiagram, ValidationError } from '../lib/validationEngine';
import { v4 as uuidv4 } from 'uuid';
import '../styles/editor.css';

/*
 * Demo mode: All data is stored in localStorage.
 * Diagrams key: odt_diagrams_{projectId}
 * Elements key: odt_elements_{projectId}_{diagramId}
 * Connectors key: odt_connectors_{projectId}_{diagramId}
 */

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<SVGSVGElement>(null);

  // Project & diagrams
  const [project, setProject] = useState<Project | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('scenario');

  // Canvas state
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Panels
  const [showValidation, setShowValidation] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Save state
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDiagram = diagrams.find(d => d.id === activeDiagramId);
  const selectedElement = elements.find(e => e.id === selectedId);
  const selectedConnector = connectors.find(c => c.id === selectedConnectorId);

  // ── Load project data from localStorage ──
  useEffect(() => {
    if (!projectId) return;

    // Load project
    const projs: Project[] = JSON.parse(localStorage.getItem('odt_projects') || '[]');
    const proj = projs.find(p => p.id === projectId);
    if (proj) setProject(proj);

    // Load diagrams
    const diags: Diagram[] = JSON.parse(localStorage.getItem(`odt_diagrams_${projectId}`) || '[]');
    if (diags.length > 0) {
      setDiagrams(diags);
      setActiveDiagramId(diags[0].id);
      setActiveView(diags[0].view_type as ViewType);
      loadDiagramData(diags[0].id);
    }
  }, [projectId]);

  function loadDiagramData(diagId: string) {
    const els: DiagramElement[] = JSON.parse(
      localStorage.getItem(`odt_elements_${projectId}_${diagId}`) || '[]'
    );
    const conns: Connector[] = JSON.parse(
      localStorage.getItem(`odt_connectors_${projectId}_${diagId}`) || '[]'
    );
    setElements(els);
    setConnectors(conns);
    setSelectedId(null);
    setSelectedConnectorId(null);
    setConnectingFrom(null);
  }

  // ── Switch 4+1 View ──
  function switchView(view: ViewType) {
    // Save current diagram first
    saveNow();
    setActiveView(view);
    const diagram = diagrams.find(d => d.view_type === view);
    if (diagram) {
      setActiveDiagramId(diagram.id);
      loadDiagramData(diagram.id);
    }
  }

  // ── Save to localStorage ──
  function saveNow() {
    if (!projectId || !activeDiagramId) return;
    localStorage.setItem(
      `odt_elements_${projectId}_${activeDiagramId}`,
      JSON.stringify(elements)
    );
    localStorage.setItem(
      `odt_connectors_${projectId}_${activeDiagramId}`,
      JSON.stringify(connectors)
    );
    setLastSaved(new Date());
  }

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNow(), 1000);
  }, [projectId, activeDiagramId, elements, connectors]);

  // Save when elements/connectors change
  useEffect(() => {
    triggerSave();
  }, [elements, connectors]);

  // ── Element CRUD ──
  function addElement(type: ElementType, x: number, y: number) {
    if (!activeDiagramId) return;

    const defaults: Record<string, Partial<DiagramElement>> = {
      'class-box': { width: 160, height: 120, fill: '#E6F1FB', stroke: '#378ADD', label: 'NewClass', attributes: [{ visibility: '+', name: 'attribute', type: 'String' }], methods: [{ visibility: '+', name: 'method', returnType: 'void', params: '' }] },
      'actor': { width: 50, height: 90, fill: 'transparent', stroke: '#6B6B80', label: 'Actor' },
      'actor-user': { width: 50, height: 90, fill: 'transparent', stroke: '#6B6B80', label: 'User' },
      'actor-admin': { width: 50, height: 90, fill: 'transparent', stroke: '#6B6B80', label: 'Admin' },
      'actor-system': { width: 50, height: 90, fill: 'transparent', stroke: '#6B6B80', label: 'External System' },
      'usecase': { width: 160, height: 60, fill: '#E6F1FB', stroke: '#378ADD', label: 'Use Case' },
      'component': { width: 140, height: 80, fill: '#E1F5EE', stroke: '#1D9E75', label: 'Component' },
      'node': { width: 140, height: 90, fill: '#FAEEDA', stroke: '#B8860B', label: 'Node' },
      'interface': { width: 140, height: 60, fill: '#EEEDFE', stroke: '#534AB7', label: '«interface»' },
      'package': { width: 180, height: 140, fill: '#F0F0F3', stroke: '#6B6B80', label: 'Package' },
      'note': { width: 140, height: 80, fill: '#FFF4E0', stroke: '#B8860B', label: 'Note' },
      'object': { width: 140, height: 80, fill: '#E6F1FB', stroke: '#378ADD', label: 'object:Class' },
      'state': { width: 140, height: 60, fill: '#EEEDFE', stroke: '#534AB7', label: 'State' },
      'activity': { width: 140, height: 60, fill: '#E1F5EE', stroke: '#1D9E75', label: 'Activity' },
    };

    const d = defaults[type] || {};
    const el: DiagramElement = {
      id: uuidv4(),
      diagram_id: activeDiagramId,
      element_type: type,
      label: d.label || type,
      x,
      y,
      width: d.width || 120,
      height: d.height || 80,
      fill: d.fill || '#E6F1FB',
      stroke: d.stroke || '#378ADD',
      stereotype: '',
      notes: '',
      attributes: d.attributes || [],
      methods: d.methods || [],
    };

    setElements(prev => [...prev, el]);
    setSelectedId(el.id);
    setSelectedConnectorId(null);
    setActiveTool('select');
  }

  function updateElement(id: string, updates: Partial<DiagramElement>) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }

  function deleteElement(id: string) {
    setElements(prev => prev.filter(el => el.id !== id));
    setConnectors(prev => prev.filter(c => c.source_id !== id && c.target_id !== id));
    if (selectedId === id) setSelectedId(null);
    setSelectedConnectorId(null);
  }

  function updateConnector(id: string, updates: Partial<Connector>) {
    setConnectors(prev => prev.map(conn => conn.id === id ? { ...conn, ...updates } : conn));
  }

  function deleteConnector(id: string) {
    setConnectors(prev => prev.filter(conn => conn.id !== id));
    if (selectedConnectorId === id) setSelectedConnectorId(null);
  }

  // ── Canvas click handler ──
  function handleCanvasClick(x: number, y: number) {
    const isConnectorTool = ['association', 'inheritance', 'realization', 'dependency', 'aggregation', 'composition', 'include', 'extend'].includes(activeTool);

    if (isConnectorTool) {
      const clicked = elements.find(el =>
        x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
      );
      if (clicked) {
        if (!connectingFrom) {
          setConnectingFrom(clicked.id);
        } else if (clicked.id !== connectingFrom) {
          const conn: Connector = {
            id: uuidv4(),
            diagram_id: activeDiagramId!,
            source_id: connectingFrom,
            target_id: clicked.id,
            relation_type: activeTool as RelationType,
            label: '',
            multiplicity_source: '',
            multiplicity_target: '',
          };
          setConnectors(prev => [...prev, conn]);
          setConnectingFrom(clicked.id);
          setSelectedId(null);
          setSelectedConnectorId(conn.id);
        }
      }
    } else if (activeTool !== 'select') {
      addElement(activeTool as ElementType, x, y);
    } else {
      const clicked = elements.find(el =>
        x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
      );
      setSelectedId(clicked?.id || null);
      setSelectedConnectorId(null);
    }
  }

  // ── Validation ──
  function runValidation() {
    const errors = validateDiagram(elements, connectors, activeDiagram?.uml_type || 'class');
    setValidationErrors(errors);
    setShowValidation(true);
  }

  const timeSinceSave = () => {
    const s = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (s < 5) return 'Just saved';
    if (s < 60) return `Saved ${s}s ago`;
    return `Saved ${Math.floor(s / 60)}m ago`;
  };

  return (
    <div className="editor">
      {/* ── Top Bar ── */}
      <div className="editor-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => { saveNow(); navigate('/'); }}>
          ← Back
        </button>
        <div className="editor-topbar-brand">⬡ ODT</div>
        <div className="editor-topbar-menus">
          <button className="topbar-menu-btn" onClick={() => setShowExport(true)}>Export</button>
          <button className="topbar-menu-btn" onClick={runValidation}>Validate</button>
          <button className="topbar-menu-btn" onClick={() => setShowCodeGen(true)}>Code Gen</button>
        </div>
        <div className="editor-topbar-filename">
          {project?.name || 'Loading...'}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm btn-secondary" onClick={saveNow}>💾 Save</button>
        <div className="editor-topbar-status">{timeSinceSave()}</div>
      </div>

      {/* ── 4+1 View Tabs ── */}
      <ViewTabs
        activeView={activeView}
        diagrams={diagrams}
        onSwitch={switchView}
        activeDiagram={activeDiagram}
        validationErrors={validationErrors}
      />

      {/* ── Editor body ── */}
      <div className="editor-body">
        <ShapePalette
          activeTool={activeTool}
          onToolSelect={setActiveTool}
          activeView={activeView}
          archStyle={project?.arch_style || 'custom'}
          onValidate={runValidation}
        />

        <Canvas
          ref={canvasRef}
          elements={elements}
          connectors={connectors}
          selectedId={selectedId}
          selectedConnectorId={selectedConnectorId}
          connectingFrom={connectingFrom}
          activeTool={activeTool}
          onCanvasClick={handleCanvasClick}
          onSelectElement={(id) => { setSelectedId(id); if (id) setSelectedConnectorId(null); }}
          onSelectConnector={(id) => { setSelectedConnectorId(id); if (id) setSelectedId(null); }}
          onMoveElement={(id, x, y) => updateElement(id, { x, y })}
          onDeleteElement={deleteElement}
          onDeleteConnector={deleteConnector}
          onCancelConnectorMode={() => { setConnectingFrom(null); setActiveTool('select'); }}
        />

        <PropertiesPanel
          element={selectedElement || null}
          connector={selectedConnector || null}
          onUpdateElement={(updates) => selectedId && updateElement(selectedId, updates)}
          onDeleteElement={() => selectedId && deleteElement(selectedId)}
          onUpdateConnector={(updates) => selectedConnectorId && updateConnector(selectedConnectorId, updates)}
          onDeleteConnector={() => selectedConnectorId && deleteConnector(selectedConnectorId)}
          onGenerateCode={() => setShowCodeGen(true)}
          onValidate={runValidation}
        />
      </div>

      {/* ── Status Bar ── */}
      <div className="editor-statusbar">
        <span>Elements: {elements.length}</span>
        <span className="status-sep">|</span>
        <span>Connectors: {connectors.length}</span>
        <span className="status-sep">|</span>
        <span>View: {activeView}</span>
        {activeDiagram && (
          <>
            <span className="status-sep">|</span>
            <span>Diagram: {activeDiagram.uml_type}</span>
          </>
        )}
        <span style={{ flex: 1 }} />
        {connectingFrom && <span className="status-connecting">Click target element to connect...</span>}
        <span>{timeSinceSave()}</span>
      </div>

      {/* ── Panels / Dialogs ── */}
      {showValidation && (
        <ValidationPanel
          errors={validationErrors}
          elements={elements}
          onClose={() => setShowValidation(false)}
          onLocate={(id) => { setSelectedId(id); setShowValidation(false); }}
        />
      )}

      {showCodeGen && (
        <CodeGenPanel
          elements={elements}
          connectors={connectors}
          onClose={() => setShowCodeGen(false)}
        />
      )}

      {showExport && (
        <ExportDialog
          canvasRef={canvasRef}
          projectName={project?.name || 'diagram'}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
