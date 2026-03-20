import React, { useState, useEffect } from 'react';
import { Storage } from '../utils/storage';

function BookmarkButton({ dish, testId }) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(Storage.isFavourite(dish.id));
  }, [dish.id]);

  const toggleBookmark = (e) => {
    e.stopPropagation();
    
    if (isFav) {
      Storage.removeFavourite(dish.id);
      setIsFav(false);
    } else {
      Storage.addFavourite(dish);
      setIsFav(true);
    }
  };

  return (
    <button
      data-testid={testId}
      onClick={toggleBookmark}
      className="p-2"
      style={{ color: isFav ? 'var(--saffron)' : 'var(--subtle)' }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={isFav ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}

export default BookmarkButton;
