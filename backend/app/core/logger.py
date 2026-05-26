"""
Logger centralizado del proyecto SGED.
Escribe en consola y en archivo rotativo.
"""
import logging
import os
from logging.handlers import RotatingFileHandler


def _build_logger() -> logging.Logger:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_file  = os.getenv("LOG_FILE", "logs/sged.log")

    os.makedirs(os.path.dirname(log_file), exist_ok=True)

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)s %(name)s – %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    _logger = logging.getLogger("sged")
    _logger.setLevel(log_level)

    # Consola
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    _logger.addHandler(ch)

    # Archivo rotativo (5 MB × 3 archivos)
    fh = RotatingFileHandler(log_file, maxBytes=5_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    _logger.addHandler(fh)

    return _logger


logger = _build_logger()
