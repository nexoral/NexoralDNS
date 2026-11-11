'use client';

import { animate, createTimeline, stagger } from 'animejs';

export { animate, createTimeline, stagger };

/**
 * Returns true if code is running in a browser environment.
 */
export const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Checks if the user prefers reduced motion (accessibility requirement).
 */
export const isReducedMotion = (): boolean => {
  if (!isBrowser()) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Animate elements into view when they intersect the viewport.
 * Uses progressive enhancement: if reduced motion is requested, instantly reveals elements.
 */
export function inView(
  target: HTMLElement | string,
  onEnter: (el: HTMLElement) => void,
  options?: { threshold?: number; rootMargin?: string; once?: boolean }
): () => void {
  if (!isBrowser()) return () => {};

  const threshold = options?.threshold ?? 0.15;
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px';
  const once = options?.once ?? true;

  const elements: HTMLElement[] =
    typeof target === 'string'
      ? Array.from(document.querySelectorAll(target))
      : [target];

  if (elements.length === 0) return () => {};

  if (isReducedMotion()) {
    elements.forEach((el) => onEnter(el));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onEnter(entry.target as HTMLElement);
          if (once) {
            observer.unobserve(entry.target);
          }
        }
      });
    },
    { threshold, rootMargin }
  );

  elements.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}

/**
 * Smoothly cascades multiple elements with a staggered slide-up and fade-in.
 */
export function staggerReveal(
  targets: HTMLElement[] | string,
  options?: {
    delay?: number;
    staggerMs?: number;
    distance?: number;
    duration?: number;
  }
) {
  if (!isBrowser()) return;

  if (isReducedMotion()) {
    return;
  }

  const delay = options?.delay ?? 0;
  const staggerMs = options?.staggerMs ?? 60;
  const distance = options?.distance ?? 18;
  const duration = options?.duration ?? 550;

  try {
    animate(targets, {
      opacity: [0, 1],
      translateY: [distance, 0],
      duration,
      delay: stagger(staggerMs, { start: delay }),
      ease: 'outQuad',
    });
  } catch (err) {
    // Fail silently in case of invalid target
    console.debug('staggerReveal warning:', err);
  }
}

/**
 * Animates a numeric counter up to its target value.
 */
export function animateCounter(
  element: HTMLElement,
  endValue: number,
  options?: {
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  }
) {
  if (!isBrowser() || !element) return;

  const duration = options?.duration ?? 1200;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  const decimals = options?.decimals ?? 0;

  if (isReducedMotion()) {
    element.textContent = `${prefix}${endValue.toLocaleString()}${suffix}`;
    return;
  }

  const state = { count: 0 };
  animate(state, {
    count: endValue,
    duration,
    ease: 'outQuad',
    onUpdate: () => {
      const formatted =
        decimals > 0
          ? state.count.toFixed(decimals)
          : Math.round(state.count).toLocaleString();
      element.textContent = `${prefix}${formatted}${suffix}`;
    },
  });
}
