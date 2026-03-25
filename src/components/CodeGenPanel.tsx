import { useState } from 'react';
import { DiagramElement, Connector } from '../types';
import { generateJava, generateCpp } from '../lib/codeGenerator';

interface CodeGenPanelProps {
  elements: DiagramElement[];
  connectors: Connector[];
  onClose: () => void;
}

export default function CodeGenPanel({ elements, connectors, onClose }: CodeGenPanelProps) {
  const [tab, setTab] = useState<'java' | 'cpp'>('java');
  const [copied, setCopied] = useState(false);

  const code = tab === 'java'
    ? generateJava(elements, connectors)
    : generateCpp(elements, connectors);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const ext = tab === 'java' ? '.java' : '.cpp';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel-slide" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="panel-header">
          <h2>Code Generation</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="codegen-tabs">
          <button
            className={`codegen-tab ${tab === 'java' ? 'active' : ''}`}
            onClick={() => setTab('java')}
          >
            Java
          </button>
          <button
            className={`codegen-tab ${tab === 'cpp' ? 'active' : ''}`}
            onClick={() => setTab('cpp')}
          >
            C++
          </button>
        </div>

        <div className="codegen-code">
          <pre><code>{code}</code></pre>
        </div>

        <div className="codegen-actions">
          <button className="btn btn-secondary" onClick={downloadFile}>
            ↓ Download .{tab === 'java' ? 'java' : 'cpp'}
          </button>
          <button className="btn btn-primary" onClick={copyToClipboard}>
            {copied ? '✓ Copied!' : '⧉ Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
