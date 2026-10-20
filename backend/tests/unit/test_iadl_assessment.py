import ast
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional
import unittest
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, registry, relationship


BINARY_FIELDS = (
    "bathing", "transferring", "mobility", "meal_preparation", "laundry",
    "medication_management", "telephone_use", "community_mobility",
)


def isolated_model():
    source = Path(__file__).resolve().parents[2] / "app/modules/assessments/models.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    model_node = next(node for node in tree.body
                      if isinstance(node, ast.ClassDef) and node.name == "IadlAssessment")
    mapper_registry = registry()
    base = mapper_registry.generate_base()

    class Client(base):
        __tablename__ = "clients"
        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)

    namespace = {
        "Base": base, "Enum": Enum, "Mapped": Mapped, "UUID": UUID,
        "uuid": uuid, "datetime": datetime, "Optional": Optional,
        "mapped_column": mapped_column, "relationship": relationship,
        "pg_enum": lambda members, name: sa.Enum(
            members, name=name, values_callable=lambda values: [item.value for item in values]
        ),
    }
    for name in ("Boolean", "CheckConstraint", "DateTime", "ForeignKey", "Index",
                 "SmallInteger", "text"):
        namespace[name] = getattr(sa, name)
    exec(compile(ast.Module(body=[model_node], type_ignores=[]), str(source), "exec"),
         namespace)
    mapper_registry.configure()
    return namespace["IadlAssessment"], base.metadata


class IadlAssessmentTests(unittest.TestCase):
    def setUp(self):
        self.model, self.metadata = isolated_model()

    def test_dependency_score_boundaries(self):
        for adl_total in range(4):
            for iadl_total in range(6):
                values = dict(zip(BINARY_FIELDS[:3], [int(index < adl_total)
                                                     for index in range(3)]))
                values.update(zip(BINARY_FIELDS[3:], [int(index < iadl_total)
                                                      for index in range(5)]))
                assessment = self.model(**values)
                self.assertEqual(assessment.total_adl_score, adl_total)
                self.assertEqual(assessment.total_iadl_score, iadl_total)
                self.assertEqual(assessment.adl_dependency_level,
                                 "High" if adl_total <= 1 else "Moderate" if adl_total == 2 else "Low")
                self.assertEqual(assessment.iadl_dependency_level,
                                 "High" if iadl_total <= 1 else "Moderate" if iadl_total <= 3 else "Low")

    def test_each_fall_flag(self):
        fields = ("fell_last_12_months", "fell_last_month", "multiple_falls", "fear_of_falling")
        assessment = self.model(**{name: False for name in fields})
        self.assertFalse(assessment.fall_risk_flag)
        for name in fields:
            assessment = self.model(**{field: field == name for field in fields})
            self.assertTrue(assessment.fall_risk_flag)

    def test_database_defaults_and_binary_constraints(self):
        engine = sa.create_engine("sqlite://")
        try:
            self.metadata.create_all(engine)
            table = self.model.__table__
            values = {name: 0 for name in BINARY_FIELDS}
            values.update(id=uuid.uuid4(), patient_id=uuid.uuid4(),
                          created_at=datetime(2026, 10, 11), updated_at=datetime(2026, 10, 11))
            with engine.begin() as connection:
                connection.execute(table.insert().values(**values))
                stored = connection.execute(sa.select(table)).mappings().one()
                self.assertFalse(stored["has_diabetes"])
                self.assertEqual(stored["memory_status"].value, "UNKNOWN")
                self.assertEqual(stored["age_category"].value, "UNKNOWN")
            for field in BINARY_FIELDS:
                for invalid_value in (-1, 2):
                    with self.assertRaises(sa.exc.IntegrityError):
                        with engine.begin() as connection:
                            connection.execute(table.insert().values(
                                **dict(values, id=uuid.uuid4(), **{field: invalid_value})
                            ))
            self.assertEqual(next(iter(table.c.patient_id.foreign_keys)).target_fullname,
                             "clients.id")
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()