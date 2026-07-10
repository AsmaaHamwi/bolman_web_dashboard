import { Bus } from 'lucide-react';
import { InfiniteMarquee } from './InfiniteMarquee';
import { TypewriterText } from './TypewriterText';

type HeroBannerProps = {
  title: string;
  phrases: string[];
  marqueeItems?: string[];
  className?: string;
};

export function HeroBanner({ title, phrases, marqueeItems = [], className }: HeroBannerProps) {
  return (
    <div
      className={`bolman-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-bolman-purple to-bolman-deep p-6 text-white shadow-glow ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute -end-4 -top-5 h-24 w-24 rounded-full bg-white/14 bolman-float" />
      <div className="pointer-events-none absolute -bottom-6 -start-4 h-20 w-20 rounded-full bg-white/10 bolman-float-delayed" />
      <div className="relative">
        <div className="mb-3 flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/16">
            <Bus size={22} />
          </div>
          <h1 className="text-2xl font-black leading-tight lg:text-3xl">{title}</h1>
        </div>
        <TypewriterText phrases={phrases} className="block min-h-[1.5rem] text-sm font-semibold text-white/92 lg:text-base" />
        {marqueeItems.length > 0 ? (
          <div className="mt-4">
            <InfiniteMarquee items={marqueeItems} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
