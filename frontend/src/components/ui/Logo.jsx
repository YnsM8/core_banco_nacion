/**
 * Logo institucional del Banco de la Nacion.
 * Usa una variante SVG derivada de assets/images/logo_banco.svg.
 */
export default function Logo({
  size = 44,
  wordmark = true,
  variant = 'dark',
  subtitle = 'CORE FINANCIERO',
}) {
  const subColor = variant === 'light' ? 'rgba(255,255,255,.86)' : '#6b6b7b'
  const subSize = Math.max(9, Math.round(size * 0.23))
  const logoWidth = wordmark ? Math.round(size * 4.6) : size

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: logoWidth,
          height: size,
          padding: wordmark ? '3px 8px' : 0,
          borderRadius: 8,
          background: '#ffffff',
          boxShadow: variant === 'light' ? '0 8px 18px rgba(0,0,0,.12)' : 'none',
          overflow: 'hidden',
        }}
      >
        <img
          src="/logo_banco_horizontal.svg"
          alt="Banco de la Nacion"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </span>

      {wordmark && subtitle && (
        <span
          style={{
            fontSize: subSize,
            fontWeight: 700,
            color: subColor,
            letterSpacing: 0,
            lineHeight: 1.05,
            textTransform: 'uppercase',
          }}
        >
          {subtitle}
        </span>
      )}
    </span>
  )
}
