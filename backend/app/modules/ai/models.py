# modules/ai/models.py
from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base
from sqlalchemy.dialects.postgresql import JSONB



class CognitiveDeclinePrediction(Base):
    
    __tablename__ = "cognitive_decline_predictions"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id  = Column(UUID(as_uuid=True), index=True, nullable=False)

    # Always NULL in a population-prior-only deployment.
    # Kept on the table so that if NHATS support is added later, existing
    # rows remain valid and new rows can fill them in.
    anchor_round = Column(Integer, nullable=True)   # ← see note below
    target_round = Column(Integer, nullable=True)

    decline_rate   = Column(Float,  nullable=False)
    severity       = Column(String, nullable=False)
    recommendation = Column(Text,   nullable=False)

    data_source     = Column(String(32), nullable=False, default="population_prior")
    confidence      = Column(String(16), nullable=False, default="low")
    mapped_features = Column(JSONB, nullable=True)
    

    model_version = Column(String(64), nullable=False)
    predicted_at  = Column(DateTime, default=datetime.utcnow, nullable=False)