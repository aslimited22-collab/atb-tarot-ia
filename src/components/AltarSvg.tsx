// Ilustração SVG inline do altar sagrado para a seção Limpeza Espiritual.
// Renderiza vela acesa, manto, pomba e raios sagrados.
// Pensado para ser leve (sem imagem externa) e responsivo.

export function AltarSvg({ size = 320 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 320 380"
      width={size}
      height={size * (380 / 320)}
      style={{ display: "block", margin: "0 auto", filter: "drop-shadow(0 0 30px rgba(232,184,75,0.35))" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8e1" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#e8b84b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e8b84b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flame" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#fff8e1" />
          <stop offset="40%" stopColor="#ffce5e" />
          <stop offset="80%" stopColor="#e8b84b" />
          <stop offset="100%" stopColor="#c87a18" />
        </radialGradient>
        <linearGradient id="candleBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff8e1" />
          <stop offset="50%" stopColor="#fbeec0" />
          <stop offset="100%" stopColor="#c9a96a" />
        </linearGradient>
        <linearGradient id="goldRay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff8e1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e8b84b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mantle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5a8fc7" />
          <stop offset="100%" stopColor="#264a82" />
        </linearGradient>
      </defs>

      {/* Halo sagrado de fundo */}
      <circle cx="160" cy="170" r="155" fill="url(#halo)" />

      {/* Raios de luz sagrada (8 raios do centro) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 160 170)`}>
          <path
            d="M 160 30 L 168 170 L 152 170 Z"
            fill="url(#goldRay)"
            opacity="0.5"
          />
        </g>
      ))}

      {/* Pomba (Espírito Santo) no topo */}
      <g transform="translate(160 60)">
        {/* Asas */}
        <path
          d="M -28 0 Q -45 -8 -50 -22 Q -35 -18 -22 -10 Z"
          fill="#fff"
          opacity="0.92"
        />
        <path
          d="M 28 0 Q 45 -8 50 -22 Q 35 -18 22 -10 Z"
          fill="#fff"
          opacity="0.92"
        />
        {/* Corpo */}
        <ellipse cx="0" cy="0" rx="14" ry="9" fill="#fff" />
        {/* Cabeça */}
        <circle cx="0" cy="-10" r="6" fill="#fff" />
        {/* Bico */}
        <path d="M 6 -10 L 12 -8 L 6 -7 Z" fill="#e8b84b" />
        {/* Cauda */}
        <path d="M -10 4 L -22 12 L -10 10 Z" fill="#fff" opacity="0.9" />
      </g>

      {/* Manto azul descendo */}
      <path
        d="M 110 200 Q 100 240 95 290 Q 100 320 130 330 L 190 330 Q 220 320 225 290 Q 220 240 210 200 Z"
        fill="url(#mantle)"
        opacity="0.85"
      />
      {/* Bordo dourado do manto */}
      <path
        d="M 110 200 Q 100 240 95 290 Q 100 320 130 330 L 190 330 Q 220 320 225 290 Q 220 240 210 200"
        stroke="#e8b84b"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Estrelas no manto */}
      {[
        [125, 230], [165, 245], [195, 235],
        [120, 280], [165, 295], [200, 280],
        [140, 315], [180, 320],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path
            d="M 0 -5 L 1.5 -1.5 L 5 -1.5 L 2.2 1 L 3 5 L 0 2.5 L -3 5 L -2.2 1 L -5 -1.5 L -1.5 -1.5 Z"
            fill="#e8b84b"
            opacity="0.85"
          />
        </g>
      ))}

      {/* Vela — corpo */}
      <rect
        x="148"
        y="180"
        width="24"
        height="80"
        rx="4"
        fill="url(#candleBody)"
        stroke="#a08550"
        strokeWidth="0.8"
      />
      {/* Pavio */}
      <rect x="158" y="170" width="4" height="12" fill="#3a2818" />

      {/* Chama */}
      <ellipse cx="160" cy="158" rx="11" ry="22" fill="url(#flame)" />
      <ellipse cx="160" cy="155" rx="6" ry="14" fill="#fff8e1" opacity="0.85" />

      {/* Glow ao redor da chama */}
      <circle cx="160" cy="158" r="35" fill="#e8b84b" opacity="0.18" />
      <circle cx="160" cy="158" r="24" fill="#fbeec0" opacity="0.25" />

      {/* Rosa branca à esquerda */}
      <g transform="translate(105 270)">
        <circle cx="0" cy="0" r="10" fill="#fbeec0" />
        <circle cx="-3" cy="-2" r="6" fill="#fff" opacity="0.9" />
        <circle cx="3" cy="-1" r="5" fill="#fff" opacity="0.85" />
        <circle cx="0" cy="3" r="5" fill="#f9e8c0" />
        {/* Caule */}
        <path d="M 0 8 Q -3 18 0 28 Q 3 35 6 38" stroke="#5a7a3a" strokeWidth="1.8" fill="none" />
        {/* Folha */}
        <ellipse cx="-4" cy="20" rx="4" ry="2" fill="#5a7a3a" transform="rotate(-30 -4 20)" />
      </g>

      {/* Rosário à direita */}
      <g transform="translate(215 280)">
        <path
          d="M 0 0 Q 10 5 15 15 Q 18 30 12 42 Q 5 50 -2 45"
          stroke="#a08550"
          strokeWidth="1.2"
          fill="none"
        />
        {[
          [4, 6], [8, 12], [12, 19], [15, 27], [13, 35], [8, 42], [3, 45],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="#fbeec0" stroke="#a08550" strokeWidth="0.5" />
        ))}
        {/* Cruz */}
        <g transform="translate(0 47)">
          <rect x="-1" y="-3" width="2" height="9" fill="#e8b84b" />
          <rect x="-3" y="-1" width="6" height="2" fill="#e8b84b" />
        </g>
      </g>

      {/* Ornamentos cantos */}
      <g opacity="0.6">
        <path d="M 20 20 L 50 20 M 20 20 L 20 50" stroke="#e8b84b" strokeWidth="1.5" />
        <path d="M 300 20 L 270 20 M 300 20 L 300 50" stroke="#e8b84b" strokeWidth="1.5" />
        <path d="M 20 360 L 50 360 M 20 360 L 20 330" stroke="#e8b84b" strokeWidth="1.5" />
        <path d="M 300 360 L 270 360 M 300 360 L 300 330" stroke="#e8b84b" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
