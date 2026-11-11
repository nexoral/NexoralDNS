'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { animate, stagger, isReducedMotion } from '@/lib/anime';

interface Props {
  children: ReactNode;
}

export default function HeroContent({ children }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return;

    const items = containerRef.current.querySelectorAll('.hero-anim-item');
    const h1 = containerRef.current.querySelector('h1');

    if (items.length > 0) {
      animate(items, {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: stagger(80, { start: 250 }),
        duration: 750,
        ease: 'outExpo',
      });
    }

    if (h1) {
      animate(h1, {
        filter: ['blur(10px)', 'blur(0px)'],
        letterSpacing: ['0.02em', '-0.03em'],
        duration: 900,
        delay: 250,
        ease: 'outExpo',
      });
    }
  }, []);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}
