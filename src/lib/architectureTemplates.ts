import { ActiveTool, ArchStyle, UmlType, ViewType } from '../types';

export interface ViewTemplate {
  view: ViewType;
  umlType: UmlType;
  name: string;
}

type ViewToolMap = Record<ViewType, ActiveTool[]>;

const DEFAULT_VIEW_TOOLS: ViewToolMap = {
  scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
  logical: ['select', 'class-box', 'interface', 'object', 'association', 'inheritance', 'realization', 'aggregation', 'composition', 'dependency', 'note'],
  development: ['select', 'component', 'package', 'interface', 'association', 'dependency', 'realization', 'note'],
  process: ['select', 'activity', 'state', 'association', 'dependency', 'note'],
  physical: ['select', 'node', 'component', 'association', 'dependency', 'note'],
};

const ARCH_VIEW_TEMPLATES: Record<ArchStyle, ViewTemplate[]> = {
  mvc: [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View (Use Cases)' },
    { view: 'logical', umlType: 'class', name: 'Logical View (MVC Domain)' },
    { view: 'development', umlType: 'component', name: 'Development View (MVC Modules)' },
    { view: 'process', umlType: 'activity', name: 'Process View (Request Flow)' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View (Deployment)' },
  ],
  layered: [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View (Use Cases)' },
    { view: 'logical', umlType: 'class', name: 'Logical View (Layer Responsibilities)' },
    { view: 'development', umlType: 'component', name: 'Development View (Tier Modules)' },
    { view: 'process', umlType: 'activity', name: 'Process View (Cross-Layer Flows)' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View (Tier Deployment)' },
  ],
  'client-server': [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View (Client Journeys)' },
    { view: 'logical', umlType: 'class', name: 'Logical View (Domain + API Contracts)' },
    { view: 'development', umlType: 'component', name: 'Development View (Client/Server Components)' },
    { view: 'process', umlType: 'activity', name: 'Process View (Request-Response Dynamics)' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View (Client/Server Topology)' },
  ],
  'pipe-filter': [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View (Data Processing Use Cases)' },
    { view: 'logical', umlType: 'component', name: 'Logical View (Filters and Pipes)' },
    { view: 'development', umlType: 'component', name: 'Development View (Pipeline Stages)' },
    { view: 'process', umlType: 'activity', name: 'Process View (Streaming/Batch Flow)' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View (Runtime Nodes)' },
  ],
  soa: [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View (Business Capabilities)' },
    { view: 'logical', umlType: 'component', name: 'Logical View (Service Boundaries)' },
    { view: 'development', umlType: 'component', name: 'Development View (Services + Contracts)' },
    { view: 'process', umlType: 'activity', name: 'Process View (Orchestration/Choreography)' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View (Service Deployment)' },
  ],
  'component-based': [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View (User Goals)' },
    { view: 'logical', umlType: 'component', name: 'Logical View (Component Responsibilities)' },
    { view: 'development', umlType: 'component', name: 'Development View (Packages + Components)' },
    { view: 'process', umlType: 'activity', name: 'Process View (Component Interactions)' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View (Component Deployment)' },
  ],
  custom: [
    { view: 'scenario', umlType: 'usecase', name: 'Scenario View' },
    { view: 'logical', umlType: 'class', name: 'Logical View' },
    { view: 'development', umlType: 'component', name: 'Development View' },
    { view: 'process', umlType: 'activity', name: 'Process View' },
    { view: 'physical', umlType: 'deployment', name: 'Physical View' },
  ],
};

const ARCH_VIEW_TOOLS: Partial<Record<ArchStyle, ViewToolMap>> = {
  mvc: {
    scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
    logical: ['select', 'class-box', 'interface', 'object', 'association', 'inheritance', 'dependency', 'aggregation', 'composition', 'note'],
    development: ['select', 'component', 'package', 'interface', 'association', 'dependency', 'realization', 'note'],
    process: ['select', 'activity', 'state', 'association', 'dependency', 'note'],
    physical: ['select', 'node', 'component', 'association', 'dependency', 'note'],
  },
  layered: {
    scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
    logical: ['select', 'class-box', 'package', 'interface', 'association', 'dependency', 'composition', 'note'],
    development: ['select', 'package', 'component', 'interface', 'association', 'dependency', 'realization', 'note'],
    process: ['select', 'activity', 'state', 'dependency', 'note'],
    physical: ['select', 'node', 'component', 'association', 'dependency', 'note'],
  },
  'client-server': {
    scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
    logical: ['select', 'class-box', 'interface', 'object', 'association', 'dependency', 'note'],
    development: ['select', 'component', 'package', 'interface', 'association', 'dependency', 'realization', 'note'],
    process: ['select', 'activity', 'state', 'association', 'dependency', 'note'],
    physical: ['select', 'node', 'component', 'association', 'dependency', 'note'],
  },
  'pipe-filter': {
    scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
    logical: ['select', 'component', 'interface', 'association', 'dependency', 'note'],
    development: ['select', 'component', 'package', 'interface', 'association', 'dependency', 'realization', 'note'],
    process: ['select', 'activity', 'state', 'association', 'dependency', 'note'],
    physical: ['select', 'node', 'component', 'dependency', 'note'],
  },
  soa: {
    scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
    logical: ['select', 'component', 'interface', 'package', 'association', 'dependency', 'realization', 'note'],
    development: ['select', 'component', 'package', 'interface', 'association', 'dependency', 'realization', 'note'],
    process: ['select', 'activity', 'state', 'association', 'dependency', 'note'],
    physical: ['select', 'node', 'component', 'association', 'dependency', 'note'],
  },
  'component-based': {
    scenario: ['select', 'actor', 'actor-user', 'actor-admin', 'actor-system', 'usecase', 'association', 'include', 'extend', 'note'],
    logical: ['select', 'component', 'interface', 'class-box', 'package', 'association', 'realization', 'aggregation', 'composition', 'dependency', 'note'],
    development: ['select', 'component', 'package', 'interface', 'association', 'dependency', 'realization', 'note'],
    process: ['select', 'activity', 'state', 'dependency', 'note'],
    physical: ['select', 'node', 'component', 'association', 'dependency', 'note'],
  },
};

export function getViewTemplatesByArchStyle(style: ArchStyle): ViewTemplate[] {
  return ARCH_VIEW_TEMPLATES[style] || ARCH_VIEW_TEMPLATES.custom;
}

export function getViewTools(style: ArchStyle, view: ViewType): ActiveTool[] {
  const byStyle = ARCH_VIEW_TOOLS[style];
  if (byStyle?.[view]) return byStyle[view];
  return DEFAULT_VIEW_TOOLS[view];
}
