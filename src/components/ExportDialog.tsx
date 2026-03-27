import { useState, RefObject } from 'react';
import * as db from '../lib/supabaseData';

interface ExportDialogProps {
  canvasRef: RefObject<SVGSVGElement | null>;
  projectName: string;
  diagramId: string | null;
  isGuest: boolean;
  userId: string | null;
  onClose: () => void;
}

export default function ExportDialog({
  canvasRef, projectName, diagramId, isGuest, userId, onClose,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [exporting, setExporting] = useState(false);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /** Generate a blob from the SVG canvas in the chosen format. */
  async function generateBlob(): Promise<Blob | null> {
    if (!canvasRef.current) return null;

    const svgElement = canvasRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    if (format === 'svg') return svgBlob;

    // SVG → Canvas → PNG
    return new Promise<Blob | null>((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width || 1200;
        canvas.height = img.height || 800;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => resolve(b), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  /** Download a blob as a local file. */
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

  /** Export: always downloads locally. Also uploads to cloud for auth users. */
  async function exportDiagram() {
    setExporting(true);
    setCloudUrl(null);

    try {
      const blob = await generateBlob();
      if (!blob) throw new Error('Failed to render diagram');

      // Always download locally
      downloadBlob(blob, `${projectName}.${format}`);

      // Cloud upload for authenticated users
      if (!isGuest && userId && diagramId) {
        const url = await db.uploadExport(userId, diagramId, blob, format);
        if (url) {
          await db.saveExportRecord(diagramId, format, url);
          setCloudUrl(url);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
    }

    setExporting(false);
  }

  function copyUrl() {
    if (!cloudUrl) return;
    navigator.clipboard.writeText(cloudUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                onClick={() => { setFormat(f); setCloudUrl(null); }}
              >
                <span className="export-format-icon">
                  {f === 'png' ? '🖼' : '📐'}
                </span>
                <span className="export-format-label">{f.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {!isGuest && (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            ☁️ A copy will also be saved to the cloud.
          </div>
        )}

        {cloudUrl && (
          <div style={{
            background: 'var(--surface-raised, #f0f4f8)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
          }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✅ Saved to cloud
            </span>
            <button className="btn btn-ghost btn-sm" onClick={copyUrl} style={{ fontSize: 11 }}>
              {copied ? '✓ Copied' : 'Copy URL'}
            </button>
          </div>
        )}

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
