/**
 * Icon set (Stage 02) — one consistent inline-SVG set, stroke style,
 * 24×24, currentColor. Open composition, drawn for this project.
 * Spec §2: inline SVG only, no emoji in UI chrome.
 */
type IconProps = { className?: string }

function base(path: React.ReactNode) {
  return function Icon({ className = 'h-5 w-5' }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        {path}
      </svg>
    )
  }
}

export const SearchIcon = base(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </>,
)
export const MenuIcon = base(
  <>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </>,
)
export const CloseIcon = base(
  <>
    <path d="M6 6l12 12M18 6L6 18" />
  </>,
)
export const ChevronDownIcon = base(<path d="m6 9 6 6 6-6" />)
export const ArrowRightIcon = base(
  <>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </>,
)
export const CheckIcon = base(<path d="m4.5 12.5 5 5 10-11" />)
export const ShieldIcon = base(
  <>
    <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6z" />
    <path d="m9 12 2 2 4-4.5" />
  </>,
)
export const ScaleIcon = base(
  <>
    <path d="M12 4v16m-6 0h12M12 4L6 6m6-2 6 2" />
    <path d="M3.5 13 6 6l2.5 7a3.2 3.2 0 0 1-5 0Zm12 0L18 6l2.5 7a3.2 3.2 0 0 1-5 0Z" />
  </>,
)
export const GiftIcon = base(
  <>
    <rect x="4" y="10" width="16" height="4" />
    <path d="M6 14v7h12v-7M12 10v11M12 10s-4.5.3-6-1.2C4.6 7.4 6 4.8 8.2 5.2 10.3 5.6 12 10 12 10Zm0 0s4.5.3 6-1.2c1.4-1.4.1-4-2.1-3.6C13.7 5.6 12 10 12 10Z" />
  </>,
)
export const CompassIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </>,
)
export const BookIcon = base(
  <>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
    <path d="M5 19.5V4.5M19 18H6.5" />
  </>,
)
export const DeskIcon = base(
  <>
    <rect x="3" y="4.5" width="13" height="9" rx="1" />
    <path d="M9.5 17.5h3m-1.5-4v4M3 20h18M18.5 8h2v6h-2" />
  </>,
)
export const PlugIcon = base(
  <>
    <path d="M9 3.5v5m6-5v5M6.5 8.5h11V12a5.5 5.5 0 0 1-11 0zM12 17.5V21" />
  </>,
)
export const SlidersIcon = base(
  <>
    <path d="M5 7h6m4 0h4M5 17h10m4 0h0M7 12h13" />
    <circle cx="13" cy="7" r="2" />
    <circle cx="17" cy="17" r="2" />
    <circle cx="5" cy="12" r="2" />
  </>,
)
export const AlertIcon = base(
  <>
    <path d="M12 4 2.8 20h18.4z" />
    <path d="M12 10v4.5m0 2.5v.5" />
  </>,
)
export const InfoIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5m0-8.5v.5" />
  </>,
)
export const ListCheckIcon = base(
  <>
    <path d="m3.5 6 1.2 1.2L7 5m-3.5 7 1.2 1.2L7 11m-3.5 7 1.2 1.2L7 17M11 6h9.5M11 12h9.5M11 18h9.5" />
  </>,
)
export const RefreshIcon = base(
  <>
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4" />
  </>,
)
