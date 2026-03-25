import { useState, RefObject } from 'react';

interface ExportDialogProps {
  canvasRef: RefObject<SVGSVGElement | null>;
  projectName: string;
  onClose: () => void;
}

export default function ExportDialog({ canvasRef, projectName, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'svg' | 'pdf'>('png');
  const [exporting, setExporting] = useState(false);

  const exportDiagram = async () => {
    if (!canvasRef.current) return;
    setExporting(true);

    try {
      const svgElement = canvasRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

      if (format === 'svg') {
        downloadBlob(svgBlob, `${projectName}.svg`);
      } else if (format === 'png') {
        // SVG → Canvas → PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const url = URL.createObjectURL(svgBlob);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width || 1200;
            canvas.height = img.height || 800;
            // Fill white background
            ctx!.fillStyle = '#ffffff';
            ctx!.fillRect(0, 0, canvas.width, canvas.height);
            ctx!.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            canvas.toBlob(blob => {
              if (blob) downloadBlob(blob, `${projectName}.png`);
              resolve();
            }, 'image/png');
          };
          img.onerror = reject;
          img.src = url;
        });
      } else if (format === 'pdf') {
        // Simple PDF with embedded PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const url = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve) => {
          img.onload = () => {
            canvas.width = img.width || 1200;
            canvas.height = img.height || 800;
            ctx!.fillStyle = '#ffffff';
            ctx!.fillRect(0, 0, canvas.width, canvas.height);
            ctx!.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            // Simple PDF generation (basic structure)
            const dataUrl = canvas.toDataURL('image/png');
            // Use a simple approach: download as PNG with PDF note
            canvas.toBlob(blob => {
              if (blob) downloadBlob(blob, `${projectName}.png`);
              resolve();
            }, 'image/png');
          };
          img.src = url;
        });
      }
    } catch (err) {
      console.error('Export failed:', err);
    }

    setExporting(false);
  };

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 360 }}>
        <h2>Export Diagram</h2>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Format</label>
          <div className="export-formats">
            {(['png', 'svg'] as const).map(f => (
              <button
                key={f}
                className={`export-format-btn ${format === f ? 'active' : ''}`}
                onClick={() => setFormat(f)}
              >
                <span className="export-format-icon">
                  {f === 'png' ? '🖼' : f === 'svg' ? '📐' : '📄'}
                </span>
                <span className="export-format-label">{f.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={exportDiagram} disabled={exporting}>
            {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
