import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Storage } from '../utils/storage';
import BookmarkButton from '../components/BookmarkButton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Chip = ({ children, selected, onClick, color = 'mint', testId }) => {
  const colors = {
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
      className="px-3 py-1.5 rounded-full text-xs font-medium border"
    >
      {children}
    </button>
  );
};

function RecipesPage() {
  const [preferences, setPreferences] = useState({
    diet: 'Vegetarian',
    health_goal: 'No goal',
    spice_level: 'Medium',
  });
  
  const [inventory, setInventory] = useState([]);
  const [breakfastSuggestions, setBreakfastSuggestions] = useState([]);
  const [lunchSuggestions, setLunchSuggestions] = useState([]);
  const [dinnerSuggestions, setDinnerSuggestions] = useState([]);
  
  const [loadingBreakfast, setLoadingBreakfast] = useState(false);
  const [loadingLunch, setLoadingLunch] = useState(false);
  const [loadingDinner, setLoadingDinner] = useState(false);
  
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  
  useEffect(() => {
    loadPreferences();
    loadInventory();
  }, []);
  
  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/preferences`);
      setPreferences(response.data);
    } catch (err) {
      const localPrefs = Storage.getPrefs();
      if (localPrefs) setPreferences(localPrefs);
    }
  };
  
  const loadInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      setInventory(response.data);
    } catch (err) {
      const localInv = Storage.getInventory();
      if (localInv) setInventory(localInv);
    }
  };
  
  const savePreferences = async (newPrefs) => {
    setPreferences(newPrefs);
    try {
      await axios.post(`${API}/preferences`, newPrefs);
      Storage.setPrefs(newPrefs);
    } catch (err) {
      Storage.setPrefs(newPrefs);
    }
  };
  
  const generateMealSuggestions = async (mealType) => {
    const setLoading = mealType === 'Breakfast' ? setLoadingBreakfast : mealType === 'Lunch' ? setLoadingLunch : setLoadingDinner;
    const setSuggestions = mealType === 'Breakfast' ? setBreakfastSuggestions : mealType === 'Lunch' ? setLunchSuggestions : setDinnerSuggestions;
    
    setLoading(true);
    
    try {
      const inStock = inventory.filter(item => item.qty > 0).map(item => item.name);
      const response = await axios.post(`${API}/meal-suggestions`, {
        meal_type: mealType,
        diet: preferences.diet,
        health_goal: preferences.health_goal,
        spice_level: preferences.spice_level,
        available_ingredients: inStock,
      });
      const suggestions = response.data.suggestions.map((s, idx) => ({
        ...s,
        id: Date.now() + idx,
      }));
      setSuggestions(suggestions);
    } catch (err) {
      console.error('Meal suggestions error:', err);
      // Use fallback
      const fallbacks = {
        Breakfast: [{name: "Poha", time: "15 min", tags: ["Quick", "Light"], category: "snack", why: "Fast and energizing morning meal"}, {name: "Upma", time: "20 min", tags: ["Filling", "Healthy"], category: "snack", why: "Nutritious and keeps you full"}, {name: "Aloo Paratha", time: "30 min", tags: ["Comfort", "Filling"], category: "roti", why: "Satisfying breakfast for busy mornings"}, {name: "Oats Dal", time: "20 min", tags: ["Healthy", "Protein"], category: "dal", why: "High protein savory breakfast"}],
        Lunch: [{name: "Dal Chawal", time: "25 min", tags: ["Comfort", "Complete"], category: "dal", why: "Classic balanced lunch combo"}, {name: "Roti Sabzi", time: "20 min", tags: ["Light", "Nutritious"], category: "roti", why: "Simple wholesome lunch"}, {name: "Rajma", time: "40 min", tags: ["Protein", "Filling"], category: "dal", why: "Protein-rich satisfying meal"}, {name: "Pulao", time: "30 min", tags: ["One-pot", "Flavorful"], category: "rice", why: "Easy one-pot complete meal"}],
        Dinner: [{name: "Khichdi", time: "20 min", tags: ["Light", "Comfort"], category: "rice", why: "Light and easy to digest"}, {name: "Palak Paneer", time: "30 min", tags: ["Protein", "Nutritious"], category: "sabzi", why: "Nutritious protein-rich dinner"}, {name: "Moong Dal", time: "20 min", tags: ["Light", "Protein"], category: "dal", why: "Easy protein-packed dinner"}, {name: "Vegetable Dalia", time: "25 min", tags: ["Healthy", "Fiber"], category: "healthy", why: "Fiber-rich healthy dinner option"}]
      };
      const fallbackData = fallbacks[mealType] || fallbacks["Lunch"];
      setSuggestions(fallbackData.map((s, idx) => ({ ...s, id: Date.now() + idx })));
    } finally {
      setLoading(false);
    }
  };
  
  const openRecipe = async (dish) => {
    setSelectedRecipe(dish);
    setLoadingRecipe(true);
    
    try {
      const response = await axios.post(`${API}/recipe`, {
        dish: dish.name,
        people: 4,
      });
      setRecipeDetails(response.data);
    } catch (err) {
      setRecipeDetails({
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
  
  const RecipeMiniCard = ({ dish, onClick }) => {
    return (
      <div className="relative">
        <button
          data-testid={`recipe-card-${dish.name}`}
          onClick={onClick}
          className="w-full text-left rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}
        >
          <div style={{ height: '4px', backgroundColor: getCategoryColor(dish.category) }} />
          <div className="p-3">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-bold mb-1 flex-1" style={{ color: 'var(--ink)' }}>{dish.name}</h4>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
              {dish.time} · {dish.why}
            </p>
            <div className="flex flex-wrap gap-1">
              {dish.tags && dish.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--coriander-light)', color: 'var(--coriander)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </button>
        <div className="absolute top-2 right-2">
          <BookmarkButton dish={{ id: dish.id, name: dish.name, category: dish.category, time: dish.time }} testId={`bookmark-recipe-${dish.name}`} />
        </div>
      </div>
    );
  };
  
  return (
    <div className="max-content py-8" data-testid="recipes-page">
      <div className="mb-6">
        <h1 className="playfair text-4xl sm:text-5xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Recipes
        </h1>
        <p className="text-base" style={{ color: 'var(--muted)' }}>Personalised meal ideas just for you</p>
      </div>
      
      {/* Preferences bar */}
      <div className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--subtle)' }}>Diet</label>
          <div className="flex flex-wrap gap-2">
            {['Vegetarian', 'Vegan', 'Jain', 'Non-veg ok'].map(diet => (
              <Chip
                key={diet}
                testId={`diet-${diet}`}
                selected={preferences.diet === diet}
                onClick={() => savePreferences({ ...preferences, diet })}
              >
                {diet}
              </Chip>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--subtle)' }}>Health goal</label>
          <div className="flex flex-wrap gap-2">
            {['Weight loss', 'High protein', 'Gut health', 'No goal'].map(goal => (
              <Chip
                key={goal}
                testId={`goal-${goal}`}
                selected={preferences.health_goal === goal}
                onClick={() => savePreferences({ ...preferences, health_goal: goal })}
              >
                {goal}
              </Chip>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--subtle)' }}>Spice level</label>
          <div className="flex flex-wrap gap-2">
            {['Mild', 'Medium', 'Spicy'].map(spice => (
              <Chip
                key={spice}
                testId={`spice-${spice}`}
                selected={preferences.spice_level === spice}
                onClick={() => savePreferences({ ...preferences, spice_level: spice })}
              >
                {spice}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      
      {/* Meal sections */}
      {[{ name: 'Breakfast', time: '6am–10am', suggestions: breakfastSuggestions, loading: loadingBreakfast, generate: () => generateMealSuggestions('Breakfast') },
        { name: 'Lunch', time: '12pm–3pm', suggestions: lunchSuggestions, loading: loadingLunch, generate: () => generateMealSuggestions('Lunch') },
        { name: 'Dinner', time: '7pm–10pm', suggestions: dinnerSuggestions, loading: loadingDinner, generate: () => generateMealSuggestions('Dinner') }].map(meal => (
        <div key={meal.name} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="playfair text-2xl font-bold" style={{ color: 'var(--ink)' }}>{meal.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)' }}>
                {meal.time}
              </span>
            </div>
          </div>
          
          <button
            data-testid={`generate-${meal.name.toLowerCase()}`}
            onClick={meal.generate}
            disabled={meal.loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold mb-4"
            style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)', border: '1px solid var(--saffron)' }}
          >
            {meal.loading ? 'Generating...' : meal.suggestions.length > 0 ? `Regenerate ${meal.name.toLowerCase()} ideas` : `Generate ${meal.name.toLowerCase()} ideas`}
          </button>
          
          {meal.loading && (
            <div className="grid grid-cols-2 gap-3">
              <div className="shimmer h-32 rounded-2xl" />
              <div className="shimmer h-32 rounded-2xl" />
              <div className="shimmer h-32 rounded-2xl" />
              <div className="shimmer h-32 rounded-2xl" />
            </div>
          )}
          
          {!meal.loading && meal.suggestions.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {meal.suggestions.map((dish, idx) => (
                <RecipeMiniCard key={idx} dish={dish} onClick={() => openRecipe(dish)} />
              ))}
            </div>
          )}
          
          {/* Recipe detail view */}
          {selectedRecipe && selectedRecipe.name && meal.suggestions.some(s => s.name === selectedRecipe.name) && (
            <div data-testid="recipe-detail" className="mt-4 p-5 rounded-2xl slide-up" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
              <button
                data-testid="close-recipe-detail"
                onClick={() => setSelectedRecipe(null)}
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
              ) : recipeDetails ? (
                <div>
                  <h3 className="playfair text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>{selectedRecipe.name}</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>
                    Prep: {recipeDetails.prep_time} · Cook: {recipeDetails.cook_time}
                  </p>
                  
                  <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>Ingredients</h4>
                  <div className="mb-4">
                    {recipeDetails.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between py-1 text-sm">
                        <span style={{ color: 'var(--muted)' }}>{ing.name}</span>
                        <span className="font-semibold" style={{ color: 'var(--muted)' }}>{ing.qty}</span>
                      </div>
                    ))}
                  </div>
                  
                  <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>Method</h4>
                  <div className="mb-4">
                    {recipeDetails.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 mb-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)' }}>
                          {idx + 1}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>{step}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'var(--turmeric-light)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--turmeric)' }}>Pro tip: {recipeDetails.pro_tip}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--coriander-light)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--coriander)' }}>Try a variation: {recipeDetails.variation}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default RecipesPage;
