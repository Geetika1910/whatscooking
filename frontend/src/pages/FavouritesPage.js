import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Storage } from '../utils/storage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function FavouritesPage() {
  const [favourites, setFavourites] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  useEffect(() => {
    loadFavourites();
  }, []);

  const loadFavourites = () => {
    const favs = Storage.getFavourites();
    setFavourites(favs || []);
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
        ingredients: [{ name: "Main ingredient", qty: "as needed" }, { name: "Spices", qty: "to taste" }],
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
      <button
        data-testid={`favourite-card-${dish.name}`}
        onClick={onClick}
        className="w-full text-left rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}
      >
        <div style={{ height: '4px', backgroundColor: getCategoryColor(dish.category) }} />
        <div className="p-3">
          <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>{dish.name}</h4>
          {dish.time && (
            <p className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
              {dish.time}
            </p>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="max-content py-8" data-testid="favourites-page">
      <div className="mb-6">
        <h1 className="playfair text-4xl sm:text-5xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Favourites
        </h1>
        <p className="text-base" style={{ color: 'var(--muted)' }}>Your saved dishes</p>
      </div>

      {favourites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-base" style={{ color: 'var(--muted)' }}>
            Nothing saved yet. Bookmark a dish from Spin or Recipes to find it here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {favourites.map((dish, idx) => (
              <RecipeMiniCard key={dish.id || idx} dish={dish} onClick={() => openRecipe(dish)} />
            ))}
          </div>

          {/* Recipe detail view */}
          {selectedRecipe && (
            <div data-testid="favourite-recipe-detail" className="mt-4 p-5 rounded-2xl slide-up" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
              <button
                data-testid="close-favourite-recipe"
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
        </>
      )}
    </div>
  );
}

export default FavouritesPage;
