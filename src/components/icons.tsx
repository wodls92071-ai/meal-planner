type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function Svg({
  size = 22,
  strokeWidth = 1.6,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function CalendarTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1v-9" />
    </Svg>
  );
}

export function RecipeTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8Z" />
      <path d="M9 11V6M12 11V5M15 11V6" />
    </Svg>
  );
}

export function ChatTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v6A2.5 2.5 0 0 1 18.5 15H9l-4.5 4.5V15A2.5 2.5 0 0 1 3 12.5v-6Z" />
    </Svg>
  );
}

export function CartTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8h12l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function ProfileTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}
