import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  enabled: boolean;
}

export default function QRScanner({ onScan, enabled }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const lastScannedRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const scannerId = 'qr-scanner-region';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Debounce: prevent same QR from firing multiple times
            if (decodedText !== lastScannedRef.current) {
              lastScannedRef.current = decodedText;
              onScan(decodedText);
              // Reset after 3 seconds to allow re-scan
              setTimeout(() => {
                lastScannedRef.current = '';
              }, 3000);
            }
          },
          () => {
            // QR code not detected - ignore
          }
        );
        setScanning(true);
        setError('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Camera access denied';
        setError(message);
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [enabled, onScan]);

  if (!enabled) return null;

  return (
    <div className="qr-scanner-container">
      {error && (
        <div className="alert alert-error">
          <strong>Camera Error:</strong> {error}
          <p>Make sure camera permissions are granted.</p>
        </div>
      )}
      <div
        id="qr-scanner-region"
        ref={containerRef}
        className="qr-scanner-view"
      />
      {scanning && (
        <p className="scanner-hint">Point camera at QR code to scan</p>
      )}
    </div>
  );
}
