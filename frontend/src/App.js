import React, { useState } from 'react';
import './App.css';
import SpinPage from './pages/SpinPage';
import RecipesPage from './pages/RecipesPage';
import InventoryPage from './pages/InventoryPage';
import AuthModal from './components/AuthModal';

function App() {
  const [currentPage, setCurrentPage] = useState('Spin');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('wc-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wc-user');
    localStorage.removeItem('wc-token');
  };

  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem('wc-user', JSON.stringify(userData));
    localStorage.setItem('wc-token', token);
    setShowAuthModal(false);
  };

  return (
    <div className="App">
      {/* Navigation */}
      <nav
        className="sticky top-0 z-40 max-content py-5 flex items-center gap-6 mb-4"
        style={{ backgroundColor: 'var(--cream)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="playfair text-xl font-bold mr-auto" style={{ color: 'var(--saffron)' }}>
          What's Cooking?
        </h1>
        {['Spin', 'Recipes', 'Inventory'].map(page => (
          <button
            key={page}
            data-testid={`nav-${page.toLowerCase()}`}
            onClick={() => setCurrentPage(page)}
            className="text-sm font-medium pb-1"
            style={{
              color: currentPage === page ? 'var(--saffron)' : 'var(--muted)',
              borderBottom: currentPage === page ? '2px solid var(--saffron)' : '2px solid transparent',
            }}
          >
            {page}
          </button>
        ))}
        
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Hi, {user.name}</span>
            <button
              data-testid="logout-button"
              onClick={handleLogout}
              className="text-sm font-medium"
              style={{ color: 'var(--saffron)' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            data-testid="login-button"
            onClick={() => setShowAuthModal(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)', border: '1px solid var(--saffron)' }}
          >
            Login
          </button>
        )}
      </nav>

      {/* Page content */}
      {currentPage === 'Spin' && <SpinPage />}
      {currentPage === 'Recipes' && <RecipesPage />}
      {currentPage === 'Inventory' && <InventoryPage />}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export default App;
