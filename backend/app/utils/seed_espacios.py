"""
Script de semilla: Crea espacios deportivos iniciales en MongoDB.
Ejecutar una sola vez:  python -m app.utils.seed_espacios
"""
import asyncio
from datetime import datetime, timezone

from app.db.mongodb import connect_db, close_db, get_db, Collections
from app.core.logger import logger

ESPACIOS = [
    {
        "nombre":          "Cancha Sintética Norte",
        "tipo":            "Cancha",
        "capacidad":       22,
        "estado":          "Disponible",
        "descripcion":     "Cancha de fútbol 11 con grama sintética, iluminada.",
        "ubicacion":       "Bloque Norte, UPTC Sogamoso",
        "horarioApertura": "06:00",
        "horarioCierre":   "22:00",
        "imagenUrl":       None,
    },
    {
        "nombre":          "Cancha Baloncesto Centro",
        "tipo":            "Cancha",
        "capacidad":       10,
        "estado":          "Disponible",
        "descripcion":     "Cancha de baloncesto techada con marcación oficial.",
        "ubicacion":       "Coliseo Central, UPTC Sogamoso",
        "horarioApertura": "07:00",
        "horarioCierre":   "21:00",
        "imagenUrl":       None,
    },
    {
        "nombre":          "Gimnasio Principal",
        "tipo":            "Gimnasio",
        "capacidad":       30,
        "estado":          "Disponible",
        "descripcion":     "Gimnasio equipado con máquinas cardiovasculares y de pesas.",
        "ubicacion":       "Edificio Bienestar, UPTC Sogamoso",
        "horarioApertura": "06:00",
        "horarioCierre":   "20:00",
        "imagenUrl":       None,
    },
    {
        "nombre":          "Pista Atletismo",
        "tipo":            "Pista",
        "capacidad":       50,
        "estado":          "Disponible",
        "descripcion":     "Pista de atletismo de 400 m, 6 carriles.",
        "ubicacion":       "Zona Sur, UPTC Sogamoso",
        "horarioApertura": "05:30",
        "horarioCierre":   "19:00",
        "imagenUrl":       None,
    },
    {
        "nombre":          "Cancha Voleibol",
        "tipo":            "Cancha",
        "capacidad":       12,
        "estado":          "Disponible",
        "descripcion":     "Cancha de voleibol con red oficial y piso de madera.",
        "ubicacion":       "Coliseo Central, UPTC Sogamoso",
        "horarioApertura": "07:00",
        "horarioCierre":   "21:00",
        "imagenUrl":       None,
    },
    {
        "nombre":          "Piscina Olímpica",
        "tipo":            "Piscina",
        "capacidad":       40,
        "estado":          "Mantenimiento",
        "descripcion":     "Piscina de 25 m con 6 carriles. Actualmente en mantenimiento.",
        "ubicacion":       "Bloque Oeste, UPTC Sogamoso",
        "horarioApertura": "06:00",
        "horarioCierre":   "18:00",
        "imagenUrl":       None,
    },
]


async def seed_espacios() -> None:
    await connect_db()
    db  = get_db()
    col = db[Collections.ESPACIOS_DEPORTIVOS]
    cnt = 0

    for esp in ESPACIOS:
        existing = await col.find_one({"nombre": esp["nombre"]})
        if not existing:
            esp["fechaCreacion"] = datetime.now(timezone.utc)
            await col.insert_one(esp)
            cnt += 1

    if cnt:
        logger.info("🏟️  %d espacio(s) deportivo(s) creados.", cnt)
    else:
        logger.info("✅ Espacios deportivos ya existen.")

    await close_db()


if __name__ == "__main__":
    asyncio.run(seed_espacios())
