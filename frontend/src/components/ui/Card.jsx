// Tarjeta de contenido con título opcional.
export default function Card({ title, icon: Icon, actions, children, style }) {
  return (
    <section className="hb-card" style={style}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {title && (
            <h2 className="hb-card-title" style={{ margin: 0 }}>
              {Icon && <Icon size={18} />} {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
