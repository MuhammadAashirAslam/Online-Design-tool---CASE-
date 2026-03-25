import { DiagramElement, Connector, Visibility } from '../types';

function visToJava(v: Visibility): string {
  switch (v) {
    case '+': return 'public';
    case '-': return 'private';
    case '#': return 'protected';
    case '~': return '';  // package-private
    default: return 'public';
  }
}

function visToCpp(v: Visibility): string {
  switch (v) {
    case '+': return 'public';
    case '-': return 'private';
    case '#': return 'protected';
    case '~': return 'public';
    default: return 'public';
  }
}

function javaType(t: string): string {
  const map: Record<string, string> = {
    'string': 'String', 'int': 'int', 'integer': 'int',
    'float': 'float', 'double': 'double', 'boolean': 'boolean',
    'bool': 'boolean', 'void': 'void', 'long': 'long',
    'char': 'char', 'byte': 'byte',
  };
  return map[t.toLowerCase()] || t;
}

function cppType(t: string): string {
  const map: Record<string, string> = {
    'string': 'std::string', 'String': 'std::string',
    'int': 'int', 'integer': 'int',
    'float': 'float', 'double': 'double',
    'boolean': 'bool', 'bool': 'bool',
    'void': 'void', 'long': 'long',
    'char': 'char', 'byte': 'uint8_t',
  };
  return map[t] || t;
}

export function generateJava(elements: DiagramElement[], connectors: Connector[]): string {
  const classElements = elements.filter(e => e.element_type === 'class-box');
  if (classElements.length === 0) return '// No class elements found.\n// Add class boxes to your diagram to generate Java code.';

  let code = '';

  classElements.forEach(cls => {
    // Find parent (inheritance)
    const inheritance = connectors.find(c =>
      c.relation_type === 'inheritance' && c.source_id === cls.id
    );
    const parent = inheritance
      ? elements.find(e => e.id === inheritance.target_id)
      : null;

    // Find interfaces (realization)
    const realizations = connectors.filter(c =>
      c.relation_type === 'realization' && c.source_id === cls.id
    );
    const interfaces = realizations
      .map(r => elements.find(e => e.id === r.target_id))
      .filter(Boolean);

    // Class declaration
    let decl = `public class ${cls.label}`;
    if (parent) decl += ` extends ${parent.label}`;
    if (interfaces.length > 0) {
      decl += ` implements ${interfaces.map(i => i!.label).join(', ')}`;
    }

    code += `${decl} {\n\n`;

    // Attributes
    (cls.attributes || []).forEach(attr => {
      code += `    ${visToJava(attr.visibility)} ${javaType(attr.type)} ${attr.name};\n`;
    });

    if ((cls.attributes || []).length > 0) code += '\n';

    // Constructor
    code += `    public ${cls.label}() {\n        // TODO: Initialize\n    }\n\n`;

    // Methods
    (cls.methods || []).forEach(meth => {
      const params = meth.params || '';
      code += `    ${visToJava(meth.visibility)} ${javaType(meth.returnType)} ${meth.name}(${params}) {\n`;
      if (meth.returnType !== 'void') {
        code += `        // TODO: Implement\n        return ${getDefaultJavaReturn(meth.returnType)};\n`;
      } else {
        code += `        // TODO: Implement\n`;
      }
      code += `    }\n\n`;
    });

    code += `}\n\n`;
  });

  return code.trim();
}

export function generateCpp(elements: DiagramElement[], connectors: Connector[]): string {
  const classElements = elements.filter(e => e.element_type === 'class-box');
  if (classElements.length === 0) return '// No class elements found.\n// Add class boxes to your diagram to generate C++ code.';

  let code = '#include <string>\n#include <iostream>\n\n';

  classElements.forEach(cls => {
    // Find parent (inheritance)
    const inheritance = connectors.find(c =>
      c.relation_type === 'inheritance' && c.source_id === cls.id
    );
    const parent = inheritance
      ? elements.find(e => e.id === inheritance.target_id)
      : null;

    let decl = `class ${cls.label}`;
    if (parent) decl += ` : public ${parent.label}`;

    code += `${decl} {\n`;

    // Group by visibility
    const groups: Record<string, { attrs: typeof cls.attributes; meths: typeof cls.methods }> = {
      'public': { attrs: [], meths: [] },
      'private': { attrs: [], meths: [] },
      'protected': { attrs: [], meths: [] },
    };

    (cls.attributes || []).forEach(attr => {
      const section = visToCpp(attr.visibility);
      groups[section]?.attrs?.push(attr);
    });

    (cls.methods || []).forEach(meth => {
      const section = visToCpp(meth.visibility);
      groups[section]?.meths?.push(meth);
    });

    // Always add constructor in public
    for (const [vis, group] of Object.entries(groups)) {
      if ((group.attrs?.length || 0) === 0 && (group.meths?.length || 0) === 0 && vis !== 'public') continue;

      code += `${vis}:\n`;

      if (vis === 'public') {
        code += `    ${cls.label}();\n`;
        code += `    ~${cls.label}();\n`;
      }

      group.attrs?.forEach(attr => {
        code += `    ${cppType(attr.type)} ${attr.name};\n`;
      });

      group.meths?.forEach(meth => {
        code += `    ${cppType(meth.returnType)} ${meth.name}(${meth.params || ''});\n`;
      });

      code += '\n';
    }

    code += `};\n\n`;

    // Implementation stubs
    code += `// ── ${cls.label} Implementation ──\n\n`;
    code += `${cls.label}::${cls.label}() {\n    // TODO: Initialize\n}\n\n`;
    code += `${cls.label}::~${cls.label}() {\n    // TODO: Cleanup\n}\n\n`;

    (cls.methods || []).forEach(meth => {
      code += `${cppType(meth.returnType)} ${cls.label}::${meth.name}(${meth.params || ''}) {\n`;
      if (meth.returnType !== 'void') {
        code += `    // TODO: Implement\n    return ${getDefaultCppReturn(meth.returnType)};\n`;
      } else {
        code += `    // TODO: Implement\n`;
      }
      code += `}\n\n`;
    });
  });

  return code.trim();
}

function getDefaultJavaReturn(type: string): string {
  const t = type.toLowerCase();
  if (['int', 'long', 'byte', 'short', 'float', 'double'].includes(t)) return '0';
  if (t === 'boolean' || t === 'bool') return 'false';
  if (t === 'char') return "'\\0'";
  return 'null';
}

function getDefaultCppReturn(type: string): string {
  const t = type.toLowerCase();
  if (['int', 'long', 'float', 'double'].includes(t)) return '0';
  if (t === 'bool' || t === 'boolean') return 'false';
  if (t === 'char') return "'\\0'";
  if (t === 'std::string' || t === 'string') return '""';
  return '{}';
}
