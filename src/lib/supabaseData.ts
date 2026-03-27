import { supabase } from './supabaseClient';
import type {
  Project,
  Diagram,
  DiagramElement,
  Connector,
  Attribute,
  Method,
} from '../types';

/*
 * ═══════════════════════════════════════════
 * Supabase Data Access Layer
 * ───────────────────────────────────────────
 * All database interactions go through here.
 * Guest mode falls back to localStorage in
 * the calling components (Dashboard, Editor).
 * ═══════════════════════════════════════════
 */

// ── Projects ──

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('fetchProjects error:', error);
    return [];
  }
  return data || [];
}

export async function createProject(
  project: Omit<Project, 'created_at' | 'updated_at'>
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: project.id,
      owner_id: project.owner_id,
      name: project.name,
      arch_style: project.arch_style,
    })
    .select()
    .single();

  if (error) {
    console.error('createProject error:', error);
    return null;
  }
  return data;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('deleteProject error:', error);
    return false;
  }
  return true;
}

// ── Diagrams ──

export async function fetchDiagrams(projectId: string): Promise<Diagram[]> {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchDiagrams error:', error);
    return [];
  }
  return data || [];
}

export async function createDiagrams(diagrams: Omit<Diagram, 'created_at' | 'updated_at'>[]): Promise<boolean> {
  const { error } = await supabase
    .from('diagrams')
    .insert(diagrams);

  if (error) {
    console.error('createDiagrams error:', error);
    return false;
  }
  return true;
}

// ── Elements ──

interface DbElement {
  id: string;
  diagram_id: string;
  element_type: string;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  stereotype: string;
  notes: string;
  sort_order: number;
}

interface DbAttribute {
  id: string;
  element_id: string;
  visibility: string;
  name: string;
  type: string;
  sort_order: number;
}

interface DbMethod {
  id: string;
  element_id: string;
  visibility: string;
  name: string;
  return_type: string;
  params: string;
  sort_order: number;
}

function dbElementToApp(
  el: DbElement,
  attrs: DbAttribute[],
  meths: DbMethod[]
): DiagramElement {
  return {
    id: el.id,
    diagram_id: el.diagram_id,
    element_type: el.element_type as DiagramElement['element_type'],
    label: el.label,
    x: el.pos_x,
    y: el.pos_y,
    width: el.width,
    height: el.height,
    fill: el.fill,
    stroke: el.stroke,
    stereotype: el.stereotype || '',
    notes: el.notes || '',
    attributes: attrs
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(a => ({
        visibility: a.visibility as Attribute['visibility'],
        name: a.name,
        type: a.type,
      })),
    methods: meths
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(m => ({
        visibility: m.visibility as Method['visibility'],
        name: m.name,
        returnType: m.return_type,
        params: m.params,
      })),
  };
}

export async function fetchDiagramData(
  diagramId: string
): Promise<{ elements: DiagramElement[]; connectors: Connector[] }> {
  // Fetch elements with their attributes and methods in parallel
  const [elemRes, connRes] = await Promise.all([
    supabase.from('elements').select('*').eq('diagram_id', diagramId).order('sort_order'),
    supabase.from('connectors').select('*').eq('diagram_id', diagramId),
  ]);

  if (elemRes.error) console.error('fetchElements error:', elemRes.error);
  if (connRes.error) console.error('fetchConnectors error:', connRes.error);

  const rawElements: DbElement[] = elemRes.data || [];
  const rawConnectors = connRes.data || [];

  if (rawElements.length === 0) {
    return { elements: [], connectors: rawConnectors };
  }

  // Fetch attributes and methods for all elements
  const elementIds = rawElements.map(e => e.id);

  const [attrRes, methRes] = await Promise.all([
    supabase.from('attributes').select('*').in('element_id', elementIds).order('sort_order'),
    supabase.from('methods').select('*').in('element_id', elementIds).order('sort_order'),
  ]);

  if (attrRes.error) console.error('fetchAttributes error:', attrRes.error);
  if (methRes.error) console.error('fetchMethods error:', methRes.error);

  const allAttrs: DbAttribute[] = attrRes.data || [];
  const allMeths: DbMethod[] = methRes.data || [];

  // Group attributes/methods by element_id
  const attrsByEl = new Map<string, DbAttribute[]>();
  const methsByEl = new Map<string, DbMethod[]>();

  for (const a of allAttrs) {
    const arr = attrsByEl.get(a.element_id) || [];
    arr.push(a);
    attrsByEl.set(a.element_id, arr);
  }
  for (const m of allMeths) {
    const arr = methsByEl.get(m.element_id) || [];
    arr.push(m);
    methsByEl.set(m.element_id, arr);
  }

  const elements = rawElements.map(el =>
    dbElementToApp(
      el,
      attrsByEl.get(el.id) || [],
      methsByEl.get(el.id) || []
    )
  );

  return { elements, connectors: rawConnectors };
}

// ── Save diagram data (full replace strategy) ──

export async function saveDiagramData(
  diagramId: string,
  elements: DiagramElement[],
  connectors: Connector[]
): Promise<boolean> {
  // 1. Delete old elements (cascades to attributes + methods) and connectors
  const [delEl, delConn] = await Promise.all([
    supabase.from('elements').delete().eq('diagram_id', diagramId),
    supabase.from('connectors').delete().eq('diagram_id', diagramId),
  ]);

  if (delEl.error) console.error('deleteElements error:', delEl.error);
  if (delConn.error) console.error('deleteConnectors error:', delConn.error);

  // 2. Insert new elements
  if (elements.length > 0) {
    const dbElements = elements.map((el, i) => ({
      id: el.id,
      diagram_id: diagramId,
      element_type: el.element_type,
      label: el.label,
      pos_x: el.x,
      pos_y: el.y,
      width: el.width,
      height: el.height,
      fill: el.fill,
      stroke: el.stroke,
      stereotype: el.stereotype || '',
      notes: el.notes || '',
      sort_order: i,
    }));

    const { error: insElErr } = await supabase
      .from('elements')
      .insert(dbElements);

    if (insElErr) {
      console.error('insertElements error:', insElErr);
      return false;
    }

    // 3. Insert attributes and methods
    const allAttrs: Array<{
      element_id: string;
      visibility: string;
      name: string;
      type: string;
      sort_order: number;
    }> = [];
    const allMeths: Array<{
      element_id: string;
      visibility: string;
      name: string;
      return_type: string;
      params: string;
      sort_order: number;
    }> = [];

    for (const el of elements) {
      (el.attributes || []).forEach((attr, i) => {
        allAttrs.push({
          element_id: el.id,
          visibility: attr.visibility,
          name: attr.name,
          type: attr.type,
          sort_order: i,
        });
      });
      (el.methods || []).forEach((meth, i) => {
        allMeths.push({
          element_id: el.id,
          visibility: meth.visibility,
          name: meth.name,
          return_type: meth.returnType,
          params: meth.params || '',
          sort_order: i,
        });
      });
    }

    if (allAttrs.length > 0) {
      const { error } = await supabase.from('attributes').insert(allAttrs);
      if (error) console.error('insertAttributes error:', error);
    }

    if (allMeths.length > 0) {
      const { error } = await supabase.from('methods').insert(allMeths);
      if (error) console.error('insertMethods error:', error);
    }
  }

  // 4. Insert new connectors
  if (connectors.length > 0) {
    const dbConnectors = connectors.map(c => ({
      id: c.id,
      diagram_id: diagramId,
      source_id: c.source_id,
      target_id: c.target_id,
      relation_type: c.relation_type,
      label: c.label || '',
      multiplicity_source: c.multiplicity_source || '',
      multiplicity_target: c.multiplicity_target || '',
    }));

    const { error: insConnErr } = await supabase
      .from('connectors')
      .insert(dbConnectors);

    if (insConnErr) {
      console.error('insertConnectors error:', insConnErr);
      return false;
    }
  }

  return true;
}

// ── Seed diagram data (for new projects with template content) ──

export async function seedDiagramData(
  diagramId: string,
  elements: DiagramElement[],
  connectors: Connector[]
): Promise<boolean> {
  // Same as save — uses full replace
  return saveDiagramData(diagramId, elements, connectors);
}

// ── Storage: Diagram Exports ──

/**
 * Upload an exported diagram (PNG/SVG blob) to Supabase Storage.
 * Returns the public URL on success, null on failure.
 */
export async function uploadExport(
  userId: string,
  diagramId: string,
  blob: Blob,
  format: 'png' | 'svg'
): Promise<string | null> {
  const ext = format;
  const contentType = format === 'png' ? 'image/png' : 'image/svg+xml';
  const timestamp = Date.now();
  const path = `${userId}/${diagramId}/${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from('diagram-exports')
    .upload(path, blob, { contentType, upsert: false });

  if (error) {
    console.error('uploadExport error:', error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('diagram-exports')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Save an export record to the `exports` table.
 */
export async function saveExportRecord(
  diagramId: string,
  format: 'png' | 'svg',
  fileUrl: string
): Promise<boolean> {
  const { error } = await supabase
    .from('exports')
    .insert({ diagram_id: diagramId, format, file_url: fileUrl });

  if (error) {
    console.error('saveExportRecord error:', error);
    return false;
  }
  return true;
}
