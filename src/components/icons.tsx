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

export function SearchTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </Svg>
  );
}

export function SparkleTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c.6 3 2.2 4.6 5.2 5.2-3 .6-4.6 2.2-5.2 5.2-.6-3-2.2-4.6-5.2-5.2 3-.6 4.6-2.2 5.2-5.2Z" />
      <path d="M18.5 15.5c.3 1.5 1.1 2.3 2.6 2.6-1.5.3-2.3 1.1-2.6 2.6-.3-1.5-1.1-2.3-2.6-2.6 1.5-.3 2.3-1.1 2.6-2.6Z" />
    </Svg>
  );
}

export function PlayTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9l5 3-5 3V9Z" />
    </Svg>
  );
}

export function LinkTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 14a4 4 0 0 0 5.7.3l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 10a4 4 0 0 0-5.7-.3L6 12a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </Svg>
  );
}

export function PencilTabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 4.5 19.5 9 8 20.5 3.5 21l.5-4.5L15 4.5Z" />
      <path d="M13 6.5 17.5 11" />
    </Svg>
  );
}
