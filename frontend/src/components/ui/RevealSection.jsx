import { useEffect, useRef } from 'react';

// ============================================================
// RevealSection — Fade-in au scroll (IntersectionObserver)
// Usage :
//   <RevealSection>contenu</RevealSection>
//   <RevealSection direction="left" delay={200}>contenu</RevealSection>
// ============================================================

export default function RevealSection({ children, direction = 'up', delay = 0, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add('visible'), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const revealClass = direction === 'left' ? 'reveal-left' : 'reveal';

  return (
    <div ref={ref} className={`${revealClass} ${className}`}>
      {children}
    </div>
  );
}
