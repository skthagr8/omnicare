# Demo Seed Data

## Complete Replacement Migration

The active root revision `20261011_demo` in
`alembic/versions/20261011_demo_initial.py` creates 25 application tables and inserts
the 2,800-row dataset below. Emergency tables are created but not seeded; the other
excluded modules currently define no tables. Schema and seed definitions are frozen
inside the revision and do not import application models or the mutable template.

The previous revision history was deleted while the development database still
recorded `0a6241d353f0`. This replacement is not a forward conversion of that data.
Only use the following reset for the authorized disposable development database.
It permanently deletes the entire `omnicare` PostgreSQL database, including old
application/seed data, but leaves Redis and other Docker volumes untouched.

From the repository root in PowerShell:

```powershell
.\scripts\reset-demo-database.ps1 -ConfirmReset
```

The script verifies the Compose database/user/environment, builds the backend,
runs the replacement migration tests and a mapper check, then stops the backend,
drops/recreates the database, and applies the new root. Any failed validation stops
the workflow before deletion. A failure after recreation leaves the database reset
but not initialized. Backend remains stopped for inspection after success.

For an already empty, unversioned database, without a reset:

```powershell
docker compose run --rm backend alembic -x seed_demo=true upgrade head
docker compose run --rm backend alembic current
```

Expected revision: `20261011_demo`. Existing application tables cause an explicit
upgrade failure; do not use `stamp` to bypass deleted history or schema mismatch.

This combined migration's downgrade removes schema as well as data and therefore
requires `alembic -x reset_demo=true downgrade base`. It locks the application tables
and refuses non-seed rows, including emergency records. It does not remove PostGIS.
External foreign keys can block table drops; PostgreSQL transaction rollback protects
against partially applied drops. Never use this development revision in production.

`seed_demo_migration.py` is a self-contained Alembic **data revision template**
for the current model definitions, excluding emergency, AI, audit, notifications,
and reports. Historical seed revisions are not modified by this template.
It uses SQLAlchemy Core with reflected tables, so the data revision does not
import ORM models or depend on future changes to their constructors.

## Dataset

All 2,800 records are fictional and use stable, namespaced UUIDs. Dates start on
October 5, 2026, with visits distributed across 100 days. No real patient data or
usable credentials are included.

| Module | Seed records |
| --- | --- |
| Prerequisites | 100 organizations; 300 inactive users (100 per role) |
| Caregivers | 100 caregivers; 100 diagnosis certifications |
| Clients | 100 clients; 100 emergency contacts; 100 family links; 100 care plans |
| Family | 100 family profiles; 100 pending service requests |
| Scheduling | 100 sessions; PostgreSQL generates `visit_date` |
| Tasks | 100 uniquely named tasks; 100 session completion records |
| Medications | 100 inactive fictional medications; 100 schedules; 100 administration records |
| Assessments | 400 assessments; 100 rows per detail table; 100 IADL assessments; 100 observations |

Accounts, clients, tasks, medications, and care plans are inactive intentionally.
The password hash `!` is deliberately unusable; do not activate these users without
replacing it through the application's password hashing workflow.
Medication names and dosages are non-clinical placeholders, not prescriptions.
Medications belong directly to clients; tasks retain their category targeting.
Diagnosis category and acuity are client fields, not separate catalog tables.

## Current Blockers

The model import/relationship blockers and creator foreign keys have been repaired
for the replacement. Care-plan/session creators reference users, and seeded users
have organization membership. IADL age categories use age at the assessment date.
The data-only template retains an unresolved parent intentionally; it is not the
active complete replacement revision. Do not copy it over the combined revision.
Runtime validation and database reset remain unverified in this session because
terminal execution is blocked at its approval prompt.

## Data-Only Template

Use only a disposable development/test database with PostgreSQL and PostGIS.
Install the backend dependencies and run these commands from `omnicare/backend`.
After the schema fixes above, create the schema revision:

```powershell
alembic revision --autogenerate -m "align current care model schema"
```

Review and complete that revision, then apply it with `alembic upgrade head`.
Create an empty seed revision **after** the schema revision:

```powershell
alembic revision -m "seed fictional demo care data"
```

Replace that generated file's contents with the template, retaining the generated
`revision` and `down_revision` values in place of the template values. Keeping the
seed snapshot inside the revision makes historical migrations reproducible.
Do not leave `REPLACE_WITH_SCHEMA_REVISION` as the parent.

Apply the new seed revision explicitly:

```powershell
alembic -x seed_demo=true upgrade head
```

The seed requires an online connection and checks table/column presence, required
columns, timestamp timezone compatibility, FK target tables, and reflected enum
labels before inserting anything. Python-side model
defaults are not invoked by Core inserts, so required values are supplied explicitly.
All writes run in Alembic's migration transaction. Duplicate IDs/emails fail and
roll back rather than overwrite existing records. Alembic tracks the applied revision;
calling `upgrade head` again does not insert a second copy.

Do not include this opt-in demo revision in a production release's migration chain.
Without `seed_demo=true`, it deliberately fails rather than silently marking a
skipped seed as applied. This flag is an explicit opt-in, not environment detection.

## Data-Only Rollback And Tests

When the seed is the latest applied revision:

```powershell
alembic downgrade -1
python -m unittest discover -s tests/unit -p test_seed_demo_migration.py -v
```

Rollback deletes seeded primary keys in reverse dependency order, including
composite keys. Before deletion it checks incoming foreign keys across database
schemas and refuses rollback if a non-seed row references a demo entity, including
rows in excluded modules. It holds SHARE ROW EXCLUSIVE table locks through the
transaction to prevent concurrent writes racing this check. Rollback may therefore
wait for other database activity; use it during a quiet development session.
This is not a general database cleanup command. The guard relies on declared
database foreign keys; it cannot detect application-only references, triggers,
or changed contents of records with seed IDs. Use only a disposable demo database.
To reseed after rollback, run the explicit upgrade command again.

Unit tests cover deterministic data, minimum counts, model table/column names,
required values, timestamp timezone compatibility, seeded foreign-key ordering,
assessment detail matching, session/client consistency, IADL age boundaries, and
task name uniqueness. Isolated SQLite tests cover external referenced-row checks
and refusal of rollback with non-seed dependents; PostgreSQL locking is stubbed
in those tests. The consolidated suite avoids importing the broken ORM graph.
It does not prove mapper initialization or live PostgreSQL locking/constraints.
A real PostgreSQL/PostGIS upgrade/downgrade test is still
required after the schema blockers are fixed. Runtime tests have not been executed
in this session because terminal execution is awaiting approval.