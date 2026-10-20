import importlib.util
from pathlib import Path
import unittest

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable


BACKEND = Path(__file__).resolve().parents[2]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CombinedInitialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.migration = load_module(
            'combined_initial', BACKEND / 'alembic/versions/20261011_demo_initial.py'
        )
        cls.metadata = cls.migration.schema_metadata()
        cls.rows = cls.migration.seed_rows()

    def test_revision_is_a_new_root(self):
        self.assertEqual(self.migration.revision, '20261011_demo')
        self.assertIsNone(self.migration.down_revision)

    def test_schema_compiles_for_postgresql(self):
        self.assertEqual(len(self.metadata.tables), 25)
        for table in self.metadata.sorted_tables:
            self.assertIn('CREATE TABLE', str(CreateTable(table).compile(dialect=postgresql.dialect())))

    def test_seed_count_fields_and_constraints(self):
        self.assertEqual(sum(map(len, self.rows.values())), 2800)
        for name, records in self.rows.items():
            self.assertGreaterEqual(len(records), 100, name)
            table = self.metadata.tables[f'public.{name}']
            required = {column.name for column in table.columns if not column.nullable
                        and column.server_default is None and column.computed is None}
            for record in records:
                self.assertFalse(set(record) - set(table.c.keys()), name)
                self.assertFalse(required - set(record), name)
                for column in table.columns:
                    value = record.get(column.name)
                    if value is not None and isinstance(column.type, sa.Enum):
                        self.assertIn(value, column.type.enums)
                    if value is not None and isinstance(column.type, sa.DateTime):
                        self.assertEqual(value.utcoffset() is not None, column.type.timezone)
        tasks = [(record['name'], record['target_category']) for record in self.rows['tasks']]
        self.assertEqual(len(tasks), len(set(tasks)))

    def test_foreign_keys_have_matching_seed_parents(self):
        for name, records in self.rows.items():
            table = self.metadata.tables[f'public.{name}']
            for constraint in table.foreign_key_constraints:
                parent = constraint.referred_table.name
                child_columns = [element.parent.name for element in constraint.elements]
                parent_columns = [element.column.name for element in constraint.elements]
                parent_keys = {tuple(record[column] for column in parent_columns)
                               for record in self.rows[parent]}
                for record in records:
                    values = tuple(record.get(column) for column in child_columns)
                    if all(value is not None for value in values):
                        self.assertIn(values, parent_keys, name)

    def test_snapshot_matches_current_template(self):
        template = load_module('current_seed', BACKEND / 'scripts/seed_demo_migration.py')
        self.assertEqual(self.rows, template.seed_rows())

    def test_excluded_modules_are_not_seeded(self):
        for name in ('emergency_events', 'emergency_outbox', 'audit_logs', 'notifications'):
            self.assertNotIn(name, self.rows)


if __name__ == '__main__':
    unittest.main()