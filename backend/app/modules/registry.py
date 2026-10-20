"""Import every module's models so SQLAlchemy can resolve string-based relationships."""
import importlib
import pkgutil

import app.modules as _modules_pkg


def import_all_models() -> None:
    for mod in pkgutil.iter_modules(_modules_pkg.__path__):
        if not mod.ispkg:
            continue
        try:
            importlib.import_module(f"app.modules.{mod.name}.models")
        except ModuleNotFoundError as e:
            # Only skip modules that simply have no models.py; re-raise real errors
            if e.name != f"app.modules.{mod.name}.models":
                raise


import_all_models()