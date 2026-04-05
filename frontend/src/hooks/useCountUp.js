import { useState, useEffect, useRef } from 'react';

// ============================================================
// useCountUp — Anime un nombre de 0 vers sa valeur cible
// Se déclenche quand l'élément entre dans le viewport
// Usage : const [count, ref] = useCountUp(42, 1000);
// ============================================================

export function useCountUp(target, duration = 1100) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const ref     = useRef(null);

  useEffect(() => {
    const numTarget = typeof target === 'number' ? target : parseInt(target, 10);
    if (!numTarget || isNaN(numTarget)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();

          const tick = (now) => {
            const elapsed  = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * numTarget));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}
