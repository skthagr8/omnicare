"""Single place that imports every model so all tables are registered on Base.metadata.

Import this module (not individual models) wherever the full schema is needed:
app startup, init_db, Alembic, and standalone scripts.
"""
from app.core.database import Base  # noqa: F401

from app.modules.organisations import models as _organisations  # noqa: F401
from app.modules.auth import models as _auth  # noqa: F401
from app.modules.caregivers import models as _caregivers  # noqa: F401
from app.modules.clients import models as _clients  # noqa: F401
from app.modules.family import models as _family  # noqa: F401
from app.modules.scheduling import models as _scheduling  # noqa: F401
from app.modules.ai import models as _ai  # noqa: F401
from app.modules.assessments import models as _assessments  # noqa: F401
from app.modules.audit import models as _audit  # noqa: F401
from app.modules.emergency import models as _emergency  # noqa: F401
from app.modules.medications import models as _medications  # noqa: F401
from app.modules.notifications import models as _notifications  # noqa: F401
from app.modules.reports import models as _reports  # noqa: F401
from app.modules.tasks import models as _tasks  # noqa: F401