from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.database.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    telegram_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=True)

    calorie_goal = Column(Integer, default=2000)
    protein_goal = Column(Integer, default=120)
    fat_goal = Column(Integer, default=65)
    carb_goal = Column(Integer, default=220)

    auto_confirm = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    custom_products = relationship("CustomProduct", back_populates="user", cascade="all, delete-orphan")
    standards = relationship("UserStandard", back_populates="user", cascade="all, delete-orphan")
    context = relationship("ConversationContext", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.telegram_id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    meal_type = Column(String(20), nullable=False, default="snack")  # breakfast, lunch, dinner, snack
    photo_file_id = Column(String(255), nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="meals")
    items = relationship("MealItem", back_populates="meal", cascade="all, delete-orphan")


class MealItem(Base):
    __tablename__ = "meal_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meal_id = Column(Integer, ForeignKey("meals.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(30), nullable=False)  # g, ml, pcs, tbsp, tsp, etc.
    weight_grams = Column(Float, nullable=False)

    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)

    confidence = Column(String(20), default="high")  # low, medium, high
    is_estimated = Column(Boolean, default=False)
    source = Column(String(50), default="local")  # local, openfoodfacts, custom_recipe, estimated

    created_at = Column(DateTime, default=utcnow)

    meal = relationship("Meal", back_populates="items")


class CustomProduct(Base):
    __tablename__ = "custom_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.telegram_id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    aliases = Column(String(500), nullable=True)  # comma separated
    calories_100g = Column(Float, nullable=False)
    protein_100g = Column(Float, nullable=False)
    fat_100g = Column(Float, nullable=False)
    carbs_100g = Column(Float, nullable=False)

    standard_unit = Column(String(30), default="g")
    standard_unit_weight = Column(Float, default=100.0)

    is_recipe = Column(Boolean, default=False)
    recipe_items_json = Column(Text, nullable=True)  # JSON with ingredients

    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="custom_products")


class UserStandard(Base):
    __tablename__ = "user_standards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.telegram_id", ondelete="CASCADE"), nullable=False, index=True)

    item_name = Column(String(255), nullable=False)
    standard_quantity = Column(Float, default=1.0)
    standard_unit = Column(String(30), default="pcs")
    standard_grams = Column(Float, default=70.0)
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="standards")


class ConversationContext(Base):
    __tablename__ = "conversation_contexts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.telegram_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    last_meal_id = Column(Integer, nullable=True)
    last_action = Column(String(50), nullable=True)
    pending_parsed_data_json = Column(Text, nullable=True)
    context_data_json = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="context")
