import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeCanvas: React.FC<QRCodeCanvasProps> = ({ value, size = 180, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: {
          dark: '#050508',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) console.error('QR code generation error:', error);
      });
    }
  }, [value, size]);

  return (
    <div className={`p-3 bg-white rounded-2xl shadow-md inline-flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
};
