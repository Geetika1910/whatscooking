// Compute item status - never store this
export function statusOf(item) {
  if (item.qty <= 0) return 'out';
  
  if (item.expiry) {
    const days = (new Date(item.expiry) - new Date()) / 86400000;
    if (days <= 3) return 'expiring';
  }
  
  if (item.qty <= item.threshold) return 'low';
  
  return 'ok';
}

export function getStatusColor(status) {
  switch (status) {
    case 'ok': return 'var(--coriander)';
    case 'low': return 'var(--turmeric)';
    case 'expiring': return 'var(--saffron)';
    case 'out': return 'var(--subtle)';
    default: return 'var(--subtle)';
  }
}

export function getStatusBg(status) {
  switch (status) {
    case 'ok': return 'var(--paper)';
    case 'low': return 'var(--turmeric-light)';
    case 'expiring': return 'var(--saffron-light)';
    case 'out': return 'var(--paper)';
    default: return 'var(--paper)';
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case 'ok': return 'In stock';
    case 'low': return 'Low stock';
    case 'expiring': return 'Expiring soon';
    case 'out': return 'Out of stock';
    default: return 'Unknown';
  }
}
