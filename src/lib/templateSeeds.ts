import { ArchStyle, Connector, Diagram, DiagramElement, ElementType, RelationType } from '../types';

interface SeedData {
  elements: DiagramElement[];
  connectors: Connector[];
}

type ElementInput = {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
};

type ConnectorInput = {
  id: string;
  source: string;
  target: string;
  relation: RelationType;
  label?: string;
  ms?: string;
  mt?: string;
};

function makeElements(diagramId: string, items: ElementInput[]): DiagramElement[] {
  return items.map((el) => ({
    id: `${diagramId}-${el.id}`,
    diagram_id: diagramId,
    element_type: el.type,
    label: el.label,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    fill: el.fill || '#E6F1FB',
    stroke: el.stroke || '#378ADD',
    stereotype: '',
    notes: '',
    attributes: el.type === 'class-box' ? [{ visibility: '+', name: 'id', type: 'UUID' }] : [],
    methods: el.type === 'class-box' ? [{ visibility: '+', name: 'execute', returnType: 'void', params: '' }] : [],
  }));
}

function makeConnectors(diagramId: string, items: ConnectorInput[]): Connector[] {
  return items.map((c) => ({
    id: `${diagramId}-${c.id}`,
    diagram_id: diagramId,
    source_id: `${diagramId}-${c.source}`,
    target_id: `${diagramId}-${c.target}`,
    relation_type: c.relation,
    label: c.label || '',
    multiplicity_source: c.ms || '',
    multiplicity_target: c.mt || '',
  }));
}

function mvcSeed(diagram: Diagram): SeedData {
  switch (diagram.view_type) {
    case 'scenario':
      return {
        elements: makeElements(diagram.id, [
          { id: 'actor-user', type: 'actor', label: 'User', x: 80, y: 140, width: 50, height: 90 },
          { id: 'uc-browse', type: 'usecase', label: 'Browse Catalog', x: 280, y: 100, width: 170, height: 60 },
          { id: 'uc-checkout', type: 'usecase', label: 'Checkout', x: 280, y: 210, width: 170, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'actor-user', target: 'uc-browse', relation: 'association' },
          { id: 'c2', source: 'actor-user', target: 'uc-checkout', relation: 'association' },
          { id: 'c3', source: 'uc-checkout', target: 'uc-browse', relation: 'include', label: 'uses catalog' },
        ]),
      };
    case 'logical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'model', type: 'class-box', label: 'ProductModel', x: 120, y: 180, width: 170, height: 120 },
          { id: 'view', type: 'class-box', label: 'ProductView', x: 360, y: 80, width: 170, height: 120 },
          { id: 'controller', type: 'class-box', label: 'ProductController', x: 360, y: 280, width: 190, height: 120 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'controller', target: 'model', relation: 'dependency' },
          { id: 'c2', source: 'view', target: 'controller', relation: 'association' },
          { id: 'c3', source: 'model', target: 'view', relation: 'association' },
        ]),
      };
    case 'development':
      return {
        elements: makeElements(diagram.id, [
          { id: 'pkg-ui', type: 'package', label: 'ui', x: 80, y: 90, width: 180, height: 120 },
          { id: 'cmp-controller', type: 'component', label: 'controllers', x: 320, y: 90, width: 170, height: 90 },
          { id: 'cmp-domain', type: 'component', label: 'domain', x: 320, y: 230, width: 170, height: 90 },
          { id: 'cmp-persistence', type: 'component', label: 'persistence', x: 550, y: 230, width: 170, height: 90 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'pkg-ui', target: 'cmp-controller', relation: 'dependency' },
          { id: 'c2', source: 'cmp-controller', target: 'cmp-domain', relation: 'dependency' },
          { id: 'c3', source: 'cmp-domain', target: 'cmp-persistence', relation: 'dependency' },
        ]),
      };
    case 'process':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a1', type: 'activity', label: 'User Request', x: 90, y: 170, width: 140, height: 60 },
          { id: 'a2', type: 'activity', label: 'Controller Action', x: 300, y: 170, width: 170, height: 60 },
          { id: 'a3', type: 'activity', label: 'Model Update', x: 540, y: 170, width: 150, height: 60 },
          { id: 's1', type: 'state', label: 'Rendered View', x: 760, y: 170, width: 150, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'a1', target: 'a2', relation: 'association' },
          { id: 'c2', source: 'a2', target: 'a3', relation: 'association' },
          { id: 'c3', source: 'a3', target: 's1', relation: 'association' },
        ]),
      };
    case 'physical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'n1', type: 'node', label: 'Browser Client', x: 70, y: 120, width: 180, height: 100 },
          { id: 'n2', type: 'node', label: 'Web/App Server', x: 360, y: 120, width: 200, height: 100 },
          { id: 'n3', type: 'node', label: 'Database Server', x: 680, y: 120, width: 200, height: 100 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'n1', target: 'n2', relation: 'association' },
          { id: 'c2', source: 'n2', target: 'n3', relation: 'association' },
        ]),
      };
  }
}

function layeredSeed(diagram: Diagram): SeedData {
  switch (diagram.view_type) {
    case 'scenario':
      return mvcSeed(diagram);
    case 'logical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'l1', type: 'package', label: 'Presentation Layer', x: 260, y: 40, width: 260, height: 80 },
          { id: 'l2', type: 'package', label: 'Application Layer', x: 260, y: 140, width: 260, height: 80 },
          { id: 'l3', type: 'package', label: 'Domain Layer', x: 260, y: 240, width: 260, height: 80 },
          { id: 'l4', type: 'package', label: 'Data Layer', x: 260, y: 340, width: 260, height: 80 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'l1', target: 'l2', relation: 'dependency' },
          { id: 'c2', source: 'l2', target: 'l3', relation: 'dependency' },
          { id: 'c3', source: 'l3', target: 'l4', relation: 'dependency' },
        ]),
      };
    case 'development':
      return {
        elements: makeElements(diagram.id, [
          { id: 'c1', type: 'component', label: 'web-ui', x: 90, y: 140, width: 170, height: 90 },
          { id: 'c2', type: 'component', label: 'app-service', x: 320, y: 140, width: 170, height: 90 },
          { id: 'c3', type: 'component', label: 'domain-core', x: 550, y: 140, width: 170, height: 90 },
          { id: 'c4', type: 'component', label: 'db-access', x: 780, y: 140, width: 170, height: 90 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'r1', source: 'c1', target: 'c2', relation: 'dependency' },
          { id: 'r2', source: 'c2', target: 'c3', relation: 'dependency' },
          { id: 'r3', source: 'c3', target: 'c4', relation: 'dependency' },
        ]),
      };
    case 'process':
      return mvcSeed(diagram);
    case 'physical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'n1', type: 'node', label: 'Web Tier', x: 90, y: 130, width: 170, height: 100 },
          { id: 'n2', type: 'node', label: 'App Tier', x: 360, y: 130, width: 170, height: 100 },
          { id: 'n3', type: 'node', label: 'Data Tier', x: 630, y: 130, width: 170, height: 100 },
          { id: 'n4', type: 'node', label: 'Cache Tier', x: 900, y: 130, width: 170, height: 100 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'r1', source: 'n1', target: 'n2', relation: 'association' },
          { id: 'r2', source: 'n2', target: 'n3', relation: 'association' },
          { id: 'r3', source: 'n2', target: 'n4', relation: 'dependency' },
        ]),
      };
  }
}

function clientServerSeed(diagram: Diagram): SeedData {
  switch (diagram.view_type) {
    case 'scenario':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a', type: 'actor', label: 'Client User', x: 90, y: 160, width: 50, height: 90 },
          { id: 'u1', type: 'usecase', label: 'Login', x: 300, y: 120, width: 150, height: 60 },
          { id: 'u2', type: 'usecase', label: 'Fetch Data', x: 300, y: 230, width: 150, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'a', target: 'u1', relation: 'association' },
          { id: 'c2', source: 'a', target: 'u2', relation: 'association' },
        ]),
      };
    case 'logical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'cls1', type: 'class-box', label: 'ClientApp', x: 100, y: 160, width: 170, height: 120 },
          { id: 'cls2', type: 'class-box', label: 'ApiService', x: 360, y: 160, width: 170, height: 120 },
          { id: 'cls3', type: 'class-box', label: 'Repository', x: 620, y: 160, width: 170, height: 120 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'x1', source: 'cls1', target: 'cls2', relation: 'dependency' },
          { id: 'x2', source: 'cls2', target: 'cls3', relation: 'dependency' },
        ]),
      };
    case 'development':
      return {
        elements: makeElements(diagram.id, [
          { id: 'co1', type: 'component', label: 'Client UI', x: 90, y: 150, width: 180, height: 90 },
          { id: 'co2', type: 'component', label: 'REST API', x: 380, y: 150, width: 180, height: 90 },
          { id: 'co3', type: 'component', label: 'Data Service', x: 670, y: 150, width: 180, height: 90 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'x1', source: 'co1', target: 'co2', relation: 'association' },
          { id: 'x2', source: 'co2', target: 'co3', relation: 'association' },
        ]),
      };
    case 'process':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a1', type: 'activity', label: 'Client Request', x: 80, y: 180, width: 160, height: 60 },
          { id: 'a2', type: 'activity', label: 'Server Validation', x: 320, y: 180, width: 180, height: 60 },
          { id: 'a3', type: 'activity', label: 'DB Query', x: 590, y: 180, width: 140, height: 60 },
          { id: 'a4', type: 'state', label: 'Response Sent', x: 810, y: 180, width: 150, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'z1', source: 'a1', target: 'a2', relation: 'association' },
          { id: 'z2', source: 'a2', target: 'a3', relation: 'association' },
          { id: 'z3', source: 'a3', target: 'a4', relation: 'association' },
        ]),
      };
    case 'physical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'n1', type: 'node', label: 'Client Device', x: 80, y: 130, width: 180, height: 100 },
          { id: 'n2', type: 'node', label: 'Application Server', x: 390, y: 130, width: 200, height: 100 },
          { id: 'n3', type: 'node', label: 'Database Server', x: 730, y: 130, width: 200, height: 100 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'q1', source: 'n1', target: 'n2', relation: 'association' },
          { id: 'q2', source: 'n2', target: 'n3', relation: 'association' },
        ]),
      };
  }
}

function pipeFilterSeed(diagram: Diagram): SeedData {
  switch (diagram.view_type) {
    case 'scenario':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a', type: 'actor', label: 'Data Analyst', x: 90, y: 160, width: 50, height: 90 },
          { id: 'u1', type: 'usecase', label: 'Run Pipeline', x: 300, y: 130, width: 170, height: 60 },
          { id: 'u2', type: 'usecase', label: 'Review Output', x: 300, y: 230, width: 170, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'r1', source: 'a', target: 'u1', relation: 'association' },
          { id: 'r2', source: 'a', target: 'u2', relation: 'association' },
        ]),
      };
    case 'logical':
    case 'development':
      return {
        elements: makeElements(diagram.id, [
          { id: 'f1', type: 'component', label: 'Input Reader', x: 80, y: 170, width: 150, height: 80 },
          { id: 'f2', type: 'component', label: 'Parser Filter', x: 280, y: 170, width: 150, height: 80 },
          { id: 'f3', type: 'component', label: 'Transform Filter', x: 480, y: 170, width: 170, height: 80 },
          { id: 'f4', type: 'component', label: 'Output Writer', x: 710, y: 170, width: 150, height: 80 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'r1', source: 'f1', target: 'f2', relation: 'association' },
          { id: 'r2', source: 'f2', target: 'f3', relation: 'association' },
          { id: 'r3', source: 'f3', target: 'f4', relation: 'association' },
        ]),
      };
    case 'process':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a1', type: 'activity', label: 'Ingest Stream', x: 70, y: 180, width: 150, height: 60 },
          { id: 'a2', type: 'activity', label: 'Parse', x: 260, y: 180, width: 120, height: 60 },
          { id: 'a3', type: 'activity', label: 'Filter', x: 420, y: 180, width: 120, height: 60 },
          { id: 'a4', type: 'activity', label: 'Transform', x: 580, y: 180, width: 140, height: 60 },
          { id: 's1', type: 'state', label: 'Publish Output', x: 770, y: 180, width: 150, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'p1', source: 'a1', target: 'a2', relation: 'association' },
          { id: 'p2', source: 'a2', target: 'a3', relation: 'association' },
          { id: 'p3', source: 'a3', target: 'a4', relation: 'association' },
          { id: 'p4', source: 'a4', target: 's1', relation: 'association' },
        ]),
      };
    case 'physical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'n1', type: 'node', label: 'Ingestion Node', x: 90, y: 130, width: 180, height: 100 },
          { id: 'n2', type: 'node', label: 'Processing Node', x: 380, y: 130, width: 200, height: 100 },
          { id: 'n3', type: 'node', label: 'Storage Node', x: 700, y: 130, width: 180, height: 100 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'z1', source: 'n1', target: 'n2', relation: 'association' },
          { id: 'z2', source: 'n2', target: 'n3', relation: 'association' },
        ]),
      };
  }
}

function soaSeed(diagram: Diagram): SeedData {
  switch (diagram.view_type) {
    case 'scenario':
      return {
        elements: makeElements(diagram.id, [
          { id: 'actor', type: 'actor', label: 'Customer', x: 70, y: 160, width: 50, height: 90 },
          { id: 'u1', type: 'usecase', label: 'Place Order', x: 260, y: 110, width: 170, height: 60 },
          { id: 'u2', type: 'usecase', label: 'Track Order', x: 260, y: 220, width: 170, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'a1', source: 'actor', target: 'u1', relation: 'association' },
          { id: 'a2', source: 'actor', target: 'u2', relation: 'association' },
        ]),
      };
    case 'logical':
    case 'development':
      return {
        elements: makeElements(diagram.id, [
          { id: 'g', type: 'component', label: 'API Gateway', x: 70, y: 170, width: 160, height: 80 },
          { id: 's1', type: 'component', label: 'Auth Service', x: 280, y: 80, width: 160, height: 80 },
          { id: 's2', type: 'component', label: 'Order Service', x: 280, y: 260, width: 170, height: 80 },
          { id: 's3', type: 'component', label: 'Payment Service', x: 520, y: 260, width: 180, height: 80 },
          { id: 's4', type: 'component', label: 'Notification Service', x: 760, y: 260, width: 210, height: 80 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'c1', source: 'g', target: 's1', relation: 'dependency' },
          { id: 'c2', source: 'g', target: 's2', relation: 'dependency' },
          { id: 'c3', source: 's2', target: 's3', relation: 'association' },
          { id: 'c4', source: 's2', target: 's4', relation: 'dependency' },
        ]),
      };
    case 'process':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a1', type: 'activity', label: 'Receive Request', x: 80, y: 180, width: 160, height: 60 },
          { id: 'a2', type: 'activity', label: 'Authorize', x: 300, y: 180, width: 130, height: 60 },
          { id: 'a3', type: 'activity', label: 'Create Order', x: 490, y: 180, width: 150, height: 60 },
          { id: 'a4', type: 'activity', label: 'Process Payment', x: 700, y: 180, width: 170, height: 60 },
          { id: 's1', type: 'state', label: 'Order Confirmed', x: 940, y: 180, width: 170, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 's1', source: 'a1', target: 'a2', relation: 'association' },
          { id: 's2', source: 'a2', target: 'a3', relation: 'association' },
          { id: 's3', source: 'a3', target: 'a4', relation: 'association' },
          { id: 's4', source: 'a4', target: 's1', relation: 'association' },
        ]),
      };
    case 'physical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'n1', type: 'node', label: 'Ingress', x: 70, y: 130, width: 150, height: 100 },
          { id: 'n2', type: 'node', label: 'K8s Service Cluster', x: 300, y: 130, width: 240, height: 100 },
          { id: 'n3', type: 'node', label: 'Message Broker', x: 610, y: 130, width: 190, height: 100 },
          { id: 'n4', type: 'node', label: 'Database', x: 870, y: 130, width: 170, height: 100 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'f1', source: 'n1', target: 'n2', relation: 'association' },
          { id: 'f2', source: 'n2', target: 'n3', relation: 'association' },
          { id: 'f3', source: 'n2', target: 'n4', relation: 'association' },
        ]),
      };
  }
}

function componentSeed(diagram: Diagram): SeedData {
  switch (diagram.view_type) {
    case 'scenario':
      return {
        elements: makeElements(diagram.id, [
          { id: 'actor', type: 'actor', label: 'User', x: 90, y: 170, width: 50, height: 90 },
          { id: 'u1', type: 'usecase', label: 'Browse Components', x: 300, y: 130, width: 190, height: 60 },
          { id: 'u2', type: 'usecase', label: 'Assemble Feature', x: 300, y: 230, width: 190, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'a1', source: 'actor', target: 'u1', relation: 'association' },
          { id: 'a2', source: 'actor', target: 'u2', relation: 'association' },
        ]),
      };
    case 'logical':
    case 'development':
      return {
        elements: makeElements(diagram.id, [
          { id: 'c1', type: 'component', label: 'UI Component', x: 90, y: 170, width: 160, height: 80 },
          { id: 'c2', type: 'component', label: 'Catalog Component', x: 320, y: 90, width: 190, height: 80 },
          { id: 'c3', type: 'component', label: 'Cart Component', x: 320, y: 250, width: 170, height: 80 },
          { id: 'c4', type: 'component', label: 'Payment Component', x: 580, y: 170, width: 190, height: 80 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'l1', source: 'c1', target: 'c2', relation: 'dependency' },
          { id: 'l2', source: 'c1', target: 'c3', relation: 'dependency' },
          { id: 'l3', source: 'c3', target: 'c4', relation: 'association' },
        ]),
      };
    case 'process':
      return {
        elements: makeElements(diagram.id, [
          { id: 'a1', type: 'activity', label: 'Select Component', x: 80, y: 180, width: 170, height: 60 },
          { id: 'a2', type: 'activity', label: 'Compose Feature', x: 320, y: 180, width: 170, height: 60 },
          { id: 'a3', type: 'activity', label: 'Validate Contracts', x: 560, y: 180, width: 180, height: 60 },
          { id: 's1', type: 'state', label: 'Deployable Module', x: 820, y: 180, width: 180, height: 60 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'p1', source: 'a1', target: 'a2', relation: 'association' },
          { id: 'p2', source: 'a2', target: 'a3', relation: 'association' },
          { id: 'p3', source: 'a3', target: 's1', relation: 'association' },
        ]),
      };
    case 'physical':
      return {
        elements: makeElements(diagram.id, [
          { id: 'n1', type: 'node', label: 'Web Host', x: 90, y: 130, width: 170, height: 100 },
          { id: 'n2', type: 'node', label: 'Service Host', x: 390, y: 130, width: 180, height: 100 },
          { id: 'n3', type: 'node', label: 'Data Host', x: 700, y: 130, width: 160, height: 100 },
        ]),
        connectors: makeConnectors(diagram.id, [
          { id: 'h1', source: 'n1', target: 'n2', relation: 'association' },
          { id: 'h2', source: 'n2', target: 'n3', relation: 'association' },
        ]),
      };
  }
}

function emptySeed(): SeedData {
  return { elements: [], connectors: [] };
}

export function getTemplateSeed(style: ArchStyle, diagram: Diagram): SeedData {
  if (style === 'custom') return emptySeed();
  if (style === 'mvc') return mvcSeed(diagram);
  if (style === 'layered') return layeredSeed(diagram);
  if (style === 'client-server') return clientServerSeed(diagram);
  if (style === 'pipe-filter') return pipeFilterSeed(diagram);
  if (style === 'soa') return soaSeed(diagram);
  if (style === 'component-based') return componentSeed(diagram);
  return emptySeed();
}
