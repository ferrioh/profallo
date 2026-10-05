import type { SVGProps } from 'react'

export const ICON_PATHS: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M19 8a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21a8 8 0 0 1 16 0',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 18h2',
  dumbbell:
    'M3 9v6 M6 6.5v11 M18 6.5v11 M21 9v6 M6 12h12',
  body: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M8 9l-3 5 2 1 2-3v8 M16 9l3 5-2 1-2-3v8 M8 9c2-1 6-1 8 0 M9 20h6 M12 9v11',
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
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm6 15 6-6 6 6',
  download: 'M12 3v12 M6 10l6 6 6-6 M4 17v4h16v-4',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  heart: 'M12 21C-5 10 4-2 12 6c8-8 17 4 0 15',
  edit: 'm4 16 12-12 4 4L8 20H4z M14 6l4 4',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14 M2 6h14a2 2 0 0 1 2 2v14',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9 5.6A9 9 0 0 1 22 12c-.7 1.1-1.7 2.4-3.2 3.4 M6.1 6.7C3.6 8.1 2 12 2 12s4 6 10 6c1.2 0 2.3-.2 3.3-.5',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M8.6 13.5l6.8 3.5 M15.4 7l-6.8 3.5',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9 6.7 19.7l1.1-5.9L3.5 9.7l5.9-.8z',
  trash: 'M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  copy: 'M9 3h9v9 M6 9h9v12H6z M12 3v6',
  report: 'M5 3v18 M5 4h13l-2 4 2 4H5',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  whatsapp: 'M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3z M8.6 8.4c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.8 1.9c.1.3 0 .5-.1.7l-.6.7c-.2.2-.2.4 0 .7a7 7 0 0 0 2.8 2.5c.3.1.5.1.7-.1l.8-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.3.5.6 0 .9-.6 1.7-1.5 1.9-.6.1-1.3.2-3-.6a10 10 0 0 1-3.9-3.6c-.7-1.1-.9-2-.9-2.6 0-.9.5-1.5.7-1.7z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2 M17.2 6.6h.01',
  tiktok: 'M15 3.5c.5 2.5 2 4.1 4.2 4.4v3.2c-1.5 0-2.9-.5-4-1.3v6.1a5.4 5.4 0 1 1-5.4-5.4c.3 0 .7 0 1 .1v3.3a2.2 2.2 0 1 0 1.6 2.1V3.5z',
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
