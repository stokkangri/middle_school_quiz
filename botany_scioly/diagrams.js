/* Original practice diagrams for Botany B. Letters match the label questions. */
window.DIAGRAMS = {
  flower: `
<svg viewBox="0 0 500 520" role="img" aria-label="Flower cutaway with letters A through E">
  <title>Flower cutaway</title>
  <rect x="0" y="0" width="500" height="520" fill="#f7fbf7"/>
  <text x="230" y="28" text-anchor="middle" font-size="16" font-family="Segoe UI, sans-serif" fill="#1b4332">Flower (cutaway)</text>
  <ellipse cx="150" cy="430" rx="70" ry="22" fill="#74c69d" stroke="#1b4332" stroke-width="2" transform="rotate(-18 150 430)"/>
  <ellipse cx="310" cy="430" rx="70" ry="22" fill="#95d5b2" stroke="#1b4332" stroke-width="2" transform="rotate(18 310 430)"/>
  <ellipse cx="78" cy="300" rx="62" ry="34" fill="#f7b2c4" stroke="#9b3d55" stroke-width="2" transform="rotate(-30 78 300)"/>
  <ellipse cx="382" cy="300" rx="62" ry="34" fill="#f7b2c4" stroke="#9b3d55" stroke-width="2" transform="rotate(30 382 300)"/>
  <ellipse cx="230" cy="168" rx="42" ry="62" fill="#f4a3b8" stroke="#9b3d55" stroke-width="2"/>
  <line x1="168" y1="360" x2="118" y2="214" stroke="#2d6a4f" stroke-width="3"/>
  <line x1="292" y1="360" x2="342" y2="214" stroke="#2d6a4f" stroke-width="3"/>
  <ellipse cx="112" cy="198" rx="16" ry="24" fill="#e9c46a" stroke="#7a5b16" stroke-width="2"/>
  <ellipse cx="348" cy="198" rx="16" ry="24" fill="#e9c46a" stroke="#7a5b16" stroke-width="2"/>
  <ellipse cx="230" cy="390" rx="40" ry="34" fill="#f3d5a0" stroke="#6b4f2a" stroke-width="2"/>
  <rect x="220" y="250" width="20" height="112" rx="8" fill="#c4e0b0" stroke="#2d6a4f" stroke-width="2"/>
  <ellipse cx="230" cy="236" rx="30" ry="14" fill="#e07a5f" stroke="#9b3d2f" stroke-width="2"/>
  <line x1="78" y1="300" x2="36" y2="250" stroke="#1b4332" stroke-width="1.5"/>
  <line x1="150" y1="448" x2="70" y2="488" stroke="#1b4332" stroke-width="1.5"/>
  <line x1="112" y1="198" x2="48" y2="150" stroke="#1b4332" stroke-width="1.5"/>
  <polyline points="262,242 312,242 312,108" fill="none" stroke="#1b4332" stroke-width="1.5"/>
  <line x1="270" y1="390" x2="400" y2="360" stroke="#1b4332" stroke-width="1.5"/>
  <g font-family="Segoe UI, sans-serif" font-size="16" font-weight="700" fill="#fff">
    <circle cx="36" cy="250" r="14" fill="#1b4332"/><text x="36" y="255" text-anchor="middle">A</text>
    <circle cx="70" cy="488" r="14" fill="#1b4332"/><text x="70" y="493" text-anchor="middle">B</text>
    <circle cx="48" cy="150" r="14" fill="#1b4332"/><text x="48" y="155" text-anchor="middle">C</text>
    <circle cx="312" cy="94" r="14" fill="#1b4332"/><text x="312" y="99" text-anchor="middle">D</text>
    <circle cx="400" cy="360" r="14" fill="#1b4332"/><text x="400" y="365" text-anchor="middle">E</text>
  </g>
</svg>`,

  seed: `
<svg viewBox="0 0 460 320" role="img" aria-label="Opened bean seed with letters A through D">
  <title>Bean seed</title>
  <rect width="460" height="320" fill="#f7fbf7"/>
  <text x="230" y="28" text-anchor="middle" font-size="16" font-family="Segoe UI, sans-serif" fill="#1b4332">Bean seed, opened</text>
  <path d="M70 160 C70 70 200 48 250 90 C310 40 400 90 390 170 C400 250 300 290 230 250 C160 300 70 250 70 160 Z" fill="#f6e7c1" stroke="#6b4f2a" stroke-width="3"/>
  <path d="M150 150 C180 80 250 80 270 150 C250 230 180 230 150 150 Z" fill="#f3d48a" stroke="#8a6a2f" stroke-width="2"/>
  <path d="M168 168 C150 210 150 230 176 248" fill="none" stroke="#2d6a4f" stroke-width="4" stroke-linecap="round"/>
  <path d="M176 150 C190 120 210 118 214 140" fill="none" stroke="#2d6a4f" stroke-width="4" stroke-linecap="round"/>
  <circle cx="176" cy="150" r="5" fill="#1b4332"/>
  <line x1="70" y1="120" x2="28" y2="78" stroke="#1b4332"/>
  <line x1="230" y1="100" x2="300" y2="64" stroke="#1b4332"/>
  <line x1="150" y1="220" x2="86" y2="270" stroke="#1b4332"/>
  <line x1="210" y1="130" x2="360" y2="120" stroke="#1b4332"/>
  <g font-family="Segoe UI, sans-serif" font-size="16" font-weight="700" fill="#fff">
    <circle cx="28" cy="78" r="14" fill="#1b4332"/><text x="28" y="83" text-anchor="middle">A</text>
    <circle cx="300" cy="64" r="14" fill="#1b4332"/><text x="300" y="69" text-anchor="middle">B</text>
    <circle cx="86" cy="270" r="14" fill="#1b4332"/><text x="86" y="275" text-anchor="middle">C</text>
    <circle cx="360" cy="120" r="14" fill="#1b4332"/><text x="360" y="125" text-anchor="middle">D</text>
  </g>
</svg>`,

  root_tip: `
<svg viewBox="0 0 360 520" role="img" aria-label="Root tip with letters A through D">
  <title>Root tip</title>
  <rect width="360" height="520" fill="#f7fbf7"/>
  <text x="180" y="28" text-anchor="middle" font-size="16" font-family="Segoe UI, sans-serif" fill="#1b4332">Root tip</text>
  <path d="M130 40 H230 V360 Q230 430 180 450 Q130 430 130 360 Z" fill="#f3e6c8" stroke="#6b4f2a" stroke-width="2"/>
  <path d="M142 360 Q180 470 218 360 Q180 400 142 360 Z" fill="#e7c98a" stroke="#6b4f2a" stroke-width="2"/>
  <g stroke="#8a6a2f" fill="none">
    <path d="M150 80 Q110 70 90 40"/><path d="M150 110 Q100 120 70 100"/><path d="M210 80 Q250 60 280 40"/><path d="M210 120 Q270 130 300 110"/>
  </g>
  <g fill="#d9b36a" stroke="#6b4f2a">
    <rect x="148" y="300" width="18" height="16"/><rect x="170" y="300" width="18" height="16"/><rect x="192" y="300" width="18" height="16"/>
    <rect x="148" y="320" width="18" height="16"/><rect x="170" y="320" width="18" height="16"/><rect x="192" y="320" width="18" height="16"/>
    <rect x="156" y="340" width="18" height="16"/><rect x="178" y="340" width="18" height="16"/>
  </g>
  <g fill="none" stroke="#8a6a2f">
    <rect x="150" y="180" width="22" height="40"/><rect x="176" y="170" width="22" height="50"/><rect x="202" y="180" width="22" height="40"/>
    <rect x="150" y="230" width="22" height="40"/><rect x="176" y="224" width="22" height="46"/><rect x="202" y="230" width="22" height="40"/>
  </g>
  <line x1="180" y1="450" x2="300" y2="490" stroke="#1b4332"/>
  <line x1="180" y1="330" x2="40" y2="340" stroke="#1b4332"/>
  <line x1="176" y1="210" x2="40" y2="210" stroke="#1b4332"/>
  <line x1="300" y1="70" x2="250" y2="80" stroke="#1b4332"/>
  <g font-family="Segoe UI, sans-serif" font-size="16" font-weight="700" fill="#fff">
    <circle cx="300" cy="490" r="14" fill="#1b4332"/><text x="300" y="495" text-anchor="middle">A</text>
    <circle cx="40" cy="340" r="14" fill="#1b4332"/><text x="40" y="345" text-anchor="middle">B</text>
    <circle cx="40" cy="210" r="14" fill="#1b4332"/><text x="40" y="215" text-anchor="middle">C</text>
    <circle cx="300" cy="70" r="14" fill="#1b4332"/><text x="300" y="75" text-anchor="middle">D</text>
  </g>
</svg>`,

  leaf: `
<svg viewBox="0 0 540 380" role="img" aria-label="Leaf cross section with letters A through E">
  <title>Leaf cross section</title>
  <rect width="540" height="380" fill="#f7fbf7"/>
  <text x="150" y="28" text-anchor="middle" font-size="16" font-family="Segoe UI, sans-serif" fill="#1b4332">Leaf cross section</text>
  <rect x="50" y="58" width="440" height="250" rx="16" fill="#e9f5ec" stroke="#1b4332" stroke-width="2"/>
  <rect x="50" y="50" width="440" height="10" rx="4" fill="#6b4f2a"/>
  <rect x="58" y="64" width="424" height="28" fill="#c5e6cf" stroke="#2d6a4f"/>
  <g fill="#2d6a4f">
    <rect x="70" y="100" width="28" height="78" rx="6"/>
    <rect x="108" y="100" width="28" height="78" rx="6"/>
    <rect x="146" y="100" width="28" height="78" rx="6"/>
    <rect x="184" y="100" width="28" height="78" rx="6"/>
    <rect x="330" y="100" width="28" height="78" rx="6"/>
    <rect x="368" y="100" width="28" height="78" rx="6"/>
    <rect x="406" y="100" width="28" height="78" rx="6"/>
    <rect x="444" y="100" width="28" height="78" rx="6"/>
  </g>
  <g fill="#95d5b2" stroke="#1b4332">
    <circle cx="120" cy="210" r="16"/><circle cx="150" cy="228" r="14"/><circle cx="100" cy="232" r="12"/>
    <circle cx="400" cy="210" r="16"/><circle cx="430" cy="230" r="13"/><circle cx="380" cy="234" r="12"/>
  </g>
  <circle cx="270" cy="214" r="32" fill="#f3d5a0" stroke="#6b4f2a" stroke-width="2"/>
  <circle cx="260" cy="208" r="6" fill="#c45c26"/>
  <circle cx="278" cy="220" r="5" fill="#1d4e89"/>
  <circle cx="268" cy="226" r="4" fill="#c45c26"/>
  <rect x="58" y="268" width="180" height="26" fill="#d8f3dc" stroke="#2d6a4f"/>
  <rect x="300" y="268" width="182" height="26" fill="#d8f3dc" stroke="#2d6a4f"/>
  <ellipse cx="250" cy="286" rx="10" ry="14" fill="#74c69d" stroke="#1b4332"/>
  <ellipse cx="292" cy="286" rx="10" ry="14" fill="#74c69d" stroke="#1b4332"/>
  <line x1="270" y1="50" x2="270" y2="28" stroke="#1b4332"/>
  <line x1="120" y1="140" x2="70" y2="120" stroke="#1b4332"/>
  <line x1="150" y1="228" x2="40" y2="240" stroke="#1b4332"/>
  <line x1="292" y1="300" x2="360" y2="340" stroke="#1b4332"/>
  <line x1="302" y1="214" x2="470" y2="180" stroke="#1b4332"/>
  <g font-family="Segoe UI, sans-serif" font-size="16" font-weight="700" fill="#fff">
    <circle cx="270" cy="22" r="14" fill="#1b4332"/><text x="270" y="27" text-anchor="middle">A</text>
    <circle cx="70" cy="120" r="14" fill="#1b4332"/><text x="70" y="125" text-anchor="middle">B</text>
    <circle cx="40" cy="240" r="14" fill="#1b4332"/><text x="40" y="245" text-anchor="middle">C</text>
    <circle cx="360" cy="340" r="14" fill="#1b4332"/><text x="360" y="345" text-anchor="middle">D</text>
    <circle cx="470" cy="180" r="14" fill="#1b4332"/><text x="470" y="185" text-anchor="middle">E</text>
  </g>
</svg>`
};
