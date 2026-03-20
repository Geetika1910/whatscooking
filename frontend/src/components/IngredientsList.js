import React from 'react';

// Fuzzy match ingredient name against inventory
function fuzzyMatchIngredient(ingredientName, inventory) {
  const lowerName = ingredientName.toLowerCase();
  
  return inventory.find(item => {
    const lowerItemName = item.name.toLowerCase();
    // Check if names match or contain each other
    return lowerItemName.includes(lowerName) || 
           lowerName.includes(lowerItemName) ||
           lowerItemName === lowerName;
  });
}

function IngredientsList({ ingredients, inventory }) {
  // Split ingredients into two groups
  const inPantry = [];
  const needToBuy = [];
  
  ingredients.forEach(ing => {
    const matched = fuzzyMatchIngredient(ing.name, inventory);
    
    if (matched && matched.qty > 0) {
      inPantry.push({ ...ing, matched: true });
    } else {
      needToBuy.push({ ...ing, matched: false });
    }
  });
  
  return (
    <div>
      {inPantry.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            In your pantry
            {needToBuy.length === 0 && (
              <span className="text-xs font-normal" style={{ color: 'var(--coriander)' }}>
                — You have everything you need!
              </span>
            )}
          </h4>
          {inPantry.map((ing, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--coriander)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span style={{ color: 'var(--muted)' }}>{ing.name}</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>{ing.qty}</span>
            </div>
          ))}
        </div>
      )}
      
      {needToBuy.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>
            You'll need to buy
          </h4>
          {needToBuy.map((ing, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--saffron)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span style={{ color: 'var(--muted)' }}>{ing.name}</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>{ing.qty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IngredientsList;
