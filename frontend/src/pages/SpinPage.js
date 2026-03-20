import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Storage } from '../utils/storage';
import { defaultInventory } from '../utils/defaultInventory';
import { statusOf, getStatusColor } from '../utils/itemStatus';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Chip component for selections
const Chip = ({ children, selected, onClick, color = 'saffron', testId }) => {
  const colors = {
    saffron: { bg: 'var(--saffron-light)', border: 'var(--saffron)', text: 'var(--saffron)' },
    turmeric: { bg: 'var(--turmeric-light)', border: 'var(--turmeric)', text: 'var(--turmeric)' },
    coriander: { bg: 'var(--coriander-light)', border: 'var(--coriander)', text: 'var(--coriander)' },
    mint: { bg: 'var(--mint-light)', border: 'var(--mint)', text: 'var(--mint)' },
  };

  const style = selected
    ? { backgroundColor: colors[color].bg, borderColor: colors[color].border, color: colors[color].text }
    : { backgroundColor: 'transparent', borderColor: 'var(--border-strong)', color: 'var(--muted)' };

  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={style}
      className="px-4 py-2 rounded-full text-sm font-medium border"
    >
      {children}
    </button>
  );
};

// Toggle component
const Toggle = ({ checked, onChange, testId }) => {
  return (
    <button
      data-testid={testId}
      onClick={() => onChange(!checked)}
      style={{
        width: '34px',
        height: '20px',
        borderRadius: '100px',
        backgroundColor: checked ? 'var(--mint)' : 'rgba(0,0,0,0.12)',
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '16px' : '2px',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
};

function SpinPage() {
  const [inventory, setInventory] = useState([]);
  
  // Q1 - Meal type
  const [selectedMealType, setSelectedMealType] = useState('Lunch');
  
  // Q2 - Time
  const [selectedTime, setSelectedTime] = useState('Under 20 min');
  
  // Q3 - Mood
  const [selectedMood, setSelectedMood] = useState('Light');
  
  // Sub-panels
  const [healthyToggles, setHealthyToggles] = useState({
    'Low oil / minimal ghee': true,
    'High protein': false,
    'Low carb / no refined flour': false,
    'Gut-friendly': false,
    'No added sugar': false,
  });
  
  const [fastingToggles, setFastingToggles] = useState({
    'No grains': false,
    'No onion / garlic': false,
    'No lentils / dal': false,
    'Rock salt only': false,
    'Fruits & milk only': false,
    'No meat / eggs': true,
  });
  
  // Q4 - Pantry items (from inventory)
  const [selectedPantryItems, setSelectedPantryItems] = useState([]);
  
  // Q5 - People count
  const [peopleCount, setPeopleCount] = useState(4);
  
  // Results
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [sideDish, setSideDish] = useState(null);
  const [showDeduction, setShowDeduction] = useState(false);
  const [deductionData, setDeductionData] = useState([]);
  const [loadingDeduction, setLoadingDeduction] = useState(false);
  
  useEffect(() => {
    loadInventory();
  }, []);
  
  const loadInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      const items = response.data;
      setInventory(items);
      
      // Select all items with qty > 0 by default
      const inStock = items.filter(item => item.qty > 0).map(item => item.name);
      setSelectedPantryItems(inStock);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      // Use localStorage fallback
      let inv = Storage.getInventory();
      if (!inv) {
        inv = defaultInventory;
        Storage.setInventory(inv);
        // Also sync to backend
        inv.forEach(async (item) => {
          await axios.post(`${API}/inventory`, item);
        });
      }
      setInventory(inv);
      const inStock = inv.filter(item => item.qty > 0).map(item => item.name);
      setSelectedPantryItems(inStock);
    }
  };
  
  const handleSpin = async () => {
    setLoading(true);
    setResult(null);
    setShowRecipe(false);
    setRecipe(null);
    setSideDish(null);
    
    try {
      const payload = {
        time: selectedTime,
        mood: selectedMood,
        healthy_toggles: selectedMood === 'Healthy' ? healthyToggles : null,
        fasting_toggles: selectedMood === 'Fasting' ? fastingToggles : null,
        ingredients: selectedPantryItems,
        people: peopleCount,
        meal_time: selectedMealType,
      };
      
      const response = await axios.post(`${API}/spin`, payload);
      setResult(response.data);
    } catch (err) {
      console.error('Spin error:', err);
      // Use fallback
      const fallbacks = [
        {dish: "Dal Tadka with Roti", time: "25 min", reason: "Classic, filling, and everything's already in your kitchen.", tags: ["Comfort food", "Under 30 min", "Crowd pleaser"], category: "dal"},
        {dish: "Aloo Paratha", time: "30 min", reason: "Flour and potatoes are there — this writes itself.", tags: ["Soul food", "Quick", "Weekend energy"], category: "roti"},
        {dish: "Poha", time: "15 min", reason: "The quickest breakfast that still feels like a proper meal.", tags: ["Super quick", "Light", "Easy cleanup"], category: "snack"}
      ];
      setResult(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFullRecipe = async () => {
    setLoadingRecipe(true);
    setShowRecipe(true);
    
    try {
      const response = await axios.post(`${API}/recipe`, {
        dish: result.dish,
        people: peopleCount,
      });
      setRecipe(response.data);
    } catch (err) {
      console.error('Recipe error:', err);
      setRecipe({
        ingredients: [{name: "Main ingredient", qty: "as needed"}, {name: "Spices", qty: "to taste"}],
        steps: ["Prepare ingredients", "Cook with spices", "Serve hot"],
        prep_time: "10 min",
        cook_time: "20 min",
        pro_tip: "Use fresh ingredients for best taste.",
        variation: "Add vegetables for extra nutrition."
      });
    } finally {
      setLoadingRecipe(false);
    }
  };
  
  const handleSideDish = async () => {
    try {
      const response = await axios.post(`${API}/side-dish`, {
        dish: result.dish,
      });
      setSideDish(response.data.suggestion);
    } catch (err) {
      setSideDish("Try with raita or a simple salad.");
    }
  };
  
  const handleUpdatePantry = async () => {
    setShowDeduction(true);
    setLoadingDeduction(true);
    
    try {
      const payload = {
        dish: result.dish,
        people: peopleCount,
        recipe_ingredients: recipe ? recipe.ingredients : null,
      };
      
      const response = await axios.post(`${API}/deduction-estimate`, payload);
      const estimates = response.data.ingredients;
      
      // Fuzzy match against inventory
      const matched = [];
      estimates.forEach(est => {
        const found = inventory.find(inv => 
          inv.name.toLowerCase().includes(est.name.toLowerCase()) || 
          est.name.toLowerCase().includes(inv.name.toLowerCase())
        );
        
        if (found) {
          matched.push({
            id: found.id,
            name: found.name,
            currentQty: found.qty,
            unit: found.unit,
            deduction: est.qty_used || 0,
            threshold: found.threshold,
          });
        }
      });
      
      setDeductionData(matched);
    } catch (err) {
      console.error('Deduction error:', err);
      setDeductionData([]);
    } finally {
      setLoadingDeduction(false);
    }
  };
  
  const confirmDeduction = async () => {
    try {
      const updates = [];
      const lowStock = [];
      const outOfStock = [];
      
      for (const item of deductionData) {
        const newQty = Math.max(0, item.currentQty - item.deduction);
        await axios.put(`${API}/inventory/${item.id}`, { qty: newQty });
        
        if (newQty === 0) {
          outOfStock.push(item.name);
        } else if (newQty <= item.threshold) {
          lowStock.push(item.name);
        }
      }
      
      // Show toast
      let toastMsg = `Pantry updated! ${deductionData.length} items deducted.`;
      let toastColor = 'var(--coriander-light)';
      
      if (outOfStock.length > 0) {
        toastMsg = `Pantry updated! Out of stock: ${outOfStock.join(', ')}.`;
        toastColor = 'var(--saffron-light)';
      } else if (lowStock.length > 0) {
        toastMsg = `Pantry updated! Low stock: ${lowStock.join(', ')}.`;
        toastColor = 'var(--turmeric-light)';
      }
      
      showToast(toastMsg, toastColor);
      setShowDeduction(false);
      loadInventory();
    } catch (err) {
      console.error('Confirm deduction error:', err);
    }
  };
  
  const showToast = (message, bgColor) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = 'toast-enter';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: var(--ink);
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      z-index: 1000;
      max-width: 90%;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.className = 'toast-exit';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 400);
    }, 3500);
  };
  
  const getCategoryColor = (category) => {
    const colors = {
      dal: '#D85A30',
      roti: '#D4870A',
      rice: '#3A7D44',
      sabzi: '#6B3FA0',
      snack: '#E8590C',
      sweet: '#D4870A',
      fasting: '#6B3FA0',
      healthy: '#1A7D6B',
    };
    return colors[category] || '#E8590C';
  };
  
  const pantryChips = inventory.filter(item => item.qty > 0);
  const fallbackPantry = ['Flour', 'Dal', 'Rice', 'Potato', 'Onion', 'Tomato'];
  const displayPantry = pantryChips.length > 0 ? pantryChips : fallbackPantry.map(name => ({ name }));
  
  return (
    <div className="max-content py-8" data-testid="spin-page">
      <div className="mb-6">
        <h1 className="playfair text-4xl sm:text-5xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          What to cook today?
        </h1>
        <p className="text-base" style={{ color: 'var(--muted)' }}>5 questions. One perfect answer.</p>
      </div>
      
      {/* Q1 - Meal type */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--subtle)' }}>
          What meal are you preparing?
        </label>
        <div className="flex flex-wrap gap-2">
          {['Breakfast', 'Morning snack', 'Lunch', 'Evening snack', 'Dinner'].map(meal => (
            <Chip
              key={meal}
              testId={`meal-chip-${meal}`}
              selected={selectedMealType === meal}
              onClick={() => setSelectedMealType(meal)}
              color="saffron"
            >
              {meal}
            </Chip>
          ))}
        </div>
      </div>
      
      {/* Q2 - Time */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--subtle)' }}>
          How much time do you have?
        </label>
        <div className="flex flex-wrap gap-2">
          {['Under 20 min', '20–40 min', '1+ hour'].map(time => (
            <Chip
              key={time}
              testId={`time-chip-${time}`}
              selected={selectedTime === time}
              onClick={() => setSelectedTime(time)}
              color="saffron"
            >
              {time}
            </Chip>
          ))}
        </div>
      </div>
      
      {/* Q3 - Mood */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--subtle)' }}>
          What's your mood?
        </label>
        <div className="flex flex-wrap gap-2">
          {['Light', 'Comfort food', 'Something special', 'Festive', 'Healthy', 'Fasting'].map(mood => (
            <Chip
              key={mood}
              testId={`mood-chip-${mood}`}
              selected={selectedMood === mood}
              onClick={() => setSelectedMood(mood)}
              color="turmeric"
            >
              {mood}
            </Chip>
          ))}
        </div>
        
        {/* Healthy sub-panel */}
        {selectedMood === 'Healthy' && (
          <div className="mt-4 p-4 rounded-xl slide-up" style={{ backgroundColor: 'var(--mint-light)', border: '1px solid rgba(26,125,107,0.2)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--mint)' }}>
              What does healthy mean today?
            </label>
            {Object.entries(healthyToggles).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{key}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {key === 'Low oil / minimal ghee' && 'Less than 1 tsp oil total'}
                    {key === 'High protein' && 'Dal, paneer, eggs, sprouts'}
                    {key === 'Low carb / no refined flour' && 'Avoid rice, roti, maida'}
                    {key === 'Gut-friendly' && 'Khichdi, oats, moong, curd-based'}
                    {key === 'No added sugar' && 'Strictly savoury, no jaggery'}
                  </div>
                </div>
                <Toggle
                  testId={`healthy-toggle-${key}`}
                  checked={value}
                  onChange={(v) => setHealthyToggles({ ...healthyToggles, [key]: v })}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Fasting sub-panel */}
        {selectedMood === 'Fasting' && (
          <div className="mt-4 p-4 rounded-xl slide-up" style={{ backgroundColor: 'var(--cardamom-light)', border: '1px solid rgba(107,63,160,0.2)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--cardamom)' }}>
              Your fasting restrictions
            </label>
            {Object.entries(fastingToggles).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{key}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {key === 'No grains' && 'Ekadashi, Jain, most Hindu fasts'}
                    {key === 'No onion / garlic' && 'Navratri, Jain, Satvik'}
                    {key === 'No lentils / dal' && 'Ekadashi, certain Jain fasts'}
                    {key === 'Rock salt only' && 'Hindu fasts — no table salt'}
                    {key === 'Fruits & milk only' && 'Nirjala Ekadashi, strict fasts'}
                    {key === 'No meat / eggs' && 'Friday fast, Shravan, Ramadan'}
                  </div>
                </div>
                <Toggle
                  testId={`fasting-toggle-${key}`}
                  checked={value}
                  onChange={(v) => setFastingToggles({ ...fastingToggles, [key]: v })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Q4 - Pantry */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--subtle)' }}>
            What's at home?
          </label>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--coriander-light)', color: 'var(--coriander)' }}>
            from your inventory
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {displayPantry.map((item, idx) => (
            <Chip
              key={item.name || idx}
              testId={`pantry-chip-${item.name}`}
              selected={selectedPantryItems.includes(item.name)}
              onClick={() => {
                if (selectedPantryItems.includes(item.name)) {
                  setSelectedPantryItems(selectedPantryItems.filter(p => p !== item.name));
                } else {
                  setSelectedPantryItems([...selectedPantryItems, item.name]);
                }
              }}
              color="coriander"
            >
              {item.name}
            </Chip>
          ))}
        </div>
      </div>
      
      {/* Q5 - People */}
      <div className="mb-8">
        <label className="block text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--subtle)' }}>
          How many people?
        </label>
        <div className="flex items-center gap-3">
          <button
            data-testid="people-decrease"
            onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
            className="w-10 h-10 rounded-full text-lg font-bold"
            style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)', color: 'var(--ink)' }}
          >
            −
          </button>
          <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{peopleCount}</span>
          <button
            data-testid="people-increase"
            onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))}
            className="w-10 h-10 rounded-full text-lg font-bold"
            style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)', color: 'var(--ink)' }}
          >
            +
          </button>
          <span className="text-sm" style={{ color: 'var(--subtle)' }}>people</span>
        </div>
      </div>
      
      {/* Spin button */}
      <button
        data-testid="spin-button"
        onClick={handleSpin}
        disabled={loading}
        className="w-full py-3 rounded-xl text-base font-semibold"
        style={{ backgroundColor: 'var(--saffron)', color: 'white' }}
      >
        {loading ? 'Spinning...' : 'Spin the roulette'}
      </button>
      
      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 p-5 rounded-2xl" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
          <div className="shimmer h-6 rounded mb-3" />
          <div className="shimmer h-4 rounded mb-2" />
          <div className="shimmer h-4 rounded w-3/4" />
        </div>
      )}
      
      {/* Result card */}
      {result && !loading && (
        <div data-testid="result-card" className="mt-6 rounded-2xl overflow-hidden slide-up" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
          <div style={{ height: '5px', backgroundColor: getCategoryColor(result.category) }} />
          <div className="p-5">
            <h2 className="playfair text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>{result.dish}</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
              {result.time} · {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
              {result.reason}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {result.tags && result.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--coriander-light)', color: 'var(--coriander)', border: '1px solid var(--coriander)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                data-testid="full-recipe-button"
                onClick={handleFullRecipe}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)', border: '1px solid var(--saffron)' }}
              >
                Full recipe
              </button>
              <button
                data-testid="try-another-button"
                onClick={handleSpin}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
              >
                Try another
              </button>
              <button
                data-testid="side-dish-button"
                onClick={handleSideDish}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
              >
                {sideDish || 'Side dish?'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recipe view */}
      {showRecipe && (
        <div data-testid="recipe-view" className="mt-6 p-5 rounded-2xl slide-up" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
          <button
            data-testid="back-to-result"
            onClick={() => setShowRecipe(false)}
            className="mb-4 text-sm font-medium"
            style={{ color: 'var(--saffron)' }}
          >
            ← Back
          </button>
          
          {loadingRecipe ? (
            <div>
              <div className="shimmer h-6 rounded mb-4" />
              <div className="shimmer h-20 rounded mb-4" />
              <div className="shimmer h-32 rounded" />
            </div>
          ) : recipe ? (
            <div>
              <h3 className="playfair text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>{result.dish}</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>
                Prep: {recipe.prep_time} · Cook: {recipe.cook_time}
              </p>
              
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>Ingredients</h4>
              <div className="mb-4">
                {recipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex justify-between py-1 text-sm">
                    <span style={{ color: 'var(--muted)' }}>{ing.name}</span>
                    <span className="font-semibold" style={{ color: 'var(--muted)' }}>{ing.qty}</span>
                  </div>
                ))}
              </div>
              
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>Method</h4>
              <div className="mb-4">
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 mb-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)' }}>
                      {idx + 1}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>{step}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'var(--turmeric-light)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--turmeric)' }}>Pro tip: {recipe.pro_tip}</p>
              </div>
              
              <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--coriander-light)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--coriander)' }}>Try a variation: {recipe.variation}</p>
              </div>
              
              <button
                data-testid="update-pantry-button"
                onClick={handleUpdatePantry}
                className="w-full py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--coriander-light)', color: 'var(--coriander)', border: '1px solid var(--coriander)' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--coriander)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'var(--coriander-light)';
                  e.target.style.color = 'var(--coriander)';
                }}
              >
                Done cooking — update pantry
              </button>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Deduction sheet */}
      {showDeduction && (
        <div
          data-testid="deduction-sheet"
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(26,18,8,0.5)' }}
          onClick={() => setShowDeduction(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-auto slide-up"
            style={{ backgroundColor: 'var(--cream)', borderRadius: '20px 20px 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="playfair text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>Update your pantry</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>What did you use for {result.dish}? Edit any amount, then confirm.</p>
              
              {loadingDeduction ? (
                <div>
                  <div className="shimmer h-16 rounded mb-2" />
                  <div className="shimmer h-16 rounded mb-2" />
                  <div className="shimmer h-16 rounded" />
                </div>
              ) : (
                <div>
                  {deductionData.map((item) => {
                    const afterQty = item.currentQty - item.deduction;
                    const willBeOut = afterQty <= 0;
                    const willBeLow = afterQty > 0 && afterQty <= item.threshold;
                    
                    return (
                      <div key={item.id} className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border)' }}>
                        <div className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>{item.name}</div>
                        <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                          Currently: {item.currentQty}{item.unit} · After: {Math.max(0, afterQty)}{item.unit}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.deduction}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              setDeductionData(deductionData.map(d => d.id === item.id ? { ...d, deduction: newVal } : d));
                            }}
                            className="w-20 px-2 py-1 text-sm text-right rounded"
                            style={{ border: '1px solid var(--border-strong)' }}
                          />
                          <span className="text-sm" style={{ color: 'var(--muted)' }}>{item.unit}</span>
                        </div>
                        {willBeOut && (
                          <div className="mt-2 text-xs font-medium" style={{ color: 'var(--saffron)' }}>
                            Will be out of stock
                          </div>
                        )}
                        {willBeLow && (
                          <div className="mt-2 text-xs font-medium" style={{ color: 'var(--turmeric)' }}>
                            Will go below your alert threshold ({item.threshold}{item.unit})
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2 mt-6">
                    <button
                      data-testid="deduction-cancel"
                      onClick={() => setShowDeduction(false)}
                      className="flex-1 py-3 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
                    >
                      Cancel
                    </button>
                    <button
                      data-testid="deduction-confirm"
                      onClick={confirmDeduction}
                      className="flex-1 py-3 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: 'var(--coriander)', color: 'white' }}
                    >
                      Confirm & update pantry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpinPage;
