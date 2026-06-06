interface SeatIconProps {
  className?: string;
}

/** Icon ghế nhỏ giống mockup tham chiếu */
export function SeatIcon({ className }: SeatIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        d="M6 9c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v1H6V9zm-1 3h14v5c0 .6-.4 1-1 1h-1v2h-2v-2H9v2H7v-2H6c-.6 0-1-.4-1-1v-5z"
        fill="currentColor"
      />
    </svg>
  );
}
