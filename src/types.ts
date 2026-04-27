/* ── Core domain types for ODT ── */

export type ArchStyle =
  | 'mvc'
  | 'layered'
  | 'client-server'
  | 'pipe-filter'
  | 'soa'
  | 'component-based'
  | 'custom';

export type UmlType =
  | 'class'
  | 'object'
  | 'usecase'
  | 'deployment'
  | 'component'
  | 'sequence'
  | 'activity'
  | 'state'
  | 'package';

export type ViewType =
  | 'scenario'
  | 'logical'
  | 'development'
  | 'process'
  | 'physical';

export type ElementType =
  | 'class-box'
  | 'actor'
  | 'actor-user'
  | 'actor-admin'
  | 'actor-system'
  | 'usecase'
  | 'component'
  | 'node'
  | 'interface'
  | 'package'
  | 'note'
  | 'object'
  | 'state'
  | 'activity';

export type RelationType =
  | 'association'
  | 'inheritance'
  | 'realization'
  | 'dependency'
  | 'aggregation'
  | 'composition'
  | 'include'
  | 'extend';

export type Visibility = '+' | '-' | '#' | '~';

/* ── Data models ── */

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  arch_style: ArchStyle;
  created_at: string;
  updated_at: string;
}

export interface Diagram {
  id: string;
  project_id: string;
  name: string;
  uml_type: UmlType;
  view_type: ViewType;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attribute {
  visibility: Visibility;
  name: string;
  type: string;
}

export interface Method {
  visibility: Visibility;
  name: string;
  returnType: string;
  params: string;
}

export interface DiagramElement {
  id: string;
  diagram_id: string;
  element_type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  stereotype?: string;
  notes?: string;
  attributes?: Attribute[];
  methods?: Method[];
}

export interface Connector {
  id: string;
  diagram_id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  label?: string;
  multiplicity_source?: string;
  multiplicity_target?: string;
}

export interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  elementId?: string;
  message: string;
  rule: string;
}

/* ── Ticketing System ── */

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketCategory =
  | 'bug'
  | 'feature-request'
  | 'ui-issue'
  | 'performance'
  | 'account'
  | 'other';

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  project_id?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  username: string;
  message: string;
  is_staff: boolean;
  created_at: string;
}

export type ActiveTool =
  | 'select'
  | ElementType
  | RelationType;
