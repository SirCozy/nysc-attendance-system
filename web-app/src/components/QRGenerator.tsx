import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRGeneratorProps {
  data: string;
  size?: number;
  label?: string;
}

export default function QRGenerator({ data, size = 200, label }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).catch(console.error);
  }, [data, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `qr-${data}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="qr-code-card">
      <canvas ref={canvasRef} />
      {label && <p className="qr-label">{label}</p>}
      <button className="btn btn-sm" onClick={handleDownload}>
        Download
      </button>
    </div>
  );
}
