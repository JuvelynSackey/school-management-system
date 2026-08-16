import { useEffect, useRef } from 'react';

// Inline SVG (no external asset/animation library), reusing the same
// flat-shape character design language as the login page's character used
// to — same head/hair/glasses construction, just seated at a desk instead
// of at a door — so the landing page reads as the same product.
function Sparkle({ x, y, size = 6 }) {
  const d = `M0,-${size} L${size * 0.28},-${size * 0.28} L${size},0 L${size * 0.28},${size * 0.28} `
    + `L0,${size} L-${size * 0.28},${size * 0.28} L-${size},0 L-${size * 0.28},-${size * 0.28} Z`;
  return (
    <g className="hero-sparkle" transform={`translate(${x},${y})`}>
      <path d={d} fill="var(--landing-gold)" opacity="0.8" />
    </g>
  );
}

const LENS_LEFT = { cx: 162, cy: 143 };
const LENS_RIGHT = { cx: 180, cy: 143 };
const PUPIL_MAX_OFFSET = 3;

export default function HeroIllustration() {
  const svgRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);

  // Same technique as the login page's character: track mousemove anywhere
  // on the page, map it into this SVG's own viewBox units, and nudge the
  // pupils toward it by directly setting cx/cy (no re-render per mouse move).
  useEffect(() => {
    const movePupil = (ref, lens, pointerX, pointerY) => {
      const dx = pointerX - lens.cx;
      const dy = pointerY - lens.cy;
      const dist = Math.hypot(dx, dy) || 1;
      const offset = Math.min(PUPIL_MAX_OFFSET, dist / 12);
      ref.current?.setAttribute('cx', lens.cx + (dx / dist) * offset);
      ref.current?.setAttribute('cy', lens.cy + (dy / dist) * offset);
    };

    const handleMouseMove = (e) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const localX = ((e.clientX - rect.left) / rect.width) * 340;
      const localY = ((e.clientY - rect.top) / rect.height) * 300;
      movePupil(leftPupilRef, LENS_LEFT, localX, localY);
      movePupil(rightPupilRef, LENS_RIGHT, localX, localY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 340 300" width="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* soft glow */}
      <ellipse cx="190" cy="150" rx="140" ry="128" fill="var(--landing-gold)" opacity="0.12" />

      <Sparkle x="40" y="60" size="7" />
      <Sparkle x="300" y="90" size="5" />
      <Sparkle x="60" y="220" size="5" />

      {/* bean-bag style seat */}
      <path
        d="M85 265 C75 200 95 95 190 95 C285 95 305 200 295 265 Z"
        fill="var(--landing-gold)"
      />

      {/* desk */}
      <rect x="40" y="230" width="260" height="14" rx="5" fill="var(--landing-gold-dark)" />
      <rect x="60" y="244" width="10" height="36" rx="3" fill="var(--text-h)" />
      <rect x="270" y="244" width="10" height="36" rx="3" fill="var(--text-h)" />

      {/* character — gently bobs via the hero-float keyframe */}
      <g className="hero-figure">
        {/* torso */}
        <path
          d="M122 226 C120 194 132 175 170 175 C208 175 220 194 218 226 Z"
          fill="var(--surface)"
        />
        <rect x="160" y="175" width="20" height="12" rx="5" fill="var(--landing-bg)" />

        {/* arms resting on the keyboard */}
        <path d="M132 195 C124 205 120 212 122 220" stroke="var(--surface)" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M208 195 C216 205 220 212 218 220" stroke="var(--surface)" strokeWidth="14" strokeLinecap="round" fill="none" />
        <circle cx="150" cy="221" r="7" fill="var(--text-h)" />
        <circle cx="190" cy="221" r="7" fill="var(--text-h)" />
      </g>

      {/* laptop */}
      <rect x="150" y="214" width="70" height="9" rx="2.5" fill="var(--text-h)" />
      <rect x="153" y="163" width="60" height="52" rx="5" fill="var(--text-h)" />
      <rect x="157" y="167" width="52" height="42" rx="2" fill="var(--landing-bg)" />
      {/* little bar chart on screen */}
      <rect x="161" y="197" width="6" height="10" fill="var(--landing-gold)" />
      <rect x="169" y="189" width="6" height="18" fill="var(--landing-gold)" />
      <rect x="177" y="193" width="6" height="14" fill="var(--landing-gold)" />
      <rect x="185" y="185" width="6" height="22" fill="var(--landing-gold)" />

      {/* head — second hero-figure group, animates in sync with the torso */}
      <g className="hero-figure">
        <circle cx="170" cy="140" r="22" fill="var(--text-h)" />
        <circle cx="170" cy="142" r="17" fill="#f1c9a0" />
        {/* curly hair */}
        <circle cx="152" cy="126" r="9" fill="var(--text-h)" />
        <circle cx="162" cy="118" r="10" fill="var(--text-h)" />
        <circle cx="176" cy="116" r="10" fill="var(--text-h)" />
        <circle cx="188" cy="122" r="9" fill="var(--text-h)" />
        {/* glasses + pupils that track the cursor */}
        <circle cx={LENS_LEFT.cx} cy={LENS_LEFT.cy} r="7" fill="none" stroke="var(--text-h)" strokeWidth="2.5" />
        <circle cx={LENS_RIGHT.cx} cy={LENS_RIGHT.cy} r="7" fill="none" stroke="var(--text-h)" strokeWidth="2.5" />
        <line x1="169" y1="143" x2="173" y2="143" stroke="var(--text-h)" strokeWidth="2.5" />
        <circle ref={leftPupilRef} cx={LENS_LEFT.cx} cy={LENS_LEFT.cy} r="2.2" fill="var(--text-h)" />
        <circle ref={rightPupilRef} cx={LENS_RIGHT.cx} cy={LENS_RIGHT.cy} r="2.2" fill="var(--text-h)" />
        {/* smile */}
        <path d="M164 152 Q171 157 178 152" stroke="var(--text-h)" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
