'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { animate, stagger, inView, isReducedMotion } from '@/lib/anime';

interface Props {
  children: ReactNode;
  itemSelector?: string;
  delay?: number;
  staggerMs?: number;
  distance?: number;
  duration?: number;
}

export default function ScrollSection({
  children,
  itemSelector,
  delay = 0,
  staggerMs = 50,
  distance = 18,
  duration = 500,
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current || isReducedMotion()) return;

    return inView(sectionRef.current, (el) => {
      const targets = itemSelector ? el.querySelectorAll(itemSelector) : [el];
      if (targets.length > 0) {
        animate(targets, {
          opacity: [0, 1],
          translateY: [distance, 0],
          delay: stagger(staggerMs, { start: delay }),
          duration,
          ease: 'outQuad',
        });
      }
    });
  }, [itemSelector, delay, staggerMs, distance, duration]);

  return (
    <div ref={sectionRef}>
      {children}
    </div>
  );
}
