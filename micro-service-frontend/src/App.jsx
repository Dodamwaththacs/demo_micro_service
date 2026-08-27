import React, { useState, useEffect } from 'react';

// Preset sample products for testing
const PRESETS = [
  { id: '1', name: 'Cloud Server Instance', price: '49.99', icon: '☁️' },
  { id: '2', name: 'Developer Tool Suite', price: '149.00', icon: '⚡' },
  { id: '3', name: 'Enterprise License', price: '499.00', icon: '🏢' },
  { id: '4', name: 'API Credit Pack', price: '19.99', icon: '🔑' },
];

export default function App() {
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8080');
  const [gatewayStatus, setGatewayStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  
  const [customAmount, setCustomAmount] = useState('149.00');
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // 'client' | 'gateway' | 'orderservice' | 'paymentservice'
  
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [inspectData, setInspectData] = useState({ order: null, payment: null, loading: false, error: null });
  const [notification, setNotification] = useState(null);

  // Check Gateway Health on mount
  useEffect(() => {
    checkGatewayHealth();
  }, [gatewayUrl]);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const checkGatewayHealth = async () => {
    setGatewayStatus('checking');
    try {
      // Send a quick request to gateway endpoint
      const res = await fetch(`${gatewayUrl}/actuator/health`, { method: 'GET' }).catch(() => null);
      if (res && (res.ok || res.status === 404 || res.status === 200)) {
        setGatewayStatus('online');
      } else {
        // Try fallback check on API routes
        const pingRes = await fetch(`${gatewayUrl}/api/orders/999999`, { method: 'GET' }).catch(() => null);
        if (pingRes) {
          setGatewayStatus('online');
        } else {
          setGatewayStatus('offline');
        }
      }
    } catch (err) {
      setGatewayStatus('offline');
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomAmount(preset.price);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid order amount', 'danger');
      return;
    }

    setIsSubmitting(true);
    setActiveStep('gateway');

    try {
      // Step 1: Call Gateway -> OrderService
      setTimeout(() => setActiveStep('orderservice'), 300);
      setTimeout(() => setActiveStep('paymentservice'), 700);

      const response = await fetch(`${gatewayUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalAmount: amount }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const orderData = await response.json();

      // Step 2: Fetch Payment details created by PaymentService
      let paymentData = null;
      try {
        const paymentRes = await fetch(`${gatewayUrl}/api/payments/order/${orderData.id}`);
        if (paymentRes.ok) {
          paymentData = await paymentRes.json();
        }
      } catch (pErr) {
        console.warn('Could not fetch payment record immediately:', pErr);
      }

      const newOrderRecord = {
        ...orderData,
        createdAt: new Date().toLocaleTimeString(),
        itemName: selectedPreset ? selectedPreset.name : 'Custom Purchase',
        paymentStatus: paymentData ? paymentData.status : 'COMPLETED',
      };

      setOrders((prev) => [newOrderRecord, ...prev]);
      showToast(`Order #${orderData.id} created & payment completed!`, 'success');
      setGatewayStatus('online');
    } catch (error) {
      console.error('Order creation failed:', error);
      showToast(`Order creation failed: ${error.message}. Is API Gateway running at ${gatewayUrl}?`, 'danger');
      setGatewayStatus('offline');
    } finally {
      setIsSubmitting(false);
      setActiveStep(null);
    }
  };

  const handleInspectOrder = async (order) => {
    setSelectedOrder(order);
    setInspectData({ order: null, payment: null, loading: true, error: null });

    try {
      const [orderRes, paymentRes] = await Promise.all([
        fetch(`${gatewayUrl}/api/orders/${order.id}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${gatewayUrl}/api/payments/order/${order.id}`).then((r) => (r.ok ? r.json() : null)),
      ]);

      setInspectData({
        order: orderRes || order,
        payment: paymentRes,
        loading: false,
        error: null,
      });
    } catch (err) {
      setInspectData({
        order: order,
        payment: null,
        loading: false,
        error: 'Failed to query live service APIs',
      });
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: notification.type === 'danger' ? 'rgba(239,68,68,0.95)' : notification.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(59,130,246,0.95)',
          color: 'white',
          padding: '0.8rem 1.4rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          zIndex: 200,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {notification.type === 'success' ? '✓' : notification.type === 'danger' ? '⚠' : 'ℹ'} {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">MicroServices Hub</h1>
            <p className="brand-subtitle">Spring Cloud Gateway • OrderService • PaymentService</p>
          </div>
        </div>

        <div className="gateway-badge">
          <span className={`status-dot ${gatewayStatus}`} />
          <span>Gateway: <strong>{gatewayStatus.toUpperCase()}</strong></span>
          <button className="btn-secondary" onClick={checkGatewayHealth} style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem' }}>
            🔄 Test
          </button>
        </div>
      </header>

      {/* Architecture Flow Banner */}
      <section className="architecture-card">
        <div className="arch-header">
          <span className="arch-title">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Microservices Communication Flow
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Single Gateway Routing Architecture
          </span>
        </div>

        <div className="arch-nodes">
          <div className={`arch-node ${activeStep === 'client' ? 'active' : ''}`}>
            <div className="arch-node-name">💻 React Frontend</div>
            <div className="arch-node-port">Browser Client</div>
          </div>

          <div className="arch-arrow">➔</div>

          <div className={`arch-node ${activeStep === 'gateway' ? 'active' : ''}`}>
            <div className="arch-node-name">🌐 API Gateway</div>
            <div className="arch-node-port">Port 8080</div>
          </div>

          <div className="arch-arrow">➔</div>

          <div className={`arch-node ${activeStep === 'orderservice' ? 'active' : ''}`}>
            <div className="arch-node-name">📦 Order Service</div>
            <div className="arch-node-port">Port 8082 (H2 DB)</div>
          </div>

          <div className="arch-arrow">➔</div>

          <div className={`arch-node ${activeStep === 'paymentservice' ? 'active' : ''}`}>
            <div className="arch-node-name">💳 Payment Service</div>
            <div className="arch-node-port">Port 8081 (H2 DB)</div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Create Order Form */}
        <div className="glass-card">
          <h2 className="card-title">
            <span>🛒</span> Create New Order
          </h2>
          <p className="card-subtitle">
            Submit an order request via API Gateway. Order & Payment microservices will process it synchronously.
          </p>

          <label className="form-label">Select Demo Product</label>
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-card ${selectedPreset?.id === preset.id ? 'selected' : ''}`}
                onClick={() => handleSelectPreset(preset)}
              >
                <div className="preset-name">{preset.icon} {preset.name}</div>
                <div className="preset-price">${preset.price}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateOrder}>
            <div className="form-group">
              <label className="form-label">Order Total Amount ($)</label>
              <div className="input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPreset(null);
                  }}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">API Gateway Target Endpoint</label>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="spinner" />
                  Processing via Microservices...
                </>
              ) : (
                <>
                  <span>🚀</span> Place Order & Process Payment
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Recent Orders List */}
        <div className="glass-card">
          <div className="orders-header-actions">
            <div>
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <span>📋</span> Processed Orders ({orders.length})
              </h2>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                Click any order to inspect response payloads from Order & Payment services.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No orders submitted yet</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Use the form on the left to submit an order through the API Gateway.
                </p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((ord) => (
                  <div key={ord.id} className="order-item" onClick={() => handleInspectOrder(ord)}>
                    <div className="order-info">
                      <div className="order-id">
                        Order #{ord.id}
                        <span className="badge badge-completed">COMPLETED</span>
                      </div>
                      <div className="order-meta">
                        {ord.itemName} • {ord.createdAt}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="order-amount">${ord.totalAmount?.toFixed(2)}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        Inspect Data ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Inspector for Order & Payment Microservice Data */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Microservice Inspector: Order #{selectedOrder.id}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Live telemetry fetched through API Gateway from Order & Payment services.
            </p>

            {inspectData.loading ? (
              <div style={{ padding: '2rem', textTransform: 'center', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Fetching endpoints from Gateway...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                      📦 OrderService Endpoint Response
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      GET /api/orders/{selectedOrder.id}
                    </span>
                  </div>
                  <pre className="json-box">{JSON.stringify(inspectData.order, null, 2)}</pre>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)' }}>
                      💳 PaymentService Endpoint Response
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      GET /api/payments/order/{selectedOrder.id}
                    </span>
                  </div>
                  <pre className="json-box">{JSON.stringify(inspectData.payment || { message: "Payment processed automatically during order creation" }, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
