import { DiagramElement, Connector, UmlType } from '../types';

export interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  elementId?: string;
  message: string;
  rule: string;
}

export function validateDiagram(
  elements: DiagramElement[],
  connectors: Connector[],
  umlType: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // ── General rules ──
  elements.forEach(el => {
    // All elements must have a non-empty name
    if (!el.label || el.label.trim() === '') {
      errors.push({
        severity: 'error',
        elementId: el.id,
        message: `${el.element_type} has no name/label`,
        rule: 'UML-GEN-001: All elements must have a name',
      });
    }
  });

  // Orphan element warning
  elements.forEach(el => {
    if (el.element_type === 'note') return; // notes don't need connections
    const hasConnection = connectors.some(c => c.source_id === el.id || c.target_id === el.id);
    if (!hasConnection && elements.length > 1) {
      errors.push({
        severity: 'warning',
        elementId: el.id,
        message: `"${el.label}" has no connections to other elements`,
        rule: 'UML-GEN-002: Elements should be connected',
      });
    }
  });

  // Connector validity
  connectors.forEach(conn => {
    const source = elements.find(e => e.id === conn.source_id);
    const target = elements.find(e => e.id === conn.target_id);
    if (!source || !target) {
      errors.push({
        severity: 'error',
        message: 'Connector references a missing element',
        rule: 'UML-GEN-003: Connector endpoints must exist',
      });
    }
  });

  // ── Class diagram rules ──
  if (umlType === 'class') {
    const classElements = elements.filter(e => e.element_type === 'class-box');

    classElements.forEach(cls => {
      // Attributes must have valid visibility
      (cls.attributes || []).forEach((attr, i) => {
        if (!['+', '-', '#', '~'].includes(attr.visibility)) {
          errors.push({
            severity: 'error',
            elementId: cls.id,
            message: `Attribute "${attr.name}" in "${cls.label}" has invalid visibility "${attr.visibility}"`,
            rule: 'UML-CLASS-001: Attributes must have valid visibility (+, -, #, ~)',
          });
        }
        if (!attr.name || attr.name.trim() === '') {
          errors.push({
            severity: 'error',
            elementId: cls.id,
            message: `Attribute ${i + 1} in "${cls.label}" has no name`,
            rule: 'UML-CLASS-002: Attributes must have a name',
          });
        }
        if (!attr.type || attr.type.trim() === '') {
          errors.push({
            severity: 'warning',
            elementId: cls.id,
            message: `Attribute "${attr.name}" in "${cls.label}" has no type specified`,
            rule: 'UML-CLASS-003: Attributes should have a type',
          });
        }
      });

      // Methods must have valid visibility
      (cls.methods || []).forEach((meth, i) => {
        if (!['+', '-', '#', '~'].includes(meth.visibility)) {
          errors.push({
            severity: 'error',
            elementId: cls.id,
            message: `Method "${meth.name}" in "${cls.label}" has invalid visibility`,
            rule: 'UML-CLASS-004: Methods must have valid visibility',
          });
        }
        if (!meth.name || meth.name.trim() === '') {
          errors.push({
            severity: 'error',
            elementId: cls.id,
            message: `Method ${i + 1} in "${cls.label}" has no name`,
            rule: 'UML-CLASS-005: Methods must have a name',
          });
        }
      });

      // No self-inheritance
      const selfInherit = connectors.find(c =>
        c.relation_type === 'inheritance' && c.source_id === cls.id && c.target_id === cls.id
      );
      if (selfInherit) {
        errors.push({
          severity: 'error',
          elementId: cls.id,
          message: `"${cls.label}" inherits from itself`,
          rule: 'UML-CLASS-006: A class cannot inherit from itself',
        });
      }
    });

    // Inheritance must connect class to class
    connectors
      .filter(c => c.relation_type === 'inheritance')
      .forEach(conn => {
        const source = elements.find(e => e.id === conn.source_id);
        const target = elements.find(e => e.id === conn.target_id);
        if (source && target) {
          if (source.element_type !== 'class-box' || target.element_type !== 'class-box') {
            errors.push({
              severity: 'error',
              elementId: conn.source_id,
              message: `Inheritance between "${source.label}" and "${target.label}" — both must be classes`,
              rule: 'UML-CLASS-007: Inheritance must connect class to class',
            });
          }
        }
      });
  }

  // ── Use case diagram rules ──
  if (umlType === 'usecase') {
    const actors = elements.filter(e => e.element_type === 'actor');
    const useCases = elements.filter(e => e.element_type === 'usecase');

    // Actors must connect to at least one use case
    actors.forEach(actor => {
      const connected = connectors.some(c =>
        (c.source_id === actor.id || c.target_id === actor.id)
      );
      if (!connected) {
        errors.push({
          severity: 'warning',
          elementId: actor.id,
          message: `Actor "${actor.label}" is not connected to any use case`,
          rule: 'UML-UC-001: Actors should connect to at least one use case',
        });
      }
    });

    // Use cases must have descriptive names
    useCases.forEach(uc => {
      if (uc.label === 'Use Case' || uc.label.trim().length < 3) {
        errors.push({
          severity: 'warning',
          elementId: uc.id,
          message: `Use case "${uc.label}" should have a descriptive name`,
          rule: 'UML-UC-002: Use cases should have descriptive names',
        });
      }
    });

    // Include/extend must connect use case to use case
    connectors
      .filter(c => c.relation_type === 'include' || c.relation_type === 'extend')
      .forEach(conn => {
        const source = elements.find(e => e.id === conn.source_id);
        const target = elements.find(e => e.id === conn.target_id);
        if (source && target) {
          if (source.element_type !== 'usecase' || target.element_type !== 'usecase') {
            errors.push({
              severity: 'error',
              elementId: conn.source_id,
              message: `«${conn.relation_type}» must connect use case to use case`,
              rule: 'UML-UC-003: Include/extend only between use cases',
            });
          }
        }
      });
  }

  return errors;
}
