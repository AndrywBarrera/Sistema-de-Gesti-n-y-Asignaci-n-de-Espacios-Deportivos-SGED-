"""
Servicio de imágenes – Cloudinary.
Sube, obtiene URL optimizada y elimina imágenes de espacios deportivos.
"""
import io
from typing import Optional

import cloudinary
import cloudinary.uploader
import cloudinary.api

from app.core.config import settings
from app.core.logger import logger


def _configure() -> None:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def subir_imagen_espacio(
    file_bytes: bytes,
    filename:   str,
    espacio_id: str,
) -> Optional[str]:
    """
    Sube una imagen a Cloudinary y retorna la URL segura.
    Retorna None si no hay credenciales configuradas.
    """
    if not all([settings.CLOUDINARY_CLOUD_NAME,
                settings.CLOUDINARY_API_KEY,
                settings.CLOUDINARY_API_SECRET]):
        logger.warning("⚠️  Cloudinary no configurado. La imagen no se subió.")
        return None

    _configure()
    public_id = f"{settings.CLOUDINARY_FOLDER}/{espacio_id}"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            folder=settings.CLOUDINARY_FOLDER,
            transformation=[
                {"width": 800, "height": 600, "crop": "fill"},
                {"quality": "auto"},
                {"fetch_format": "auto"},
            ],
        )
        url = result.get("secure_url")
        logger.info("🖼️  Imagen subida a Cloudinary: %s", url)
        return url
    except Exception as exc:
        logger.error("❌ Error subiendo imagen a Cloudinary: %s", exc)
        return None


async def eliminar_imagen_espacio(espacio_id: str) -> bool:
    """Elimina la imagen de un espacio de Cloudinary."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        return False

    _configure()
    public_id = f"{settings.CLOUDINARY_FOLDER}/{espacio_id}"
    try:
        cloudinary.uploader.destroy(public_id)
        logger.info("🗑️  Imagen eliminada de Cloudinary: %s", public_id)
        return True
    except Exception as exc:
        logger.error("❌ Error eliminando imagen de Cloudinary: %s", exc)
        return False
