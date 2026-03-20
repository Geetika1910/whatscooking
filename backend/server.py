from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize Claude chat
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = 'HS256'

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    created_at: str

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int
    name: str
    cat: str
    qty: float
    unit: str
    threshold: float
    expiry: str = ""

class InventoryItemCreate(BaseModel):
    name: str
    cat: str
    qty: float
    unit: str
    threshold: float
    expiry: str = ""

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    cat: Optional[str] = None
    qty: Optional[float] = None
    unit: Optional[str] = None
    threshold: Optional[float] = None
    expiry: Optional[str] = None

class Preferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    diet: str = "Vegetarian"
    health_goal: str = "No goal"
    spice_level: str = "Medium"

class SpinRequest(BaseModel):
    time: str
    mood: str
    healthy_toggles: Optional[dict] = None
    fasting_toggles: Optional[dict] = None
    ingredients: List[str]
    people: int
    meal_time: str

class RecipeRequest(BaseModel):
    dish: str
    people: int

class SideDishRequest(BaseModel):
    dish: str

class DeductionRequest(BaseModel):
    dish: str
    people: int
    recipe_ingredients: Optional[List[dict]] = None

class MealSuggestionsRequest(BaseModel):
    meal_type: str
    diet: str
    health_goal: str
    spice_level: str
    available_ingredients: List[str]

# Helper function to call Claude
async def call_claude(prompt: str, session_id: str = "default") -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="You are a helpful Indian home cooking assistant."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"Claude API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "What's Cooking API"}

# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_password.decode('utf-8'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    token = jwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "user": {"id": user_id, "name": user_data.name, "email": user_data.email},
        "token": token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), user['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = jwt.encode(
        {"user_id": user['id'], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "user": {"id": user['id'], "name": user['name'], "email": user['email']},
        "token": token
    }

# Inventory endpoints
@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory():
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/inventory", response_model=InventoryItem)
async def add_inventory_item(item: InventoryItemCreate):
    item_dict = item.model_dump()
    item_dict['id'] = int(datetime.now(timezone.utc).timestamp() * 1000)
    await db.inventory.insert_one(item_dict)
    return InventoryItem(**item_dict)

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: int, item: InventoryItemUpdate):
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.inventory.update_one(
        {"id": item_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    updated_item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    return InventoryItem(**updated_item)

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: int):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# Preferences endpoints
@api_router.get("/preferences", response_model=Preferences)
async def get_preferences():
    prefs = await db.preferences.find_one({}, {"_id": 0})
    if not prefs:
        return Preferences()
    return Preferences(**prefs)

@api_router.post("/preferences", response_model=Preferences)
async def save_preferences(prefs: Preferences):
    prefs_dict = prefs.model_dump()
    await db.preferences.delete_many({})
    await db.preferences.insert_one(prefs_dict)
    return prefs

# AI endpoints
@api_router.post("/spin")
async def spin_dish(req: SpinRequest):
    try:
        # Build prompt
        prompt = f"""You are a helpful Indian home cooking assistant.
Time available: {req.time}
Mood: {req.mood}
"""
        
        if req.healthy_toggles:
            enabled = [k for k, v in req.healthy_toggles.items() if v]
            if enabled:
                prompt += f"Healthy preferences: {', '.join(enabled)}\n"
        
        if req.fasting_toggles:
            enabled = [k for k, v in req.fasting_toggles.items() if v]
            if enabled:
                prompt += f"Fasting restrictions: {', '.join(enabled)}\n"
        
        prompt += f"""Ingredients at home: {', '.join(req.ingredients)}
Meal time: {req.meal_time}, Serving: {req.people} people
Suggest ONE Indian home-cooked dish. Return ONLY valid JSON (no markdown):
{{"dish":"name","time":"X min","reason":"one warm sentence why this fits","tags":["tag1","tag2","tag3"],"category":"dal|roti|rice|sabzi|snack|sweet|fasting|healthy"}}"""
        
        response = await call_claude(prompt, f"spin-{uuid.uuid4()}")
        
        # Parse JSON from response
        response_clean = response.strip()
        if response_clean.startswith('```json'):
            response_clean = response_clean.split('```json')[1].split('```')[0].strip()
        elif response_clean.startswith('```'):
            response_clean = response_clean.split('```')[1].split('```')[0].strip()
        
        result = json.loads(response_clean)
        return result
    except json.JSONDecodeError:
        # Fallback
        fallbacks = [
            {"dish": "Dal Tadka with Roti", "time": "25 min", "reason": "Classic, filling, and everything's already in your kitchen.", "tags": ["Comfort food", "Under 30 min", "Crowd pleaser"], "category": "dal"},
            {"dish": "Aloo Paratha", "time": "30 min", "reason": "Flour and potatoes are there — this writes itself.", "tags": ["Soul food", "Quick", "Weekend energy"], "category": "roti"},
            {"dish": "Poha", "time": "15 min", "reason": "The quickest breakfast that still feels like a proper meal.", "tags": ["Super quick", "Light", "Easy cleanup"], "category": "snack"}
        ]
        import random
        return random.choice(fallbacks)
    except Exception as e:
        logging.error(f"Spin error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/recipe")
async def get_recipe(req: RecipeRequest):
    try:
        prompt = f"""Complete Indian home recipe for "{req.dish}" for {req.people} people.
Return ONLY valid JSON (no markdown):
{{"ingredients":[{{"name":"x","qty":"Xg or X pcs"}}],"steps":["step1","step2"],"prep_time":"X min","cook_time":"X min","pro_tip":"one golden cooking tip","variation":"one quick twist idea"}}"""
        
        response = await call_claude(prompt, f"recipe-{uuid.uuid4()}")
        
        # Parse JSON
        response_clean = response.strip()
        if response_clean.startswith('```json'):
            response_clean = response_clean.split('```json')[1].split('```')[0].strip()
        elif response_clean.startswith('```'):
            response_clean = response_clean.split('```')[1].split('```')[0].strip()
        
        result = json.loads(response_clean)
        return result
    except Exception:
        # Fallback
        return {
            "ingredients": [{"name": "Main ingredient", "qty": "as needed"}, {"name": "Spices", "qty": "to taste"}],
            "steps": ["Prepare ingredients", "Cook with spices", "Serve hot"],
            "prep_time": "10 min",
            "cook_time": "20 min",
            "pro_tip": "Use fresh ingredients for best taste.",
            "variation": "Add vegetables for extra nutrition."
        }

@api_router.post("/side-dish")
async def get_side_dish(req: SideDishRequest):
    try:
        prompt = f'One simple Indian side dish pairing for "{req.dish}". One sentence, plain text only.'
        response = await call_claude(prompt, f"side-{uuid.uuid4()}")
        return {"suggestion": response.strip()}
    except Exception:
        return {"suggestion": "Try with raita or a simple salad."}

@api_router.post("/deduction-estimate")
async def get_deduction_estimate(req: DeductionRequest):
    try:
        # If recipe ingredients provided, use them
        if req.recipe_ingredients:
            return {"ingredients": req.recipe_ingredients}
        
        prompt = f"""For the Indian dish "{req.dish}" cooked for {req.people} people, list the main ingredients with approximate quantities used.
Return ONLY valid JSON array: [{{"name":"ingredient","qty_used":number,"unit":"g|ml|pcs|tbsp"}}]
Only include ingredients likely to be in a home pantry. Max 8 items."""
        
        response = await call_claude(prompt, f"deduction-{uuid.uuid4()}")
        
        # Parse JSON
        response_clean = response.strip()
        if response_clean.startswith('```json'):
            response_clean = response_clean.split('```json')[1].split('```')[0].strip()
        elif response_clean.startswith('```'):
            response_clean = response_clean.split('```')[1].split('```')[0].strip()
        
        result = json.loads(response_clean)
        return {"ingredients": result}
    except Exception:
        # Fallback
        return {
            "ingredients": [
                {"name": "Main ingredient", "qty_used": 150, "unit": "g"},
                {"name": "Oil", "qty_used": 1, "unit": "tbsp"},
                {"name": "Spices", "qty_used": 5, "unit": "g"}
            ]
        }

@api_router.post("/meal-suggestions")
async def get_meal_suggestions(req: MealSuggestionsRequest):
    try:
        prompt = f"""Indian home cooking expert. Generate 4 personalised {req.meal_type} suggestions.
User preferences: diet={req.diet}, health goal={req.health_goal}, spice level={req.spice_level}.
Available ingredients: {', '.join(req.available_ingredients)}.
Return ONLY valid JSON array of exactly 4 objects (no markdown):
[{{"name":"dish","time":"X min","tags":["tag1","tag2"],"category":"dal|roti|rice|sabzi|snack|healthy","why":"max 8 words why this suits them"}}]"""
        
        response = await call_claude(prompt, f"meal-{uuid.uuid4()}")
        
        # Parse JSON
        response_clean = response.strip()
        if response_clean.startswith('```json'):
            response_clean = response_clean.split('```json')[1].split('```')[0].strip()
        elif response_clean.startswith('```'):
            response_clean = response_clean.split('```')[1].split('```')[0].strip()
        
        result = json.loads(response_clean)
        return {"suggestions": result}
    except Exception:
        # Fallback
        fallbacks = {
            "Breakfast": [{"name": "Poha", "time": "15 min", "tags": ["Quick", "Light"], "category": "snack", "why": "Fast and energizing morning meal"}, {"name": "Upma", "time": "20 min", "tags": ["Filling", "Healthy"], "category": "snack", "why": "Nutritious and keeps you full"}, {"name": "Aloo Paratha", "time": "30 min", "tags": ["Comfort", "Filling"], "category": "roti", "why": "Satisfying breakfast for busy mornings"}, {"name": "Oats Dal", "time": "20 min", "tags": ["Healthy", "Protein"], "category": "dal", "why": "High protein savory breakfast"}],
            "Lunch": [{"name": "Dal Chawal", "time": "25 min", "tags": ["Comfort", "Complete"], "category": "dal", "why": "Classic balanced lunch combo"}, {"name": "Roti Sabzi", "time": "20 min", "tags": ["Light", "Nutritious"], "category": "roti", "why": "Simple wholesome lunch"}, {"name": "Rajma", "time": "40 min", "tags": ["Protein", "Filling"], "category": "dal", "why": "Protein-rich satisfying meal"}, {"name": "Pulao", "time": "30 min", "tags": ["One-pot", "Flavorful"], "category": "rice", "why": "Easy one-pot complete meal"}],
            "Dinner": [{"name": "Khichdi", "time": "20 min", "tags": ["Light", "Comfort"], "category": "rice", "why": "Light and easy to digest"}, {"name": "Palak Paneer", "time": "30 min", "tags": ["Protein", "Nutritious"], "category": "sabzi", "why": "Nutritious protein-rich dinner"}, {"name": "Moong Dal", "time": "20 min", "tags": ["Light", "Protein"], "category": "dal", "why": "Easy protein-packed dinner"}, {"name": "Vegetable Dalia", "time": "25 min", "tags": ["Healthy", "Fiber"], "category": "healthy", "why": "Fiber-rich healthy dinner option"}]
        }
        return {"suggestions": fallbacks.get(req.meal_type, fallbacks["Lunch"])}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
