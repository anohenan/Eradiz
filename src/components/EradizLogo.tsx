interface EradizLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}

export function EradizLogo({
  size = 28,
  showWordmark = false,
  wordmarkClassName = "font-display text-lg md:text-xl font-extrabold tracking-tight text-slate-900",
  className = "",
}: EradizLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient
            id="eradiz-logo-bg"
            x1="4"
            y1="2"
            x2="60"
            y2="62"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>
          <linearGradient
            id="eradiz-logo-beam"
            x1="14"
            y1="50"
            x2="51"
            y2="13"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#4338CA" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="15" fill="url(#eradiz-logo-bg)" />
        <rect
          x="1.75"
          y="1.75"
          width="60.5"
          height="60.5"
          rx="13.5"
          stroke="#6366F1"
          strokeOpacity="0.32"
          strokeWidth="1.25"
        />
        {/* Monogramme E géométrique découpé */}
        <path
          d="M19.25 16H44.75V23H27.75V28.25H41.75V34.25H35.25L19.25 44.75V16Z"
          fill="#FFFFFF"
        />
        <path
          d="M19.25 48.5L30.5 41H44.75V48H19.25V48.5Z"
          fill="#FFFFFF"
        />
        {/* Encoche studio d'angle */}
        <path d="M40.75 48L44.75 44V48H40.75Z" fill="#0F172A" />
        {/* Faisceau diagonal Eradiz Indigo */}
        <path
          d="M13 52L49.75 13L51.5 14.75L18.75 48.5L13 52Z"
          fill="url(#eradiz-logo-beam)"
        />
      </svg>
      {showWordmark && (
        <span className={`whitespace-nowrap ${wordmarkClassName}`}>Eradiz</span>
      )}
    </span>
  );
}
