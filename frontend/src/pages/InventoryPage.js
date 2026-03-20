import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Storage } from '../utils/storage';
import { defaultInventory } from '../utils/defaultInventory';
import { statusOf, getStatusColor, getStatusBg, getStatusLabel } from '../utils/itemStatus';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingQty, setEditingQty] = useState(null);
  
  // Add/Edit form state
  const [formData, setFormData] = useState({
    name: '',
    cat: 'Dals',
    qty: 0,
    unit: 'g',
    threshold: 0,
    expiry: '',
  });
  
  const [thresholdTouched, setThresholdTouched] = useState(false);
  
  useEffect(() => {
    loadInventory();
  }, []);
  
  const loadInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      let items = response.data;
      
      if (items.length === 0) {
        // Seed default inventory
        for (const item of defaultInventory) {
          await axios.post(`${API}/inventory`, item);
        }
        items = defaultInventory;
      }
      
      setInventory(items);
      Storage.setInventory(items);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      let inv = Storage.getInventory();
      if (!inv || inv.length === 0) {
        inv = defaultInventory;
        Storage.setInventory(inv);
      }
      setInventory(inv);
    }
  };
  
  const autoSuggestThreshold = (cat, qty) => {
    if (thresholdTouched) return formData.threshold;
    
    const qtyNum = parseFloat(qty) || 0;
    switch (cat) {
      case 'Dals':
      case 'Grains':
      case 'Dry Staples':
        return Math.round(qtyNum * 0.2);
      case 'Vegetables':
        return 2;
      case 'Dairy':
        return 100;
      case 'Spices':
        return 20;
      default:
        return Math.round(qtyNum * 0.15);
    }
  };
  
  const handleAddItem = async () => {
    try {
      const response = await axios.post(`${API}/inventory`, formData);
      await loadInventory();
      setShowAddSheet(false);
      resetForm();
    } catch (err) {
      console.error('Add item error:', err);
    }
  };
  
  const handleEditItem = async () => {
    try {
      await axios.put(`${API}/inventory/${editingItem.id}`, formData);
      await loadInventory();
      setShowEditSheet(false);
      setEditingItem(null);
      resetForm();
    } catch (err) {
      console.error('Edit item error:', err);
    }
  };
  
  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API}/inventory/${id}`);
      await loadInventory();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };
  
  const handleInlineQtyUpdate = async (item, newQty) => {
    try {
      await axios.put(`${API}/inventory/${item.id}`, { qty: newQty });
      await loadInventory();
      setEditingQty(null);
    } catch (err) {
      console.error('Qty update error:', err);
    }
  };
  
  const openAddSheet = () => {
    resetForm();
    setShowAddSheet(true);
  };
  
  const openEditSheet = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      cat: item.cat,
      qty: item.qty,
      unit: item.unit,
      threshold: item.threshold,
      expiry: item.expiry || '',
    });
    setThresholdTouched(false);
    setShowEditSheet(true);
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      cat: 'Dals',
      qty: 0,
      unit: 'g',
      threshold: 0,
      expiry: '',
    });
    setThresholdTouched(false);
  };
  
  // Stats
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => statusOf(item) === 'low').length;
  const expiringItems = inventory.filter(item => statusOf(item) === 'expiring').length;
  
  // Alert banners
  const expiringList = inventory.filter(item => statusOf(item) === 'expiring').map(i => i.name);
  const lowStockList = inventory.filter(item => statusOf(item) === 'low').map(i => i.name);
  
  // Group by category
  const categories = ['Dals', 'Grains', 'Vegetables', 'Dairy', 'Dry Staples', 'Spices', 'Snacks', 'Other'];
  const groupedInventory = categories.map(cat => ({
    category: cat,
    items: inventory.filter(item => item.cat === cat),
  })).filter(group => group.items.length > 0);
  
  return (
    <div className="max-content py-8" data-testid="inventory-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="playfair text-4xl sm:text-5xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Kitchen Inventory
          </h1>
          <p className="text-base" style={{ color: 'var(--muted)' }}>Track what's at home</p>
        </div>
        <button
          data-testid="add-item-button"
          onClick={openAddSheet}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--saffron)', color: 'white' }}
        >
          + Add item
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>{totalItems}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Total items</div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--turmeric)' }}>{lowStockItems}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Low stock</div>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--saffron)' }}>{expiringItems}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Expiring soon</div>
        </div>
      </div>
      
      {/* Alert banners */}
      {expiringList.length > 0 && (
        <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--saffron-light)', border: '1px solid var(--saffron)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--saffron)' }}>
            <strong>Expiring soon:</strong> {expiringList.join(', ')} — use these first!
          </p>
        </div>
      )}
      
      {lowStockList.length > 0 && (
        <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--turmeric-light)', border: '1px solid var(--turmeric)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--turmeric)' }}>
            <strong>Low stock:</strong> {lowStockList.join(', ')} — consider restocking.
          </p>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex gap-4 mb-6 text-xs" style={{ color: 'var(--muted)' }}>
        <div className="flex items-center gap-1">
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: 'var(--coriander)' }} />
          In stock
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: 'var(--turmeric)' }} />
          Low stock
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: 'var(--saffron)' }} />
          Expiring soon
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: 'var(--subtle)' }} />
          Out of stock
        </div>
      </div>
      
      {/* Inventory list */}
      {groupedInventory.map(group => (
        <div key={group.category} className="mb-6">
          <h3 className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--subtle)' }}>
            {group.category}
          </h3>
          {group.items.map(item => {
            const status = statusOf(item);
            const isDeleting = deleteConfirm === item.id;
            
            if (isDeleting) {
              return (
                <div key={item.id} className="p-4 rounded-xl mb-3 flex items-center justify-between" style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--border-strong)' }}>
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>Delete {item.name}?</span>
                  <div className="flex gap-2">
                    <button
                      data-testid={`delete-cancel-${item.id}`}
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
                    >
                      Cancel
                    </button>
                    <button
                      data-testid={`delete-confirm-${item.id}`}
                      onClick={() => handleDeleteItem(item.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'var(--saffron)', color: 'white' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }
            
            return (
              <div
                key={item.id}
                data-testid={`inventory-item-${item.id}`}
                className="p-4 rounded-xl mb-3"
                style={{
                  backgroundColor: getStatusBg(status),
                  border: `1px solid ${status === 'low' ? 'var(--turmeric)' : status === 'expiring' ? 'var(--saffron)' : 'var(--border-strong)'}`,
                  opacity: status === 'out' ? 0.52 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: getStatusColor(status), marginTop: '5px', flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{item.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--paper)', color: getStatusColor(status) }}>
                          {getStatusLabel(status)}
                        </span>
                        <button
                          data-testid={`edit-item-${item.id}`}
                          onClick={() => openEditSheet(item)}
                          className="text-xs font-medium"
                          style={{ color: 'var(--saffron)' }}
                        >
                          Edit
                        </button>
                        <button
                          data-testid={`delete-item-${item.id}`}
                          onClick={() => setDeleteConfirm(item.id)}
                          className="text-xs font-medium"
                          style={{ color: 'var(--saffron)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>
                      {editingQty === item.id ? (
                        <input
                          type="number"
                          autoFocus
                          defaultValue={item.qty}
                          onBlur={(e) => {
                            const newQty = parseFloat(e.target.value) || 0;
                            handleInlineQtyUpdate(item, newQty);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newQty = parseFloat(e.target.value) || 0;
                              handleInlineQtyUpdate(item, newQty);
                            } else if (e.key === 'Escape') {
                              setEditingQty(null);
                            }
                          }}
                          className="w-20 px-2 py-0.5 text-xs rounded"
                          style={{ border: '1px dashed var(--border-strong)' }}
                        />
                      ) : (
                        <button
                          data-testid={`qty-edit-${item.id}`}
                          onClick={() => setEditingQty(item.id)}
                          style={{ borderBottom: '1px dashed var(--border-strong)', cursor: 'pointer' }}
                        >
                          {item.qty}{item.unit}
                        </button>
                      )}
                      {' '} · alert &lt;{item.threshold}{item.unit}
                      {item.expiry && ` · Exp ${item.expiry}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      
      {/* Add item sheet */}
      {showAddSheet && (
        <div
          data-testid="add-item-sheet"
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(26,18,8,0.5)' }}
          onClick={() => setShowAddSheet(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-auto slide-up"
            style={{ backgroundColor: 'var(--cream)', borderRadius: '20px 20px 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="playfair text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Add item</h3>
              
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Item name</label>
                <input
                  data-testid="add-item-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid var(--border-strong)' }}
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Category</label>
                <select
                  data-testid="add-item-category"
                  value={formData.cat}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setFormData({ ...formData, cat: newCat, threshold: autoSuggestThreshold(newCat, formData.qty) });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid var(--border-strong)' }}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Quantity</label>
                  <input
                    data-testid="add-item-qty"
                    type="number"
                    value={formData.qty}
                    onChange={(e) => {
                      const newQty = e.target.value;
                      setFormData({ ...formData, qty: parseFloat(newQty) || 0, threshold: autoSuggestThreshold(formData.cat, newQty) });
                    }}
                    className="w-full px-2 py-2 text-sm rounded-lg"
                    style={{ border: '1px solid var(--border-strong)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Unit</label>
                  <select
                    data-testid="add-item-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-2 py-2 text-sm rounded-lg"
                    style={{ border: '1px solid var(--border-strong)' }}
                  >
                    {['g', 'kg', 'ml', 'L', 'pcs', 'tbsp'].map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Alert below</label>
                  <input
                    data-testid="add-item-threshold"
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => {
                      setThresholdTouched(true);
                      setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 });
                    }}
                    className="w-full px-2 py-2 text-sm rounded-lg"
                    style={{ border: '1px solid var(--border-strong)' }}
                  />
                </div>
              </div>
              
              <div className="text-xs mb-3" style={{ color: 'var(--mint)' }}>
                Suggested threshold: {autoSuggestThreshold(formData.cat, formData.qty)}{formData.unit}
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Expiry date (optional)</label>
                <input
                  data-testid="add-item-expiry"
                  type="date"
                  value={formData.expiry}
                  onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid var(--border-strong)' }}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  data-testid="add-item-cancel"
                  onClick={() => setShowAddSheet(false)}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
                >
                  Cancel
                </button>
                <button
                  data-testid="add-item-save"
                  onClick={handleAddItem}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'var(--saffron)', color: 'white' }}
                >
                  Save item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit item sheet */}
      {showEditSheet && (
        <div
          data-testid="edit-item-sheet"
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(26,18,8,0.5)' }}
          onClick={() => setShowEditSheet(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-auto slide-up"
            style={{ backgroundColor: 'var(--cream)', borderRadius: '20px 20px 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="playfair text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Edit item</h3>
              
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Item name</label>
                <input
                  data-testid="edit-item-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid var(--border-strong)' }}
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Category</label>
                <select
                  data-testid="edit-item-category"
                  value={formData.cat}
                  onChange={(e) => setFormData({ ...formData, cat: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid var(--border-strong)' }}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Quantity</label>
                  <input
                    data-testid="edit-item-qty"
                    type="number"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-2 text-sm rounded-lg"
                    style={{ border: '1px solid var(--border-strong)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Unit</label>
                  <select
                    data-testid="edit-item-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-2 py-2 text-sm rounded-lg"
                    style={{ border: '1px solid var(--border-strong)' }}
                  >
                    {['g', 'kg', 'ml', 'L', 'pcs', 'tbsp'].map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Alert below</label>
                  <input
                    data-testid="edit-item-threshold"
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-2 text-sm rounded-lg"
                    style={{ border: '1px solid var(--border-strong)' }}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Expiry date (optional)</label>
                <input
                  data-testid="edit-item-expiry"
                  type="date"
                  value={formData.expiry}
                  onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid var(--border-strong)' }}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  data-testid="edit-item-cancel"
                  onClick={() => setShowEditSheet(false)}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
                >
                  Cancel
                </button>
                <button
                  data-testid="edit-item-save"
                  onClick={handleEditItem}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'var(--saffron)', color: 'white' }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;
