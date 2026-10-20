from enum import Enum

from sqlalchemy import Enum as SQLAlchemyEnum


def pg_enum(enum_class, name):
    return SQLAlchemyEnum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
        native_enum=True,
    )