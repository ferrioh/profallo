/** Ícono de marca: la "p" en su cuadro verde (igual que el icono de la app). */
export function BrandIcon({ size = 34 }: { size?: number }) {
  return (
    <span
      className="brand-mark"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.94),
        lineHeight: `${size}px`,
        paddingLeft: Math.round(size * 0.18),
        borderRadius: Math.round(size * 0.28),
      }}
    >
      p
    </span>
  )
}

/** Pantalla de carga: fondo verde, logo negro con la "p" verde, barra abajo, todo centrado. */
export function EntryLoader({ out = false }: { out?: boolean }) {
  return (
    <div className={`entry-loader ${out ? 'out' : ''}`} aria-hidden="true">
      <span className="entry-loader-tile">p</span>
      <span className="entry-loader-line" />
    </div>
  )
}
