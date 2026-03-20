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
};
