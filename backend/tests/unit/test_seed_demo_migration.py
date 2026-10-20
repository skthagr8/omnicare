import ast
from collections import Counter
from datetime import date, datetime
from pathlib import Path
import unittest
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[2]
MODULES = ("auth", "organisations", "caregivers", "family", "clients", "scheduling",
           "tasks", "medications", "assessments")


def seed_namespace():
    source = BACKEND / "scripts/seed_demo_migration.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    nodes = []
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module in ("datetime", "decimal", "uuid", "typing"):
            nodes.append(node)
        elif isinstance(node, ast.Assign):
            nodes.append(node)
        elif isinstance(node, ast.FunctionDef) and node.name in (
            "seed_id", "seed_rows", "pick_from", "human_name", "human_address",
            "demo_phone", "demo_email", "age_category_at",
        ):
            nodes.append(node)
    namespace = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), "exec"), namespace)
    return namespace


def model_columns():
    tables = {}
    for module in MODULES:
        source = BACKEND / "app/modules" / module / "models.py"
        for node in ast.parse(source.read_text(encoding="utf-8")).body:
            if not isinstance(node, ast.ClassDef):
                continue
            name = next((ast.literal_eval(item.value) for item in node.body
                         if isinstance(item, ast.Assign) and any(
                             isinstance(target, ast.Name) and target.id == "__tablename__"
                             for target in item.targets)), None)
            if name is None:
                continue
            columns = {}
            for item in node.body:
                if isinstance(item, ast.AnnAssign):
                    target, value = item.target, item.value
                    annotation = ast.unparse(item.annotation)
                elif isinstance(item, ast.Assign):
                    target, value = item.targets[0], item.value
                    annotation = ""
                else:
                    continue
                if not (isinstance(value, ast.Call) and isinstance(value.func, ast.Name)
                        and value.func.id == "mapped_column"):
                    continue
                keywords = {keyword.arg: keyword.value for keyword in value.keywords}
                nullable = keywords.get("nullable")
                required = (not ast.literal_eval(nullable) if nullable is not None
                            else bool(annotation) and "Optional" not in annotation)
                computed = any(isinstance(argument, ast.Call)
                               and isinstance(argument.func, ast.Name)
                               and argument.func.id == "Computed" for argument in value.args)
                required = required and "server_default" not in keywords and not computed
                foreign_keys = [ast.literal_eval(argument.args[0]) for argument in value.args
                                if isinstance(argument, ast.Call)
                                and isinstance(argument.func, ast.Name)
                                and argument.func.id == "ForeignKey"]
                timestamp = next((argument for argument in value.args
                                  if (isinstance(argument, ast.Name) and argument.id == "DateTime")
                                  or (isinstance(argument, ast.Call)
                                      and isinstance(argument.func, ast.Name)
                                      and argument.func.id == "DateTime")), None)
                timezone = False
                if isinstance(timestamp, ast.Call):
                    timezone = any(keyword.arg == "timezone" and ast.literal_eval(keyword.value)
                                   for keyword in timestamp.keywords)
                columns[target.id] = (required, foreign_keys, timestamp is not None, timezone)
            tables[name] = columns
    return tables


class SeedDemoTests(unittest.TestCase):
    def setUp(self):
        self.seed = seed_namespace()
        self.rows = self.seed["seed_rows"]()
        self.tables = model_columns()

    def test_all_current_tables_have_at_least_fifty_records(self):
        self.assertEqual(set(self.rows), set(self.tables))
        for table, records in self.rows.items():
            self.assertGreaterEqual(len(records), self.seed["BASE_COUNT"], table)
        self.assertEqual(len(self.rows["assessments"]), 4 * self.seed["BASE_COUNT"])
        self.assertEqual(len(self.rows["users"]), 3 * self.seed["BASE_COUNT"])
        self.assertEqual(self.rows, self.seed["seed_rows"]())

    def test_seeded_users_belong_to_their_organization(self):
        memberships = {record["id"]: [] for record in self.rows["organizations"]}
        for user in self.rows["users"]:
            self.assertIn(user["org_id"], memberships)
            memberships[user["org_id"]].append(user["role"])
        for roles in memberships.values():
            self.assertCountEqual(roles, ("admin", "caregiver", "family"))
        users = {record["id"]: record for record in self.rows["users"]}
        for client in self.rows["clients"]:
            self.assertEqual(users[client["registered_by"]]["org_id"], client["org_id"])

    def test_columns_required_values_and_timezone_match_models(self):
        for table, records in self.rows.items():
            columns = self.tables[table]
            for record in records:
                self.assertFalse(set(record) - set(columns), table)
                for column, (required, _, timestamp, timezone) in columns.items():
                    if required:
                        self.assertIsNotNone(record.get(column), f"{table}.{column}")
                    value = record.get(column)
                    if timestamp and value is not None:
                        self.assertIsInstance(value, datetime)
                        self.assertEqual(value.utcoffset() is not None, timezone,
                                         f"{table}.{column}")

    def test_seeded_foreign_keys_reference_earlier_rows(self):
        seen = {}
        for table, records in self.rows.items():
            for record in records:
                for column, (_, references, _, _) in self.tables[table].items():
                    for reference in references:
                        parent, parent_column = reference.split(".")
                        if parent not in self.rows:
                            self.assertEqual(parent, "administrators")
                            continue
                        value = record.get(column)
                        if value is not None:
                            self.assertIn(value, seen.get((parent, parent_column), set()),
                                          f"{table}.{column}")
            for column in self.tables[table]:
                if column in ("id", "user_id", "assessment_id"):
                    seen[table, column] = {record[column] for record in records if column in record}

    def test_keys_and_session_participants_are_consistent(self):
        sessions = {record["id"]: record for record in self.rows["caregiver_sessions"]}
        for table, records in self.rows.items():
            key = "id" if "id" in records[0] else "assessment_id" if "assessment_id" in records[0] else "user_id"
            if table in ("client_family_links", "caregiver_certifications"):
                keys = [tuple(sorted(record.items())) for record in records]
            else:
                keys = [record[key] for record in records]
            self.assertEqual(len(keys), len(set(keys)), table)
        for table in ("assessments", "observations", "task_completions"):
            for record in self.rows[table]:
                session = sessions[record["session_id"]]
                self.assertEqual(record["client_id"], session["client_id"])
        types = Counter(record["assessment_type"] for record in self.rows["assessments"])
        self.assertEqual(types, {kind: self.seed["BASE_COUNT"]
                     for kind in ("tug", "cmai", "braden", "delirium")})
        assessments = {record["id"]: record for record in self.rows["assessments"]}
        for table, kind in (("tug_assessments", "tug"), ("cmai_assessments", "cmai"),
                            ("braden_assessments", "braden"), ("delirium_screenings", "delirium")):
            for record in self.rows[table]:
                self.assertEqual(assessments[record["assessment_id"]]["assessment_type"], kind)

    def test_iadl_choices_and_inactive_demo_accounts(self):
        for user in self.rows["users"]:
            self.assertFalse(user["is_active"])
            self.assertEqual(user["password_hash"], "!")
        for record in self.rows["iadl_assessments"]:
            for field in ("bathing", "transferring", "mobility", "meal_preparation",
                          "laundry", "medication_management", "telephone_use", "community_mobility"):
                self.assertIn(record[field], (0, 1))
            self.assertIn(record["memory_status"], ("GOOD", "FAIR", "POOR", "UNKNOWN"))
            self.assertIn(record["age_category"], ("UNDER_65", "65_74", "75_84", "85_PLUS", "UNKNOWN"))


    def test_task_catalog_names_are_unique_per_category(self):
        pairs = [(record["name"], record["target_category"]) for record in self.rows["tasks"]]
        self.assertEqual(len(pairs), len(set(pairs)))

    def test_age_categories_use_birth_date_and_assessment_date(self):
        category_at = self.seed["age_category_at"]
        for age, expected in ((64, "UNDER_65"), (65, "65_74"), (74, "65_74"),
                              (75, "75_84"), (84, "75_84"), (85, "85_PLUS")):
            self.assertEqual(category_at(date(2026 - age, 10, 11), date(2026, 10, 11)), expected)
        self.assertEqual(category_at(date(1961, 10, 12), date(2026, 10, 11)), "UNDER_65")
        with self.assertRaises(ValueError):
            category_at(date(2027, 1, 1), date(2026, 1, 1))
        clients = {record["id"]: record for record in self.rows["clients"]}
        for record in self.rows["iadl_assessments"]:
            self.assertEqual(record["age_category"], category_at(
                clients[record["patient_id"]]["date_of_birth"], record["created_at"].date()))


class SeedDatabaseGuardTests(unittest.TestCase):
    def setUp(self):
        try:
            import sqlalchemy as sa
        except ImportError:
            self.skipTest("SQLAlchemy is required for database guard tests")
        self.sa = sa
        self.engine = sa.create_engine("sqlite://")
        self.connection = self.engine.connect()
        self.connection.exec_driver_sql("ATTACH DATABASE ':memory:' AS public")
        self.metadata = sa.MetaData()
        self.clients = sa.Table(
            "clients", self.metadata,
            sa.Column("id", sa.Integer, primary_key=True), schema="public",
        )
        self.notes = sa.Table(
            "notes", self.metadata,
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("client_id", sa.Integer, sa.ForeignKey("public.clients.id")),
            schema="public",
        )
        self.metadata.create_all(self.connection)
        source = BACKEND / "scripts/seed_demo_migration.py"
        tree = ast.parse(source.read_text(encoding="utf-8"))
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                 and node.name in ("validate_external_references", "guard_rollback", "seed_identity")]
        self.namespace = {"sa": sa}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), "exec"),
             self.namespace)
        original_execute = self.connection.exec_driver_sql

        def execute_without_postgres_lock(statement, *args, **kwargs):
            if statement.startswith("LOCK TABLE "):
                return None
            return original_execute(statement, *args, **kwargs)

        self.lock_patch = patch.object(self.connection, "exec_driver_sql",
                                       side_effect=execute_without_postgres_lock)
        self.lock_mock = self.lock_patch.start()

    def tearDown(self):
        if hasattr(self, "connection"):
            self.lock_patch.stop()
            self.connection.close()
            self.engine.dispose()

    def test_external_reference_must_exist(self):
        metadata = self.sa.MetaData()
        administrators = self.sa.Table(
            "administrators", metadata,
            self.sa.Column("user_id", self.sa.Integer, primary_key=True),
        )
        care_plans = self.sa.Table(
            "care_plans", metadata,
            self.sa.Column("id", self.sa.Integer, primary_key=True),
            self.sa.Column("created_by", self.sa.Integer,
                           self.sa.ForeignKey("administrators.user_id")),
        )
        metadata.create_all(self.connection)
        rows = {"care_plans": [{"id": 10, "created_by": 1}]}
        validate = self.namespace["validate_external_references"]
        with self.assertRaisesRegex(RuntimeError, "Missing 1 external reference"):
            validate(self.connection, rows, {"care_plans": care_plans})
        self.connection.execute(administrators.insert().values(user_id=1))
        validate(self.connection, rows, {"care_plans": care_plans})

    def test_organization_administrators_filter_role_and_membership(self):
        from sqlalchemy.orm import Mapped, Session, mapped_column, registry, relationship
        from sqlalchemy.dialects.postgresql import UUID
        from typing import Optional
        import uuid

        mapper_registry = registry()
        namespace = {
            "Base": mapper_registry.generate_base(), "Mapped": Mapped,
            "mapped_column": mapped_column, "relationship": relationship,
            "UUID": UUID, "uuid": uuid, "datetime": datetime, "Optional": Optional,
        }
        for name in ("Boolean", "DateTime", "ForeignKey", "String"):
            namespace[name] = getattr(self.sa, name)
        nodes = []
        for module, class_name in (("auth", "User"), ("organisations", "Organization")):
            source = BACKEND / "app/modules" / module / "models.py"
            node = next(item for item in ast.parse(source.read_text(encoding="utf-8")).body
                        if isinstance(item, ast.ClassDef) and item.name == class_name)
            if class_name == "User":
                node.body = [item for item in node.body
                             if not (isinstance(item, ast.AnnAssign)
                                     and isinstance(item.target, ast.Name)
                                     and item.target.id in ("caregiver", "family_members"))]
            nodes.append(node)
        exec(compile(ast.Module(body=nodes, type_ignores=[]), "organization_models", "exec"),
             namespace)
        mapper_registry.configure()
        base = namespace["Base"]
        organization_class, user_class = namespace["Organization"], namespace["User"]
        base.metadata.create_all(self.connection)
        stamp = datetime(2026, 10, 11)
        with Session(bind=self.connection) as session:
            first = organization_class(name="First", created_at=stamp, updated_at=stamp)
            second = organization_class(name="Second", created_at=stamp, updated_at=stamp)
            session.add_all([first, second])
            members = []
            for index, (role, organization) in enumerate((
                ("admin", first), ("caregiver", first), ("admin", second), ("admin", None)
            )):
                member = user_class(email=f"member-{index}@example.invalid",
                                    password_hash="!", full_name=f"Member {index}",
                                    role=role, organization=organization,
                                    created_at=stamp, updated_at=stamp)
                members.append(member)
                session.add(member)
            session.flush()
            self.assertEqual([member.id for member in first.administrators], [members[0].id])
            self.assertEqual([member.id for member in second.administrators], [members[2].id])
            first.administrators.append(members[1])
            session.flush()
            session.expire(first, ["administrators"])
            self.assertEqual([member.id for member in first.administrators], [members[0].id])

    def test_rollback_refuses_non_seed_dependents(self):
        self.connection.execute(self.clients.insert().values(id=1))
        self.connection.execute(self.notes.insert().values(id=11, client_id=1))
        rows = {"clients": [{"id": 1}], "notes": [{"id": 10, "client_id": 1}]}
        with self.assertRaisesRegex(RuntimeError, "Rollback refused"):
            self.namespace["guard_rollback"](
                self.connection, rows, {"clients": self.clients, "notes": self.notes})
        self.assertEqual(self.connection.scalar(self.sa.select(self.sa.func.count())
                                                .select_from(self.clients)), 1)
        self.assertTrue(any(call.args[0].startswith("LOCK TABLE ")
                            for call in self.lock_mock.call_args_list))

    def test_rollback_refuses_dependents_in_unseeded_tables(self):
        self.connection.execute(self.clients.insert().values(id=1))
        self.connection.execute(self.notes.insert().values(id=11, client_id=1))
        with self.assertRaisesRegex(RuntimeError, "Rollback refused"):
            self.namespace["guard_rollback"](
                self.connection, {"clients": [{"id": 1}]}, {"clients": self.clients})

    def test_rollback_allows_only_seed_dependents(self):
        self.connection.execute(self.clients.insert().values(id=1))
        self.connection.execute(self.notes.insert().values(id=10, client_id=1))
        rows = {"clients": [{"id": 1}], "notes": [{"id": 10, "client_id": 1}]}
        self.namespace["guard_rollback"](
            self.connection, rows, {"clients": self.clients, "notes": self.notes})


if __name__ == "__main__":
    unittest.main()