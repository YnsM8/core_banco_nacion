// Encabezado estándar de página: título, subtítulo y acciones a la derecha.
export default function PageHead({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="cm-page-head">
      <div>
        <h1 className="cm-page-title">{Icon && <Icon size={24} />} {title}</h1>
        {subtitle && <p className="cm-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="cm-page-actions">{actions}</div>}
    </div>
  )
}
