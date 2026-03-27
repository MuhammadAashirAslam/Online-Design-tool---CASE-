import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Project, ArchStyle } from '../types';
import { getViewTemplatesByArchStyle } from '../lib/architectureTemplates';
import { getTemplateSeed } from '../lib/templateSeeds';
import * as db from '../lib/supabaseData';
import { v4 as uuidv4 } from 'uuid';
import '../styles/dashboard.css';

const ARCH_TEMPLATES: { label: string; value: ArchStyle }[] = [
  { label: 'MVC Pattern', value: 'mvc' },
  { label: 'Layered (4-tier)', value: 'layered' },
  { label: 'Client-Server', value: 'client-server' },
  { label: 'Pipe & Filter', value: 'pipe-filter' },
  { label: 'SOA / Microservices', value: 'soa' },
  { label: 'Component-Based', value: 'component-based' },
];

/* ── localStorage helpers (guest-only fallback) ── */
function loadProjectsLocal(): Project[] {
  try { return JSON.parse(localStorage.getItem('odt_projects') || '[]'); }
  catch { return []; }
}
function saveProjectsLocal(projects: Project[]) {
  localStorage.setItem('odt_projects', JSON.stringify(projects));
}

export default function Dashboard() {
  const { user, isGuest, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newArch, setNewArch] = useState<ArchStyle>('custom');
  const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');
  const templatesSectionRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const createLockRef = useRef(false);

  const initials = user?.user_metadata?.username
    ? user.user_metadata.username.slice(0, 2).toUpperCase()
    : 'G';

  // Load projects
  useEffect(() => {
    async function load() {
      if (isGuest) {
        setProjects(loadProjectsLocal());
      } else {
        const data = await db.fetchProjects();
        setProjects(data);
      }
      setLoading(false);
    }
    load();
  }, [isGuest]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function createProject() {
    if (!newName.trim() || createLockRef.current) return;

    createLockRef.current = true;
    setCreating(true);

    try {

      const projectId = uuidv4();
      const p: Project = {
        id: projectId,
        owner_id: user?.id || 'guest',
        name: newName.trim(),
        arch_style: newArch,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create architecture-specific 4+1 diagrams
      const viewTemplates = getViewTemplatesByArchStyle(newArch);
      const diagrams = viewTemplates.map((tpl) => ({
        id: uuidv4(),
        project_id: projectId,
        name: tpl.name,
        uml_type: tpl.umlType,
        view_type: tpl.view,
        is_valid: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      if (isGuest) {
        // Guest mode: localStorage
        const updated = projects.some(existing => existing.id === p.id)
          ? projects
          : [p, ...projects];
        setProjects(updated);
        saveProjectsLocal(updated);
        localStorage.setItem(`odt_diagrams_${projectId}`, JSON.stringify(diagrams));

        diagrams.forEach((diag) => {
          const seed = getTemplateSeed(newArch, diag);
          localStorage.setItem(`odt_elements_${projectId}_${diag.id}`, JSON.stringify(seed.elements));
          localStorage.setItem(`odt_connectors_${projectId}_${diag.id}`, JSON.stringify(seed.connectors));
        });
      } else {
        // Authenticated: Supabase
        const created = await db.createProject(p);
        if (!created) return;

        await db.createDiagrams(diagrams);

        // Seed diagram content
        for (const diag of diagrams) {
          const seed = getTemplateSeed(newArch, diag);
          if (seed.elements.length > 0 || seed.connectors.length > 0) {
            await db.seedDiagramData(diag.id, seed.elements, seed.connectors);
          }
        }

        setProjects(prev => prev.some(existing => existing.id === created.id) ? prev : [created, ...prev]);
      }

      setShowCreate(false);
      setNewName('');
      setNewArch('custom');
      navigate(`/editor/${projectId}`);
    } finally {
      createLockRef.current = false;
      setCreating(false);
    }
  }

  function requestDeleteProject(project: Project) {
    setProjectToDelete(project);
  }

  async function deleteProject() {
    if (!projectToDelete) return;
    const id = projectToDelete.id;
    setDeleting(true);

    if (isGuest) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      saveProjectsLocal(updated);
      // Clean up diagram data using stored diagram IDs
      const storedDiags: { id: string }[] = JSON.parse(localStorage.getItem(`odt_diagrams_${id}`) || '[]');
      storedDiags.forEach(d => {
        localStorage.removeItem(`odt_elements_${id}_${d.id}`);
        localStorage.removeItem(`odt_connectors_${id}_${d.id}`);
      });
      localStorage.removeItem(`odt_diagrams_${id}`);
      setNotice({ type: 'success', text: `Deleted "${projectToDelete.name}"` });
    } else {
      const ok = await db.deleteProject(id);
      if (ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        setNotice({ type: 'success', text: `Deleted "${projectToDelete.name}"` });
      } else {
        setNotice({ type: 'error', text: 'Could not delete project. Please try again.' });
      }
    }

    setDeleting(false);
    setProjectToDelete(null);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  const archLabel = (style: string) =>
    ARCH_TEMPLATES.find(t => t.value === style)?.label || style;

  function goToProjectsTab() {
    setActiveTab('projects');
    mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goToTemplatesTab() {
    setActiveTab('templates');
    templatesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="dashboard">
      {/* Top nav */}
      <nav className="dash-nav">
        <div className="dash-nav-brand">⬡ ODT</div>
        <div className="dash-nav-tabs">
          <button className={`dash-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={goToProjectsTab}>My Projects</button>
          <button className={`dash-tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={goToTemplatesTab}>Templates</button>
        </div>
        <div style={{ flex: 1 }} />
        <div className="dash-nav-right">
          {isGuest ? (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          ) : (
            <>
              <div className="avatar" title={user?.email || ''}>
                {initials}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.user_metadata?.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
            </>
          )}
        </div>
      </nav>

      <main ref={mainRef} className="dash-main">
        {/* Guest banner */}
        {isGuest && (
          <div className="guest-banner">
            <span>👋 You're using ODT as a guest. Your work is saved locally in this browser.</span>
            <Link to="/signup" className="btn btn-primary btn-sm">Create Account</Link>
          </div>
        )}

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1>My Projects</h1>
            <p className="dash-subtitle">
              {loading ? 'Loading...' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}{isGuest ? ' · Guest mode' : ''}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        </div>

        {notice && (
          <div className={`dash-alert ${notice.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite">
            {notice.text}
          </div>
        )}

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Projects</div>
            <div className="stat-value">{projects.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Diagrams</div>
            <div className="stat-value">{projects.length * 5}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Architecture Styles</div>
            <div className="stat-value">{new Set(projects.map(p => p.arch_style)).size || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Templates Available</div>
            <div className="stat-value">{ARCH_TEMPLATES.length}</div>
          </div>
        </div>

        {/* Project cards */}
        <div className="project-grid">
          {projects.map(project => (
            <div key={project.id} className="card project-card" onClick={() => navigate(`/editor/${project.id}`)}>
              <div className="project-card-preview">
                <div className="project-card-badge badge badge-brand">{archLabel(project.arch_style)}</div>
                <ProjectPreviewSVG style={project.arch_style} />
              </div>
              <div className="project-card-body">
                <div className="project-card-title">{project.name}</div>
                <div className="project-card-meta">{archLabel(project.arch_style)} · {formatDate(project.updated_at)}</div>
                <div className="project-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); requestDeleteProject(project); }}>Delete</button>
                </div>
              </div>
            </div>
          ))}

          <div className="card project-card project-card-new" onClick={() => setShowCreate(true)}>
            <div className="project-card-new-inner">
              <div className="project-card-new-icon">+</div>
              <div className="project-card-new-label">New Project</div>
              <div className="project-card-new-sub">From template or blank</div>
            </div>
          </div>
        </div>

        {/* Architecture Templates */}
        <section ref={templatesSectionRef} className="templates-section">
          <h2>Architecture Templates</h2>
          <div className="templates-strip">
            {ARCH_TEMPLATES.map(t => (
              <button key={t.value} className="template-chip" onClick={() => { setNewArch(t.value); setShowCreate(true); }}>
                {t.label}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Project Name</label>
              <input className="input" placeholder="Hospital Management System" value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => {
                if (e.key === 'Enter' && !e.repeat) {
                  e.preventDefault();
                  createProject();
                }
              }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Architecture Style</label>
              <select className="input" value={newArch} onChange={e => setNewArch(e.target.value as ArchStyle)}>
                <option value="custom">Custom / Blank</option>
                {ARCH_TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button className="btn btn-primary" onClick={createProject} disabled={creating || !newName.trim()}>{creating ? 'Creating...' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setProjectToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Delete Project?</h2>
            <p className="dash-delete-copy">
              This will permanently remove <strong>{projectToDelete.name}</strong> and all related diagrams.
            </p>
            <div className="dash-delete-note">This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setProjectToDelete(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteProject} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete Project'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectPreviewSVG({ style }: { style: string }) {
  if (style === 'layered') {
    return (
      <svg width="140" height="80" viewBox="0 0 140 80">
        <rect x="10" y="5" width="120" height="20" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
        <text x="70" y="18" textAnchor="middle" fontSize="8" fill="var(--brand-600)" fontFamily="var(--font-sans)">Presentation</text>
        <rect x="10" y="30" width="120" height="20" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
        <text x="70" y="43" textAnchor="middle" fontSize="8" fill="var(--brand-600)" fontFamily="var(--font-sans)">Business Logic</text>
        <rect x="10" y="55" width="120" height="20" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
        <text x="70" y="68" textAnchor="middle" fontSize="8" fill="var(--brand-600)" fontFamily="var(--font-sans)">Data Access</text>
      </svg>
    );
  }
  if (style === 'mvc') {
    return (
      <svg width="140" height="80" viewBox="0 0 140 80">
        <rect x="40" y="5" width="60" height="18" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
        <text x="70" y="17" textAnchor="middle" fontSize="7" fill="var(--brand-600)" fontFamily="var(--font-sans)">Controller</text>
        <rect x="5" y="45" width="50" height="18" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
        <text x="30" y="57" textAnchor="middle" fontSize="7" fill="var(--brand-600)" fontFamily="var(--font-sans)">Model</text>
        <rect x="85" y="45" width="50" height="18" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
        <text x="110" y="57" textAnchor="middle" fontSize="7" fill="var(--brand-600)" fontFamily="var(--font-sans)">View</text>
        <line x1="55" y1="23" x2="30" y2="45" stroke="var(--brand-200)" />
        <line x1="85" y1="23" x2="110" y2="45" stroke="var(--brand-200)" />
        <line x1="55" y1="54" x2="85" y2="54" stroke="var(--brand-200)" />
      </svg>
    );
  }
  return (
    <svg width="140" height="80" viewBox="0 0 140 80">
      <rect x="10" y="10" width="50" height="35" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
      <text x="35" y="23" textAnchor="middle" fontSize="7" fill="var(--brand-600)" fontFamily="var(--font-sans)" fontWeight="500">ClassA</text>
      <line x1="10" y1="27" x2="60" y2="27" stroke="var(--brand-200)" strokeWidth="0.8" />
      <rect x="80" y="10" width="50" height="35" rx="3" fill="rgba(255,255,255,0.7)" stroke="var(--brand-200)" />
      <text x="105" y="23" textAnchor="middle" fontSize="7" fill="var(--brand-600)" fontFamily="var(--font-sans)" fontWeight="500">ClassB</text>
      <line x1="80" y1="27" x2="130" y2="27" stroke="var(--brand-200)" strokeWidth="0.8" />
      <line x1="60" y1="27" x2="80" y2="27" stroke="var(--brand-400)" />
    </svg>
  );
}
