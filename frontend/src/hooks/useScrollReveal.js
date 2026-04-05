import { useEffect, useRef } from 'react';

// ============================================================
// useScrollReveal — Révèle un élément quand il entre dans le viewport
// Usage : const ref = useScrollReveal(); → <div ref={ref} className="reveal">
// ============================================================

export function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px', ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

// Révèle plusieurs éléments enfants en cascade (stagger)
export function useScrollRevealGroup(count, options = {}) {
  const refs = Array.from({ length: count }, () => useRef(null));

  useEffect(() => {
    refs.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('visible'), i * 100);
            observer.unobserve(el);
          }
        },
        { threshold: 0.1, ...options }
      );
      observer.observe(el);
    });
  }, []);

  return refs;
}
