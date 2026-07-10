import { useEffect, useState } from 'react';

type TypewriterTextProps = {
  phrases: string[];
  className?: string;
  charDelay?: number;
  pauseAfterComplete?: number;
  deleteDelay?: number;
};

export function TypewriterText({
  phrases,
  className,
  charDelay = 55,
  pauseAfterComplete = 1800,
  deleteDelay = 28,
}: TypewriterTextProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);

  const phrase = phrases.length ? phrases[phraseIndex % phrases.length] : '';
  const visible = phrase.slice(0, charIndex);

  useEffect(() => {
    const blink = window.setInterval(() => setCursorOn((v) => !v), 520);
    return () => window.clearInterval(blink);
  }, []);

  useEffect(() => {
    if (!phrases.length) return undefined;

    let timer: number;
    if (!deleting && charIndex >= phrase.length) {
      timer = window.setTimeout(() => setDeleting(true), pauseAfterComplete);
    } else if (deleting && charIndex <= 0) {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    } else {
      timer = window.setTimeout(() => {
        setCharIndex((c) => c + (deleting ? -1 : 1));
      }, deleting ? deleteDelay : charDelay);
    }

    return () => window.clearTimeout(timer);
  }, [charDelay, charIndex, deleteDelay, deleting, pauseAfterComplete, phrase.length, phrases.length]);

  if (!phrases.length) return null;

  return (
    <span className={className}>
      {visible}
      <span
        className="ms-0.5 inline-block w-0.5 align-bottom transition-opacity duration-200"
        style={{
          height: '1.1em',
          background: 'currentColor',
          opacity: cursorOn ? 1 : 0.15,
        }}
      />
    </span>
  );
}
