import { translateStatus } from '../../i18n';
import { useUiStore } from '../../stores/useUiStore';
import { Badge } from './Badge';

export function StatusBadge({ value }: { value?: string | null }) {
  const locale = useUiStore((state) => state.locale);
  const normalizedValue = value || '-';
  const green = ['active', 'success', 'confirmed', 'completed', 'valid', 'available', 'issued', 'boarded'];
  const red = ['suspended', 'cancelled', 'failed', 'invalid', 'inactive'];
  const amber = ['pending', 'scheduled', 'locked', 'already_boarded'];
  const tone = green.includes(normalizedValue) ? 'green' : red.includes(normalizedValue) ? 'red' : amber.includes(normalizedValue) ? 'amber' : 'slate';

  return <Badge tone={tone as any}>{translateStatus(normalizedValue, locale)}</Badge>;
}
