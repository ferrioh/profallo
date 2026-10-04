import type { SVGProps } from 'react'

export const ICON_PATHS: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M19 8a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 18h2',
  dumbbell:
    'm6 6 12 12 M4 3 3 4l4 4 1-1z M3 7l-1 1 4 4 1-1 M16 16l1-1 4 4-1 1z M17 13l1-1 4 4-1 1',
  wallet: 'M3 5h16v4 M3 5v15h18V9H3 M16 12h5v5h-5z',
  chart: 'M3 3v18h18 M7 15l4-5 4 2 6-8',
  settings:
    'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M9 3h6l1 3 3 1 2 4-2 3v3l-4 3-3-1-3 1-4-3v-3l-2-3 2-4 3-1z',
  search: 'M15 15l6 6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8 M10 20h4',
  plus: 'M12 4v16 M4 12h16',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  up: 'M5 19 19 5 M5 5h14v14',
  close: 'm6 6 12 12 M6 18 18 6',
  check: 'm4 12 5 5L20 6',
  chevron: 'm9 5 7 7-7 7',
  download: 'M12 3v12 M6 10l6 6 6-6 M4 17v4h16v-4',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  heart: 'M12 21C-5 10 4-2 12 6c8-8 17 4 0 15',
  edit: 'm4 16 12-12 4 4L8 20H4z M14 6l4 4',
}

export type IconName = keyof typeof ICON_PATHS | string

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, className, ...rest }: IconProps) {
  const d = ICON_PATHS[name] || ICON_PATHS.arrow
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
