// Storage abstraction layer for localStorage
// Can be swapped for Supabase/Firebase later

export const Storage = {
  getInventory: () => {
    const data = localStorage.getItem('wc-inventory');
    return data ? JSON.parse(data) : null;
  },
  
  setInventory: (data) => {
    localStorage.setItem('wc-inventory', JSON.stringify(data));
  },
  
  getPrefs: () => {
    const data = localStorage.getItem('wc-prefs');
    return data ? JSON.parse(data) : null;
  },
  
  setPrefs: (data) => {
    localStorage.setItem('wc-prefs', JSON.stringify(data));
  },
  
  getFavourites: () => {
    const data = localStorage.getItem('wc-favourites');
    return data ? JSON.parse(data) : [];
  },
  
  setFavourites: (data) => {
    localStorage.setItem('wc-favourites', JSON.stringify(data));
  },
  
  addFavourite: (dish) => {
    const favs = Storage.getFavourites();
    if (!favs.find(f => f.id === dish.id)) {
      favs.push(dish);
      Storage.setFavourites(favs);
    }
  },
  
  removeFavourite: (dishId) => {
    const favs = Storage.getFavourites();
    const filtered = favs.filter(f => f.id !== dishId);
    Storage.setFavourites(filtered);
  },
  
  isFavourite: (dishId) => {
    const favs = Storage.getFavourites();
    return favs.some(f => f.id === dishId);
  },
};
