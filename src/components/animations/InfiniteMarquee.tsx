type InfiniteMarqueeProps = {
  items: string[];
  className?: string;
};

export function InfiniteMarquee({ items, className }: InfiniteMarqueeProps) {
  if (!items.length) return null;

  const track = items.join('  ·  ');

  return (
    <div className={className ?? 'overflow-hidden rounded-full bg-black/10 px-3 py-1.5'}>
      <div className="bolman-marquee flex w-max gap-8 whitespace-nowrap text-sm font-bold text-white/90">
        <span>{track}</span>
        <span aria-hidden>{track}</span>
      </div>
    </div>
  );
}
