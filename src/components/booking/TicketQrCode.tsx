import { QRCodeSVG } from 'qrcode.react';

/**
 * A ticket QR that a driver's phone can actually decode off a screen.
 *
 * Two things have to hold, and every hand-rolled `<QRCodeSVG value={token} />` call site in this
 * app used to get both wrong:
 *
 * 1. A quiet zone. qrcode.react defaults `marginSize` to 0, so the symbol ran edge to edge. The
 *    spec requires 4 light modules on every side because that border is how a decoder locates the
 *    three finder patterns; without it ZXing/MLKit cannot lock on at all.
 * 2. A light backing that survives dark mode. The cards these sat in were `dark:bg-...surfaceDark`
 *    (#232634), so in the dashboard's dark theme a margin-less symbol was bounded immediately by
 *    near-black pixels -- the worst case there is.
 *
 * Sizing: `size` is the total edge including the margin. qr_token is 64 hex chars, which at level M
 * is a version-5 symbol (37x37); 37 + 8 margin modules over 256px leaves ~5.7px per module, the
 * density a phone camera decodes reliably. Level H would push it to version 7 (45x45) and back
 * under 4px per module -- more error correction is not worth losing the resolution here.
 */
export function TicketQrCode({ value, size = 256 }: { value: string; size?: number }) {
  return (
    <div className="rounded-xl bg-white p-1">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={4}
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );
}
