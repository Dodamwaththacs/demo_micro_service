import React, { useState, useEffect } from 'react';

const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Laptop Pro 16', description: 'High performance M3 Max workstation for developers', price: 1499.99, stock: 10 },
  { id: 2, name: 'Wireless Headphones', description: 'Active Noise Cancelling Bluetooth 5.3 Over-Ear Headphones', price: 199.50, stock: 25 },
  { id: 3, name: 'Ergonomic Keyboard', description: 'Wireless Mechanical Split Keyboard with RGB backlighting', price: 89.00, stock: 15 },
  { id: 4, name: '4K Monitor 27-inch', description: 'Ultra HD 144Hz IPS Display with USB-C Hub', price: 349.00, stock: 8 },
];

export default function App() {
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8080');
  const [gatewayStatus, setGatewayStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState(FALLBACK_PRODUCTS[0]);
  const [quantity, setQuantity] = useState(1);
  
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // 'client' | 'gateway' | 'productservice' | 'orderservice' | 'paymentservice'
  
  // Checkout Modal State
  const [checkoutOrder, setCheckoutOrder] = useState(null); // Pending Order waiting for payment
  const [cardHolder, setCardHolder] = useState('Alex Johnson');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [inspectData, setInspectData] = useState({ product: null, order: null, payment: null, loading: false, error: null });
  const [notification, setNotification] = useState(null);

  // Check Gateway Health & Fetch Products Catalog
  useEffect(() => {
    checkGatewayAndFetchProducts();
  }, [gatewayUrl]);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const checkGatewayAndFetchProducts = async () => {
    setGatewayStatus('checking');
    try {
      const res = await fetch(`${gatewayUrl}/api/products`).catch(() => null);
      if (res && res.ok) {
        const fetchedProducts = await res.json();
        if (Array.isArray(fetchedProducts) && fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
          setSelectedProduct((prev) => 
            fetchedProducts.find((p) => p.id === prev?.id) || fetchedProducts[0]
          );
        }
        setGatewayStatus('online');
      } else {
        setGatewayStatus('offline');
      }
    } catch (err) {
      setGatewayStatus('offline');
    }
  };

  // Step 1: Create Order in OrderService (Status: PENDING_PAYMENT)
  const handleInitiateOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Please select a product', 'danger');
      return;
    }

    if (selectedProduct.stock < quantity) {
      showToast(`Insufficient stock! Only ${selectedProduct.stock} items available.`, 'danger');
      return;
    }

    setIsCreatingOrder(true);
    setActiveStep('gateway');

    try {
      setTimeout(() => setActiveStep('productservice'), 300);
      setTimeout(() => setActiveStep('orderservice'), 700);

      const totalAmount = selectedProduct.price * quantity;

      const response = await fetch(`${gatewayUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: parseInt(quantity),
          totalAmount: totalAmount,
          customerName: cardHolder || 'Alex Johnson'
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const createdOrder = await response.json();
      
      // Open Checkout Modal for Step 2 (Card Payment)
      setCheckoutOrder(createdOrder);
      showToast(`Order #${createdOrder.id} created! Please complete credit card payment.`, 'info');
      
      // Refresh inventory stock
      checkGatewayAndFetchProducts();
    } catch (error) {
      console.error('Order creation failed:', error);
      showToast(`Order creation failed: ${error.message}. Is API Gateway running at ${gatewayUrl}?`, 'danger');
    } finally {
      setIsCreatingOrder(false);
      setActiveStep(null);
    }
  };

  // Step 2: Pay for Order in PaymentService (POST /api/payments)
  const handleCompletePayment = async (e) => {
    e.preventDefault();
    if (!checkoutOrder) return;

    setIsProcessingPayment(true);
    setActiveStep('gateway');

    try {
      setTimeout(() => setActiveStep('paymentservice'), 400);

      // Call PaymentService via Gateway
      const paymentResponse = await fetch(`${gatewayUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: checkoutOrder.id,
          amount: checkoutOrder.totalAmount,
          cardHolder: cardHolder,
          cardNumberLast4: cardNumber,
          paymentMethod: 'CREDIT_CARD'
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error(`Payment processing failed with status ${paymentResponse.status}`);
      }

      const paymentRecord = await paymentResponse.json();

      // Update Order Status in OrderService to 'PAID'
      await fetch(`${gatewayUrl}/api/orders/${checkoutOrder.id}/status?status=PAID`, {
        method: 'PUT'
      });

      const completedOrderRecord = {
        ...checkoutOrder,
        status: 'PAID',
        createdAt: new Date().toLocaleTimeString(),
        paymentRecord: paymentRecord
      };

      setOrders((prev) => [completedOrderRecord, ...prev]);
      showToast(`Payment Successful! Transaction ID: ${paymentRecord.transactionId}`, 'success');

      // Close Payment Modal
      setCheckoutOrder(null);
    } catch (error) {
      console.error('Payment failed:', error);
      showToast(`Payment failed: ${error.message}`, 'danger');
    } finally {
      setIsProcessingPayment(false);
      setActiveStep(null);
    }
  };

  const handleInspectOrder = async (order) => {
    setSelectedOrder(order);
    setInspectData({ product: null, order: null, payment: null, loading: true, error: null });

    try {
      const [productRes, orderRes, paymentRes] = await Promise.all([
        order.productId ? fetch(`${gatewayUrl}/api/products/${order.productId}`).then((r) => (r.ok ? r.json() : null)) : null,
        fetch(`${gatewayUrl}/api/orders/${order.id}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${gatewayUrl}/api/payments/order/${order.id}`).then((r) => (r.ok ? r.json() : null)),
      ]);

      setInspectData({
        product: productRes,
        order: orderRes || order,
        payment: paymentRes,
        loading: false,
        error: null,
      });
    } catch (err) {
      setInspectData({
        product: null,
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
            <p className="brand-subtitle">Order Management • Payment Gateway • Product Inventory</p>
          </div>
        </div>

        <div className="gateway-badge">
          <span className={`status-dot ${gatewayStatus}`} />
          <span>Gateway: <strong>{gatewayStatus.toUpperCase()}</strong></span>
          <button className="btn-secondary" onClick={checkGatewayAndFetchProducts} style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem' }}>
            🔄 Refresh
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
            Multi-Step Decoupled Microservices Flow
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Step 1: Create Order ➔ Step 2: Pay via Gateway
          </span>
        </div>

        <div className="arch-nodes">
          <div className={`arch-node ${activeStep === 'client' ? 'active' : ''}`}>
            <div className="arch-node-name">💻 React Client</div>
            <div className="arch-node-port">Browser Checkout</div>
          </div>

          <div className="arch-arrow">➔</div>

          <div className={`arch-node ${activeStep === 'gateway' ? 'active' : ''}`}>
            <div className="arch-node-name">🌐 API Gateway</div>
            <div className="arch-node-port">Port 8080</div>
          </div>

          <div className="arch-arrow">➔</div>

          <div className={`arch-node ${activeStep === 'orderservice' ? 'active' : ''}`}>
            <div className="arch-node-name">📦 Order Service</div>
            <div className="arch-node-port">Port 8082 (Status: PENDING)</div>
          </div>

          <div className="arch-arrow">↔</div>

          <div className={`arch-node ${activeStep === 'productservice' ? 'active' : ''}`}>
            <div className="arch-node-name">🏷️ Product Service</div>
            <div className="arch-node-port">Port 8083 (Stock Reduction)</div>
          </div>

          <div className="arch-arrow">➔</div>

          <div className={`arch-node ${activeStep === 'paymentservice' ? 'active' : ''}`}>
            <div className="arch-node-name">💳 Payment Service</div>
            <div className="arch-node-port">Port 8081 (Credit Card Gateway)</div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Product Catalog & Order Form */}
        <div className="glass-card">
          <h2 className="card-title">
            <span>🛍️</span> Step 1: Select Product & Create Order
          </h2>
          <p className="card-subtitle">
            Choose an item from <code>ProductService</code>. Clicking checkout creates an order in <code>OrderService</code> with status <code>PENDING_PAYMENT</code>.
          </p>

          <label className="form-label">Available Products in Catalog</label>
          <div className="preset-grid" style={{ gridTemplateColumns: '1fr' }}>
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`preset-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                onClick={() => setSelectedProduct(product)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div className="preset-name">{product.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{product.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="preset-price">${product.price?.toFixed(2)}</div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: product.stock > 5 ? 'var(--success)' : product.stock > 0 ? 'var(--warning)' : 'var(--danger)' 
                  }}>
                    Stock: {product.stock} units
                  </div>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleInitiateOrder} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                max={selectedProduct ? selectedProduct.stock : 99}
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '0.8rem 1rem', 
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Order Total Amount:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                ${selectedProduct ? (selectedProduct.price * quantity).toFixed(2) : '0.00'}
              </span>
            </div>

            <button type="submit" className="btn-primary" disabled={isCreatingOrder || !selectedProduct || selectedProduct.stock <= 0}>
              {isCreatingOrder ? (
                <>
                  <div className="spinner" />
                  Creating Order in OrderService...
                </>
              ) : selectedProduct?.stock <= 0 ? (
                'Out of Stock'
              ) : (
                <>
                  <span>🛒</span> Create Order & Proceed to Payment ➔
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Processed Orders List */}
        <div className="glass-card">
          <div className="orders-header-actions">
            <div>
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <span>📋</span> Orders & Payments ({orders.length})
              </h2>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                Click any order to inspect telemetry from all 3 microservices.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No completed orders yet</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Create an order and complete credit card checkout to see live records here.
                </p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((ord) => (
                  <div key={ord.id} className="order-item" onClick={() => handleInspectOrder(ord)}>
                    <div className="order-info">
                      <div className="order-id">
                        Order #{ord.id}
                        <span className={`badge ${ord.status === 'PAID' ? 'badge-paid' : 'badge-pending'}`}>
                          {ord.status}
                        </span>
                      </div>
                      <div className="order-meta">
                        Item: <strong>{ord.productName}</strong> (Qty: {ord.quantity || 1}) • {ord.createdAt}
                      </div>
                      {ord.paymentRecord?.transactionId && (
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>
                          Txn: {ord.paymentRecord.transactionId} • {ord.paymentRecord.cardNumberLast4}
                        </div>
                      )}
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

      {/* Step 2: Interactive Payment Checkout Modal */}
      {checkoutOrder && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <button className="modal-close" onClick={() => setCheckoutOrder(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💳</span>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700 }}>
                Step 2: Credit Card Payment
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Order <strong>#{checkoutOrder.id}</strong> created with status <code>PENDING_PAYMENT</code>. Complete credit card details below to charge via <code>PaymentService</code> (Port 8081).
            </p>

            {/* Credit Card Preview Box */}
            <div className="credit-card-preview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-chip" />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                  VISA / MASTERCARD
                </span>
              </div>
              <div className="card-number-display">{cardNumber || '•••• •••• •••• ••••'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.7 }}>Cardholder</div>
                  <div className="card-holder-display">{cardHolder || 'VALUED CUSTOMER'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.7 }}>Expires</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{expiry || 'MM/YY'}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleCompletePayment}>
              <div className="form-group">
                <label className="form-label">Cardholder Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Card Number</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CVV Code</label>
                  <input
                    type="password"
                    maxLength="4"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  onClick={() => {
                    setCardHolder('Alex Johnson');
                    setCardNumber('4242 4242 4242 4242');
                  }}
                >
                  💳 Demo Visa Card
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  onClick={() => {
                    setCardHolder('Sarah Connor');
                    setCardNumber('5555 5555 5555 8888');
                  }}
                >
                  💳 Demo Mastercard
                </button>
              </div>

              <button type="submit" className="btn-primary btn-success" disabled={isProcessingPayment}>
                {isProcessingPayment ? (
                  <>
                    <div className="spinner" />
                    Processing Payment via Gateway (Port 8081)...
                  </>
                ) : (
                  <>
                    🔒 Pay ${checkoutOrder.totalAmount?.toFixed(2)} Now
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inspector for Product, Order & Payment Microservice Data */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Microservices Telemetry: Order #{selectedOrder.id}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Live JSON responses fetched via API Gateway from Product, Order & Payment services.
            </p>

            {inspectData.loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Querying Product, Order & Payment services...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' }}>
                      🏷️ ProductService (Inventory & Stock Data)
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      GET /api/products/{selectedOrder.productId || 1}
                    </span>
                  </div>
                  <pre className="json-box">{JSON.stringify(inspectData.product, null, 2)}</pre>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                      📦 OrderService (Order Record Data)
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
                      💳 PaymentService (Payment Processing Record)
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      GET /api/payments/order/{selectedOrder.id}
                    </span>
                  </div>
                  <pre className="json-box">{JSON.stringify(inspectData.payment, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
