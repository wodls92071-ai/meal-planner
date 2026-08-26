export function MealMascot({ size = 88 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M40 24c-2 6-3 10-3 14M60 20c0 7-1 11-2 16M80 24c2 6 3 10 3 14"
        stroke="var(--muted)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M14 54h92a46 46 0 0 1-46 46 46 46 0 0 1-46-46Z"
        fill="var(--accent)"
      />
      <path
        d="M14 54h92c0 4-2 7-6 7H20c-4 0-6-3-6-7Z"
        fill="var(--accent-hover)"
      />
      <circle cx="45" cy="72" r="4.5" fill="var(--accent-foreground)" />
      <circle cx="75" cy="72" r="4.5" fill="var(--accent-foreground)" />
      <circle cx="38" cy="82" r="5" fill="var(--accent-foreground)" opacity="0.25" />
      <circle cx="82" cy="82" r="5" fill="var(--accent-foreground)" opacity="0.25" />
      <path
        d="M52 86c3 3 13 3 16 0"
        stroke="var(--accent-foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
