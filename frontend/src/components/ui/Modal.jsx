import { X } from 'lucide-react'

// Modal genérico con cabecera, cuerpo y pie de acciones.
export default function Modal({ title, icon: Icon, onClose, children, footer }) {
  return (
    <div className="cm-modal-bg" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-modal-head">
          <h3>{Icon && <Icon size={18} />} {title}</h3>
          <button className="cm-modal-x" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="cm-modal-body">{children}</div>
        {footer && <div className="cm-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
