import QRCode from 'qrcode';

/** High-contrast QR PNG for sharing (WhatsApp-safe: margin + error correction H). */
export async function qrTokenToPngBlob(token: string): Promise<Blob> {
  const value = token.trim();
  if (!value) throw new Error('QR token is empty');

  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 1024,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (!blob.size) throw new Error('QR image generation failed');
  return blob;
}
