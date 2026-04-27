import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Ticket, TicketReply, TicketCategory, TicketPriority, TicketStatus, Project } from '../types';
import * as ticketDb from '../lib/ticketData';
import * as db from '../lib/supabaseData';
import { v4 as uuidv4 } from 'uuid';
import '../styles/tickets.css';

/* ── Constants ── */

const CATEGORIES: { label: string; value: TicketCategory; icon: string }[] = [
  { label: 'Bug Report', value: 'bug', icon: '🐛' },
  { label: 'Feature Request', value: 'feature-request', icon: '✨' },
  { label: 'UI Issue', value: 'ui-issue', icon: '🎨' },
  { label: 'Performance', value: 'performance', icon: '⚡' },
  { label: 'Account', value: 'account', icon: '👤' },
  { label: 'Other', value: 'other', icon: '📋' },
];

const PRIORITIES: { label: string; value: TicketPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

const STATUSES: { label: string; value: TicketStatus }[] = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

/* ── Helpers ── */

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function categoryLabel(cat: TicketCategory): string {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

function categoryIcon(cat: TicketCategory): string {
  return CATEGORIES.find(c => c.value === cat)?.icon || '📋';
}

function priorityLabel(p: TicketPriority): string {
  return PRIORITIES.find(pr => pr.value === p)?.label || p;
}

function statusLabel(s: TicketStatus): string {
  return STATUSES.find(st => st.value === s)?.label || s;
}

/* localStorage project helpers removed — tickets require login */

/* ════════════════════════════════════════ */

export default function Tickets() {
  const { user, isGuest, signOut } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form state
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('bug');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newProjectId, setNewProjectId] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail / replies state
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Load data (authenticated users only)
  useEffect(() => {
    if (isGuest || !user) return;
    async function load() {
      const [t, p] = await Promise.all([
        ticketDb.fetchTickets(),
        db.fetchProjects(),
      ]);
      setTickets(t);
      setProjects(p);
      setLoading(false);
    }
    load();
  }, []);

  // Auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Load replies when ticket selected
  useEffect(() => {
    if (!selectedTicket) { setReplies([]); return; }
    ticketDb.fetchReplies(selectedTicket.id).then(setReplies);
  }, [selectedTicket]);

  // ── Guests must log in to access tickets ──
  if (isGuest || !user) {
    return <Navigate to="/login" replace />;
  }

  const initials = user.user_metadata?.username
    ? user.user_metadata.username.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  /* ── Create Ticket ── */
  async function handleCreateTicket() {
    if (!newSubject.trim() || !newDescription.trim() || creating) return;
    setCreating(true);

    const id = uuidv4();
    const projectName = newProjectId
      ? projects.find(p => p.id === newProjectId)?.name || ''
      : '';

    const created = await ticketDb.createTicket({
      id,
      user_id: user.id,
      subject: newSubject.trim(),
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      project_id: newProjectId || undefined,
      project_name: projectName || undefined,
    });
    if (created) {
      setTickets(prev => [created, ...prev]);
      setNotice({ type: 'success', text: 'Ticket submitted!' });
    } else {
      setNotice({ type: 'error', text: 'Failed to create ticket.' });
    }

    setShowCreate(false);
    setNewSubject('');
    setNewDescription('');
    setNewCategory('bug');
    setNewPriority('medium');
    setNewProjectId('');
    setCreating(false);
  }

  /* ── Status Update ── */
  async function handleStatusChange(ticket: Ticket, newStatus: TicketStatus) {
    const ok = await ticketDb.updateTicketStatus(ticket.id, newStatus);
    if (ok) {
      setTickets(prev => prev.map(t =>
        t.id === ticket.id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  }

  /* ── Send Reply ── */
  async function handleSendReply() {
    if (!replyText.trim() || !selectedTicket || sendingReply) return;
    setSendingReply(true);

    const created = await ticketDb.createReply({
      id: uuidv4(),
      ticket_id: selectedTicket.id,
      user_id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
      message: replyText.trim(),
      is_staff: false,
    });
    if (created) {
      setReplies(prev => [...prev, created]);
    }

    setReplyText('');
    setSendingReply(false);
  }

  /* ── Delete ticket ── */
  async function handleDeleteTicket(ticket: Ticket) {
    await ticketDb.deleteTicket(ticket.id);
    setTickets(prev => prev.filter(t => t.id !== ticket.id));
    setSelectedTicket(null);
    setNotice({ type: 'success', text: 'Ticket deleted.' });
  }

  /* ── Computed ── */
  const filtered = filterStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

  const countByStatus = (s: TicketStatus) => tickets.filter(t => t.status === s).length;

  /* ════════════════════════════════════════ */

  return (
    <div className="tickets-page">
      {/* ── Nav ── */}
      <nav className="dash-nav">
        <div className="dash-nav-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>⬡ NaqshaFlow</div>
        <div className="dash-nav-tabs">
          <button className="dash-tab" onClick={() => navigate('/')}>My Projects</button>
          <button className="dash-tab active">Support Tickets</button>
        </div>
        <div style={{ flex: 1 }} />
        <div className="dash-nav-right">
          <div className="avatar" title={user.email || ''}>{initials}</div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.user_metadata?.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="tickets-hero">
        <div className="tickets-hero-inner">
          <h1>🎫 Support Tickets</h1>
          <p className="tickets-hero-sub">Submit complaints, report bugs, or request features. We'll get back to you.</p>
          <div className="tickets-stat-row">
            <div className="tickets-stat-pill">
              <span className="pill-dot pill-dot--open" />
              {countByStatus('open')} Open
            </div>
            <div className="tickets-stat-pill">
              <span className="pill-dot pill-dot--progress" />
              {countByStatus('in-progress')} In Progress
            </div>
            <div className="tickets-stat-pill">
              <span className="pill-dot pill-dot--resolved" />
              {countByStatus('resolved')} Resolved
            </div>
            <div className="tickets-stat-pill">
              <span className="pill-dot pill-dot--closed" />
              {countByStatus('closed')} Closed
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="tickets-main">
        {notice && (
          <div className={`dash-alert ${notice.type === 'success' ? 'success' : 'error'}`} role="status">
            {notice.text}
          </div>
        )}

        {/* Toolbar */}
        <div className="tickets-toolbar">
          <div className="tickets-filters">
            <button className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All ({tickets.length})</button>
            {STATUSES.map(s => (
              <button key={s.value} className={`filter-chip ${filterStatus === s.value ? 'active' : ''}`} onClick={() => setFilterStatus(s.value)}>
                {s.label} ({countByStatus(s.value)})
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Ticket
          </button>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="dash-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="tickets-empty">
            <div className="tickets-empty-icon">🎫</div>
            <h3>{filterStatus === 'all' ? 'No tickets yet' : `No ${statusLabel(filterStatus as TicketStatus).toLowerCase()} tickets`}</h3>
            <p>Submit a ticket to get help or report an issue.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Your First Ticket</button>
          </div>
        ) : (
          <div className="ticket-list">
            {filtered.map(ticket => (
              <div key={ticket.id} className="ticket-row" onClick={() => setSelectedTicket(ticket)}>
                <div className={`ticket-priority-indicator priority-${ticket.priority}`} title={`Priority: ${priorityLabel(ticket.priority)}`} />
                <div className="ticket-info">
                  <div className="ticket-subject">{ticket.subject}</div>
                  <div className="ticket-meta">
                    <span>{categoryIcon(ticket.category)} {categoryLabel(ticket.category)}</span>
                    <span className="ticket-meta-sep">·</span>
                    <span>{priorityLabel(ticket.priority)} priority</span>
                    {ticket.project_name && (
                      <>
                        <span className="ticket-meta-sep">·</span>
                        <span>📁 {ticket.project_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`ticket-category-badge cat-${ticket.category}`}>
                  {categoryIcon(ticket.category)} {categoryLabel(ticket.category)}
                </span>
                <span className={`ticket-status-badge status-${ticket.status}`}>
                  {statusLabel(ticket.status)}
                </span>
                <span className="ticket-time">{formatTimeAgo(ticket.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Ticket Modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal create-ticket-modal" onClick={e => e.stopPropagation()}>
            <h2>🎫 Submit a Ticket</h2>
            <div className="form-group">
              <label>Subject</label>
              <input
                className="input"
                placeholder="Brief summary of your issue..."
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="input"
                placeholder="Describe the issue in detail. Include steps to reproduce if reporting a bug..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value as TicketCategory)}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as TicketPriority)}>
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {projects.length > 0 && (
              <div className="form-group">
                <label>Related Project (optional)</label>
                <select className="input" value={newProjectId} onChange={e => setNewProjectId(e.target.value)}>
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateTicket} disabled={creating || !newSubject.trim() || !newDescription.trim()}>
                {creating ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ticket Detail Modal ── */}
      {selectedTicket && (
        <div className="ticket-detail-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-detail" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="ticket-detail-header">
              <div className="ticket-detail-header-top">
                <div className="ticket-detail-title">{selectedTicket.subject}</div>
                <button className="ticket-detail-close" onClick={() => setSelectedTicket(null)}>✕</button>
              </div>
              <div className="ticket-detail-badges">
                <span className="ticket-detail-id">#{selectedTicket.id.slice(0, 8)}</span>
                <span className={`ticket-status-badge status-${selectedTicket.status}`}>{statusLabel(selectedTicket.status)}</span>
                <span className={`ticket-category-badge cat-${selectedTicket.category}`}>{categoryIcon(selectedTicket.category)} {categoryLabel(selectedTicket.category)}</span>
                <span className={`ticket-priority-indicator priority-${selectedTicket.priority}`} style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{priorityLabel(selectedTicket.priority)}</span>
              </div>
            </div>

            {/* Body */}
            <div className="ticket-detail-body">
              <div className="ticket-description-card">
                <h4>Description</h4>
                <p>{selectedTicket.description}</p>
              </div>

              <div className="ticket-detail-meta-grid">
                <div className="ticket-meta-item">
                  <div className="meta-label">Created</div>
                  <div className="meta-value">{new Date(selectedTicket.created_at).toLocaleString()}</div>
                </div>
                <div className="ticket-meta-item">
                  <div className="meta-label">Last Updated</div>
                  <div className="meta-value">{formatTimeAgo(selectedTicket.updated_at)}</div>
                </div>
                {selectedTicket.project_name && (
                  <div className="ticket-meta-item">
                    <div className="meta-label">Related Project</div>
                    <div className="meta-value">📁 {selectedTicket.project_name}</div>
                  </div>
                )}
                <div className="ticket-meta-item">
                  <div className="meta-label">Ticket ID</div>
                  <div className="meta-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{selectedTicket.id}</div>
                </div>
              </div>

              {/* Status changer */}
              <div className="status-change-row">
                <label>Update Status:</label>
                <select
                  className="input"
                  value={selectedTicket.status}
                  onChange={e => handleStatusChange(selectedTicket, e.target.value as TicketStatus)}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteTicket(selectedTicket)}
                >
                  Delete
                </button>
              </div>

              {/* Replies */}
              <div className="ticket-replies-section">
                <h4>💬 Conversation ({replies.length})</h4>
                {replies.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>No replies yet. Start the conversation below.</p>
                ) : (
                  replies.map(reply => (
                    <div key={reply.id} className="ticket-reply">
                      <div className={`reply-avatar ${reply.is_staff ? 'reply-avatar--staff' : 'reply-avatar--user'}`}>
                        {reply.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="reply-content">
                        <div className="reply-header">
                          <span className="reply-username">{reply.username}</span>
                          {reply.is_staff && <span className="reply-staff-tag">Staff</span>}
                          <span className="reply-time">{formatTimeAgo(reply.created_at)}</span>
                        </div>
                        <div className="reply-body">{reply.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reply composer */}
            <div className="reply-composer">
              <textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.repeat) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
              >
                {sendingReply ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
