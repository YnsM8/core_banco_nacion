"""
Seed de datos demo para bd_core_mobile.
Crea: 1 agencia, 1 administrador core (COREADMIN / CoreBN2026!),
1 asesor de ventas (G-1029 / admin123), 5 clientes y su cartera del dia.

Uso (desde la raiz del proyecto, con venv activo):
    python -m scripts.seed_bd_core_mobile
"""
import sys, os, uuid
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core_bn.cfg_database import SessionLocal
from app.core_bn.cfg_security import hash_password
from app.models.mdl_asesores import Agencia, Asesor
from app.models.mdl_clientes import Cliente
from app.models.mdl_cartera import CarteraDiaria

def run():
    db = SessionLocal()
    try:
        agencia = db.query(Agencia).filter(Agencia.cod_agencia == "0001").first()
        if not agencia:
            agencia = Agencia(cod_agencia="0001", nombre="Agencia Central", region="Lima")
            db.add(agencia)
            db.flush()

        if not db.query(Asesor).filter(Asesor.codigo_empleado == "COREADMIN").first():
            db.add(Asesor(
                cod_asesor="CORE-ADM",
                codigo_empleado="COREADMIN",
                nombres="Administrador",
                apellidos="Core BN",
                agencia_id=agencia.id,
                perfil="administrador",
                password_hash=hash_password("CoreBN2026!"),
            ))
            db.flush()

        asesor = db.query(Asesor).filter(Asesor.codigo_empleado == "G-1029").first()
        if asesor:
            print("Seed base ya aplicado. Login core: codigo_empleado=COREADMIN  password=CoreBN2026!")
            db.commit()
            return

        asesor = Asesor(
            cod_asesor="FV-1029",
            codigo_empleado="G-1029",
            nombres="Gestor",
            apellidos="Credito BN",
            agencia_id=agencia.id,
            perfil="asesor",
            password_hash=hash_password("admin123"),
        )
        db.add(asesor)
        db.flush()

        demo = [
            ("Maria Quispe Huaman",  "44455667", "RECUPERACION_MORA", "alta",   88, 8500),
            ("Jose Mamani Flores",   "41112233", "RENOVACION",        "alta",   72, 12000),
            ("Rosa Condori Apaza",   "42778899", "AMPLIACION",        "media",  55, 5000),
            ("Pedro Ccahua Ramos",   "43223344", "NUEVA_SOLICITUD",   "normal", 30, 3000),
            ("Lucia Vargas Soto",    "40556677", "SEGUIMIENTO",       "normal", 15, 4500),
        ]
        hoy = date.today()
        for i, (nombre, doc, tipo, prio, score, monto) in enumerate(demo):
            nombres, apellidos = nombre.split(" ", 1)
            cli = Cliente(
                numero_documento=doc,
                nombres=nombres,
                apellidos=apellidos,
                telefono="9" + doc,
            )
            db.add(cli)
            db.flush()
            db.add(CarteraDiaria(
                asesor_id=asesor.id,
                cliente_id=cli.id,
                agencia_id=agencia.id,
                fecha_asignacion=hoy,
                tipo_gestion=tipo,
                prioridad=prio,
                score_prioridad=score,
                monto_credito=monto,
                estado_visita="pendiente",
                orden_manual=i,
            ))

        db.commit()
        print("Seed OK. Login core: codigo_empleado=COREADMIN  password=CoreBN2026!")
    finally:
        db.close()

if __name__ == "__main__":
    run()
