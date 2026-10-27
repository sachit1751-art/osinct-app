interface DotGridBackgroundProps {
  className?: string
}

export function DotGridBackground({ className = '' }: DotGridBackgroundProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${className}`}
      aria-hidden="true"
    >
      {/* Deep obsidian base */}
      <div className="absolute inset-0 bg-[#070b14]" />

      {/* SVG Dot Matrix Pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="dot-grid-pattern"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="#60a5fa" />
          </pattern>
          <pattern
            id="subtle-squares-pattern"
            width="112"
            height="112"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 112 0 L 0 0 0 112"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.5"
              strokeOpacity="0.25"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid-pattern)" />
        <rect width="100%" height="100%" fill="url(#subtle-squares-pattern)" />
      </svg>

      {/* Central Cyber Vignette & Radial Glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle 800px at 50% 120px, rgba(37, 99, 235, 0.08), transparent 70%), radial-gradient(circle 1200px at 50% 50%, transparent 40%, #070b14 95%)',
        }}
      />

      {/* Top subtle blue horizon line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
    </div>
  )
}
