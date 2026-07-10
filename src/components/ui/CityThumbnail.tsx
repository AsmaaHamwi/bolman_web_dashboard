import { cityVisualFor } from '../../utils/cityVisual';
import { cx } from '../../utils/format';

type CityThumbnailProps = {
  cityName: string;
  size?: number;
  selected?: boolean;
  className?: string;
};

export function NoriaGlyph({ size = 18 }: { size?: number }) {
  const stroke = Math.max(1.2, size * 0.07);
  const r = size * 0.38;
  const cxPos = size / 2;
  const cyPos = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cxPos} cy={cyPos} r={r} fill="none" stroke="white" strokeWidth={stroke} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = cxPos + r * 0.2 * Math.cos(a);
        const y1 = cyPos + r * 0.2 * Math.sin(a);
        const x2 = cxPos + r * Math.cos(a);
        const y2 = cyPos + r * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={stroke} strokeLinecap="round" />;
      })}
      <line
        x1={cxPos - r * 1.05}
        y1={cyPos}
        x2={cxPos + r * 1.05}
        y2={cyPos}
        stroke="white"
        strokeWidth={stroke * 1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CityThumbnail({ cityName, size = 34, selected = false, className }: CityThumbnailProps) {
  const visual = cityVisualFor(cityName);
  const radius = size * 0.28;

  return (
    <div
      className={cx('grid shrink-0 place-items-center transition-all duration-200', className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${visual.gradient[0]}, ${visual.gradient[1]})`,
        border: selected ? '2px solid #6C63FF' : '1px solid rgba(255,255,255,0.22)',
        boxShadow: `0 2px 6px ${visual.gradient[1]}47`,
      }}
    >
      {visual.glyph === 'noria' ? (
        <NoriaGlyph size={size * 0.58} />
      ) : (
        <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>{visual.emoji}</span>
      )}
    </div>
  );
}
