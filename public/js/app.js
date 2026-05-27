// SmartStock Pro - Client Application Logic
let currentUser = null;
let csrfToken = '';
let currentTab = 'dashboard-tab';

// Maps & Charts references
let map = null;
let mapMarkers = [];
let trendChart = null;
let categoryChart = null;

// Pagination states
let productPage = 1;
const productLimit = 8;
let transactionPage = 1;
const transactionLimit = 10;
let logPage = 1;
const logLimit = 15;

// ==========================================
// 1. BOOTSTRAP & AUTHENTICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
  setupNavigation();
  setupForms();
});

function checkAuthSession() {
  fetch('/api/auth/me')
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Not logged in');
    })
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        csrfToken = data.csrfToken;
        onLoginSuccess();
      } else {
        showLoginScreen();
      }
    })
    .catch(() => {
      showLoginScreen();
    });
}

function showLoginScreen() {
  document.getElementById('login-screen').style.opacity = '1';
  document.getElementById('login-screen').style.pointerEvents = 'auto';
  document.getElementById('app-content').style.display = 'none';
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('login-screen').style.opacity = '0';
  document.getElementById('login-screen').style.pointerEvents = 'none';
  document.getElementById('app-content').style.display = 'flex';
}

function onLoginSuccess() {
  hideLoginScreen();
  // show topbar after login (if present)
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'flex';
  
  // Set User Profile UI
  document.getElementById('user-profile-name').innerText = currentUser.full_name;
  document.getElementById('user-profile-role').innerText = currentUser.role;

  // Manage RBAC UI privileges
  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }

  // Display write access privileges (Staff, Manager, Admin)
  if (['admin', 'manager', 'staff'].includes(currentUser.role)) {
    document.querySelectorAll('.edit-privilege').forEach(el => el.style.display = 'inline-flex');
    document.querySelectorAll('.viewer-message').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.edit-privilege').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.viewer-message').forEach(el => el.style.display = 'block');
  }

  // Render initial dashboard data
  loadDashboardData();
  setupRealtimeSSE();
  
  // Pre-load dropdown data
  loadDropdownOptions();
  
  // Reinitialize icons
  lucide.createIcons();
}

function fillDemoLogin(username, password) {
  document.getElementById('login-username').value = username;
  document.getElementById('login-password').value = password;
}

// ==========================================
// 2. SIDEBAR ROUTING (VIRTUAL TABS)
// ==========================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
      
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Logout trigger (sidebar and topbar)
  const doLogout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken }
    }).finally(() => {
      currentUser = null;
      csrfToken = '';
      showLoginScreen();
    });
  };

  const sbLogout = document.getElementById('logout-btn');
  if (sbLogout) sbLogout.addEventListener('click', doLogout);
  const topLogout = document.getElementById('logout-btn-top');
  if (topLogout) topLogout.addEventListener('click', doLogout);
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  const target = document.getElementById(tabId);
  if (target) {
    target.style.display = 'block';
  }

  // Trigger tab-specific loads
  if (tabId === 'dashboard-tab') {
    loadDashboardData();
  } else if (tabId === 'products-tab') {
    loadProducts();
  } else if (tabId === 'categories-tab') {
    loadCategories();
  } else if (tabId === 'suppliers-tab') {
    loadSuppliers();
  } else if (tabId === 'warehouses-tab') {
    loadWarehouses();
  } else if (tabId === 'transactions-tab') {
    loadTransactions();
  } else if (tabId === 'transfers-tab') {
    loadTransfers();
  } else if (tabId === 'jobs-tab') {
    loadJobs();
  } else if (tabId === 'logs-tab') {
    loadLogs();
  } else if (tabId === 'users-tab') {
    loadUsers();
  }
  
  lucide.createIcons();
}

// ==========================================
// 3. DASHBOARD STATS, CHARTS & LEAFLET MAP
// ==========================================
function loadDashboardData() {
  fetch('/api/dashboard/stats', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Update KPIs
        document.getElementById('kpi-products').innerText = data.kpis.totalProducts;
        document.getElementById('kpi-warehouses').innerText = data.kpis.totalWarehouses;
        document.getElementById('kpi-valuation').innerText = 'Rp ' + data.kpis.inventoryVal.toLocaleString('id-ID');
        document.getElementById('kpi-alerts').innerText = data.kpis.criticalStockAlerts;

        // Load charts
        renderTrendChart(data.charts.trxTrends);
        renderCategoryChart(data.charts.stockByCategory);
        initWarehouseMap(data.charts.stockByWarehouse);
      }
    })
    .catch(err => console.error('Dashboard fetch error:', err));
}

function renderTrendChart(trends) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  const labels = trends.map(t => t.date);
  const dataIn = trends.map(t => t.qty_in);
  const dataOut = trends.map(t => t.qty_out);

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Barang Masuk (IN)',
          data: dataIn,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Barang Keluar (OUT)',
          data: dataOut,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f3f4f6' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
      }
    }
  });
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  const labels = categories.map(c => c.category);
  const stock = categories.map(c => c.total_stock);

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: stock,
        backgroundColor: [
          '#6366f1', '#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'
        ],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#f3f4f6', boxWidth: 12 } }
      }
    }
  });
}

function initWarehouseMap(warehouses) {
  // Center coordinates of Indonesia
  const indCenter = [-2.5489, 118.0149];
  
  if (!map) {
    map = L.map('warehouse-map').setView(indCenter, 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }

  // Clear existing markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  warehouses.forEach(wh => {
    if (wh.latitude && wh.longitude) {
      const usagePercent = Math.round((wh.total_stock / wh.capacity) * 100);
      let color = 'green';
      if (usagePercent > 90) color = 'red';
      else if (usagePercent > 70) color = 'orange';

      // Custom marker icon color
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const popupHtml = `
        <div style="color: #333; font-family: sans-serif;">
          <h4 style="margin: 0 0 4px 0;">${wh.warehouse}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.8rem; color: #666;">${wh.city}</p>
          <div style="font-size: 0.85rem; font-weight: bold;">Stok: ${wh.total_stock} / ${wh.capacity} unit</div>
          <div style="width: 120px; height: 6px; background-color: #eee; border-radius: 3px; overflow: hidden; margin-top: 5px;">
            <div style="width: ${Math.min(usagePercent, 100)}%; height: 100%; background-color: ${color};"></div>
          </div>
          <p style="font-size: 0.75rem; margin: 8px 0 0 0; color: #007bff; cursor: pointer; text-decoration: underline;" onclick="viewWarehouseDetails(${wh.id})">Lihat Rincian Stok &raquo;</p>
        </div>
      `;

      const marker = L.marker([wh.latitude, wh.longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupHtml);
      
      mapMarkers.push(marker);
    }
  });
}

function viewWarehouseDetails(id) {
  fetch(`/api/warehouses/${id}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const wh = data.data;
        document.getElementById('wh-detail-title').innerText = wh.name;
        
        let metaHtml = `
          <strong>Kode Gudang:</strong> ${wh.code} | 
          <strong>Lokasi:</strong> ${wh.address}, ${wh.city} | 
          <strong>Manager:</strong> ${wh.manager_name || '-'} | 
          <strong>Kapasitas:</strong> ${wh.capacity} unit
        `;
        document.getElementById('wh-detail-meta').innerHTML = metaHtml;

        let tableHtml = '';
        if (wh.stocks.length === 0) {
          tableHtml = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Gudang ini kosong.</td></tr>';
        } else {
          wh.stocks.forEach(st => {
            tableHtml += `
              <tr>
                <td><strong>${st.code}</strong></td>
                <td>${st.name}</td>
                <td>${st.category_name || '-'}</td>
                <td>${st.quantity} ${st.unit}</td>
                <td>Rp ${(st.quantity * st.price).toLocaleString('id-ID')}</td>
              </tr>
            `;
          });
        }
        document.getElementById('wh-detail-table-body').innerHTML = tableHtml;
        openModal('warehouse-detail-modal');
      }
    });
}

// ==========================================
// 4. REAL-TIME SERVER-SENT EVENTS (SSE)
// ==========================================
function setupRealtimeSSE() {
  const eventSource = new EventSource('/api/monitoring/events');

  eventSource.addEventListener('dashboard_update', (e) => {
    const data = JSON.parse(e.data);
    
    // 1. Live Uptime resource metrics
    updateResourceBars(data.metrics);

    // 2. Real-time Notifications Alert Tray
    renderNotifications(data.notifications, data.unreadCount);
  });

  eventSource.addEventListener('error', (e) => {
    console.warn('SSE disconnected. Reconnecting...');
  });
}

function updateResourceBars(metrics) {
  // Update CPU
  document.getElementById('metric-cpu-val').innerText = `${metrics.cpu}%`;
  document.getElementById('metric-cpu-bar').style.width = `${metrics.cpu}%`;
  
  // Update RAM
  document.getElementById('metric-ram-val').innerText = `${metrics.ram}%`;
  document.getElementById('metric-ram-bar').style.width = `${metrics.ram}%`;
  
  // Update Response Time (Uptime check)
  document.getElementById('metric-rt-val').innerText = `${metrics.responseTime}ms`;
  const rtWidth = Math.min((metrics.responseTime / 400) * 100, 100);
  document.getElementById('metric-rt-bar').style.width = `${rtWidth}%`;
}

function renderNotifications(notifs, unreadCount) {
  const panel = document.getElementById('dashboard-notif-panel');
  if (notifs.length === 0) {
    panel.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; text-align: center;">Tidak ada notifikasi baru.</div>';
    return;
  }

  let html = '';
  notifs.forEach(n => {
    const dateStr = n.created_at.slice(11, 16); // HH:MM
    html += `
      <div class="notif-item severity-${n.severity || 'info'}">
        <div class="notif-header">
          <span>${n.title}</span>
          <span class="notif-time">${dateStr}</span>
        </div>
        <div class="notif-body">${n.message}</div>
      </div>
    `;
  });
  panel.innerHTML = html;
}

function clearNotifications() {
  fetch('/api/monitoring/notifications/read-all', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken }
  }).then(res => res.json())
    .then(() => loadDashboardData());
}

// ==========================================
// 5. PRODUCTS GALLERY & CRUD
// ==========================================
function loadProducts() {
  const search = document.getElementById('prod-search').value;
  const categoryId = document.getElementById('prod-filter-category').value;
  const supplierId = document.getElementById('prod-filter-supplier').value;

  fetch(`/api/products?search=${encodeURIComponent(search)}&categoryId=${categoryId}&supplierId=${supplierId}&page=${productPage}&limit=${productLimit}`, {
    headers: { 'x-csrf-token': csrfToken }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const gallery = document.getElementById('product-gallery');
      let html = '';

      if (data.data.length === 0) {
        gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Tidak ada produk ditemukan.</div>';
        document.getElementById('prod-pagination-info').innerText = 'Menampilkan 0 dari 0';
        return;
      }

      data.data.forEach(p => {
        const imageElement = p.image_url 
          ? `<img src="${p.image_url}" alt="${p.name}">` 
          : `<div class="product-no-img"><i data-lucide="image"></i></div>`;

        // Check if stock is low
        const isLow = p.total_stock < p.min_stock;
        const stockLabel = isLow 
          ? `<span style="color: var(--danger); font-weight: 700;">${p.total_stock} ${p.unit} (Kritis)</span>`
          : `<span>${p.total_stock} ${p.unit}</span>`;

        let actionButtons = '';
        if (['admin', 'manager'].includes(currentUser.role)) {
          actionButtons = `
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="btn btn-secondary" style="flex: 1; padding: 6px;" onclick="editProduct(${p.id})"><i data-lucide="edit" style="width: 14px; height: 14px;"></i></button>
              <button class="btn btn-secondary" style="flex: 1; padding: 6px; border-color: rgba(239,68,68,0.3); color: var(--danger);" onclick="deleteProduct(${p.id})"><i data-lucide="trash" style="width: 14px; height: 14px;"></i></button>
            </div>
          `;
        }

        html += `
          <div class="product-card">
            <div class="product-image-container">
              ${imageElement}
            </div>
            <div class="product-card-body">
              <span class="product-card-code">${p.code}</span>
              <h5 class="product-card-name">${p.name}</h5>
              <div class="product-card-stock">
                <span>Stok:</span>
                ${stockLabel}
              </div>
              <div class="product-card-price">Rp ${p.price.toLocaleString('id-ID')}</div>
              ${actionButtons}
            </div>
          </div>
        `;
      });

      gallery.innerHTML = html;
      
      // Pagination controls
      const pag = data.pagination;
      document.getElementById('prod-pagination-info').innerText = `Halaman ${pag.page} dari ${pag.pages || 1} (Total: ${pag.total} produk)`;
      document.getElementById('prod-prev-btn').disabled = pag.page <= 1;
      document.getElementById('prod-next-btn').disabled = pag.page >= pag.pages;

      lucide.createIcons();
    }
  });
}

function prevProdPage() { if (productPage > 1) { productPage--; loadProducts(); } }
function nextProdPage() { productPage++; loadProducts(); }

function openProductModal() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-form-id').value = '';
  document.getElementById('product-modal-title').innerText = 'Tambah Produk';
  document.getElementById('prod-code-group').style.display = 'block';
  document.getElementById('prod-image-preview-box').innerHTML = '<span style="color: var(--text-muted)">Belum ada foto</span>';
  openModal('product-modal');
}

function previewProductImage(input) {
  const box = document.getElementById('prod-image-preview-box');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      box.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    box.innerHTML = '<span style="color: var(--text-muted)">Belum ada foto</span>';
  }
}

function editProduct(id) {
  fetch(`/api/products/${id}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const p = data.data;
        document.getElementById('prod-form-id').value = p.id;
        document.getElementById('prod-form-code').value = p.code;
        document.getElementById('prod-form-name').value = p.name;
        document.getElementById('prod-form-category').value = p.category_id;
        document.getElementById('prod-form-supplier').value = p.supplier_id;
        document.getElementById('prod-form-unit').value = p.unit;
        document.getElementById('prod-form-price').value = p.price;
        document.getElementById('prod-form-minstock').value = p.min_stock;
        document.getElementById('prod-form-desc').value = p.description || '';
        
        document.getElementById('prod-code-group').style.display = 'none'; // Lock key codes
        document.getElementById('product-modal-title').innerText = 'Edit Produk';

        const previewBox = document.getElementById('prod-image-preview-box');
        if (p.image_url) {
          previewBox.innerHTML = `<img src="${p.image_url}" style="width:100%; height:100%; object-fit:contain;">`;
        } else {
          previewBox.innerHTML = '<span style="color: var(--text-muted)">Belum ada foto</span>';
        }

        openModal('product-modal');
      }
    });
}

function deleteProduct(id) {
  if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
    fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) loadProducts();
    });
  }
}

// ==========================================
// 6. CATEGORIES & SUPPLIERS CRUD
// ==========================================
function loadCategories() {
  const search = document.getElementById('cat-search').value;
  fetch(`/api/categories?search=${encodeURIComponent(search)}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let html = '';
        data.data.forEach(c => {
          let act = '';
          if (['admin', 'manager'].includes(currentUser.role)) {
            act = `
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editCategory(${c.id})">Edit</button>
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; color: var(--danger); border-color: rgba(239,68,68,0.2)" onclick="deleteCategory(${c.id})">Hapus</button>
            `;
          }
          html += `
            <tr>
              <td><strong>${c.code}</strong></td>
              <td>${c.name}</td>
              <td style="color: var(--text-secondary);">${c.description || '-'}</td>
              <td class="edit-privilege">${act}</td>
            </tr>
          `;
        });
        document.getElementById('category-table-body').innerHTML = html;
        if (currentUser && !['admin', 'manager'].includes(currentUser.role)) {
          document.querySelectorAll('.edit-privilege').forEach(e => e.style.display = 'none');
        }
      }
    });
}

function openCategoryModal() {
  document.getElementById('category-form').reset();
  document.getElementById('cat-form-id').value = '';
  document.getElementById('cat-code-group').style.display = 'block';
  document.getElementById('category-modal-title').innerText = 'Tambah Kategori';
  openModal('category-modal');
}

function editCategory(id) {
  fetch(`/api/categories/${id}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const c = data.data;
        document.getElementById('cat-form-id').value = c.id;
        document.getElementById('cat-form-code').value = c.code;
        document.getElementById('cat-form-name').value = c.name;
        document.getElementById('cat-form-desc').value = c.description || '';
        
        document.getElementById('cat-code-group').style.display = 'none';
        document.getElementById('category-modal-title').innerText = 'Edit Kategori';
        openModal('category-modal');
      }
    });
}

function deleteCategory(id) {
  if (confirm('Anda yakin ingin menghapus kategori?')) {
    fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) loadCategories();
    });
  }
}

// Suppliers CRUD
function loadSuppliers() {
  const search = document.getElementById('sup-search').value;
  fetch(`/api/suppliers?search=${encodeURIComponent(search)}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let html = '';
        data.data.forEach(s => {
          let act = '';
          if (['admin', 'manager'].includes(currentUser.role)) {
            act = `
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editSupplier(${s.id})">Edit</button>
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; color: var(--danger); border-color: rgba(239,68,68,0.2)" onclick="deleteSupplier(${s.id})">Hapus</button>
            `;
          }
          html += `
            <tr>
              <td><strong>${s.code}</strong></td>
              <td>${s.name}</td>
              <td>${s.contact_person || '-'}</td>
              <td>${s.city || '-'}</td>
              <td>${s.phone || '-'}</td>
              <td class="edit-privilege">${act}</td>
            </tr>
          `;
        });
        document.getElementById('supplier-table-body').innerHTML = html;
        if (currentUser && !['admin', 'manager'].includes(currentUser.role)) {
          document.querySelectorAll('.edit-privilege').forEach(e => e.style.display = 'none');
        }
      }
    });
}

function openSupplierModal() {
  document.getElementById('supplier-form').reset();
  document.getElementById('sup-form-id').value = '';
  document.getElementById('sup-code-group').style.display = 'block';
  document.getElementById('supplier-modal-title').innerText = 'Tambah Supplier';
  openModal('supplier-modal');
}

function editSupplier(id) {
  fetch(`/api/suppliers/${id}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const s = data.data;
        document.getElementById('sup-form-id').value = s.id;
        document.getElementById('sup-form-code').value = s.code;
        document.getElementById('sup-form-name').value = s.name;
        document.getElementById('sup-form-cp').value = s.contact_person || '';
        document.getElementById('sup-form-phone').value = s.phone || '';
        document.getElementById('sup-form-city').value = s.city || '';
        document.getElementById('sup-form-email').value = s.email || '';
        document.getElementById('sup-form-address').value = s.address || '';

        document.getElementById('sup-code-group').style.display = 'none';
        document.getElementById('supplier-modal-title').innerText = 'Edit Supplier';
        openModal('supplier-modal');
      }
    });
}

function deleteSupplier(id) {
  if (confirm('Anda yakin ingin menghapus supplier ini?')) {
    fetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) loadSuppliers();
    });
  }
}

// ==========================================
// 7. WAREHOUSE MANAGEMENT CRUD
// ==========================================
function loadWarehouses() {
  const search = document.getElementById('wh-search').value;
  fetch(`/api/warehouses?search=${encodeURIComponent(search)}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let html = '';
        data.data.forEach(w => {
          const capPercent = Math.round((w.current_stock / w.capacity) * 100);
          let badgeColor = 'badge-success';
          if (capPercent > 90) badgeColor = 'badge-danger';
          else if (capPercent > 70) badgeColor = 'badge-warning';

          let actHtml = `<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="viewWarehouseDetails(${w.id})">Stok</button>`;
          if (['admin', 'manager'].includes(currentUser.role)) {
            actHtml += `
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editWarehouse(${w.id})">Edit</button>
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; color: var(--danger); border-color: rgba(239,68,68,0.2)" onclick="deleteWarehouse(${w.id})">Hapus</button>
            `;
          }

          html += `
            <tr>
              <td><strong>${w.code}</strong></td>
              <td>${w.name}</td>
              <td>${w.city}</td>
              <td>${w.manager_name || '-'}</td>
              <td>
                <span class="badge ${badgeColor}">${w.current_stock} / ${w.capacity} unit (${capPercent}%)</span>
              </td>
              <td>${actHtml}</td>
            </tr>
          `;
        });
        document.getElementById('warehouse-table-body').innerHTML = html;
      }
    });
}

function openWarehouseModal() {
  document.getElementById('warehouse-form').reset();
  document.getElementById('wh-form-id').value = '';
  document.getElementById('wh-code-group').style.display = 'block';
  document.getElementById('warehouse-modal-title').innerText = 'Tambah Gudang';
  openModal('warehouse-modal');
}

function editWarehouse(id) {
  fetch(`/api/warehouses/${id}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const w = data.data;
        document.getElementById('wh-form-id').value = w.id;
        document.getElementById('wh-form-code').value = w.code;
        document.getElementById('wh-form-name').value = w.name;
        document.getElementById('wh-form-city').value = w.city;
        document.getElementById('wh-form-capacity').value = w.capacity;
        document.getElementById('wh-form-lat').value = w.latitude || '';
        document.getElementById('wh-form-lng').value = w.longitude || '';
        document.getElementById('wh-form-mgr').value = w.manager_name || '';
        document.getElementById('wh-form-phone').value = w.phone || '';
        document.getElementById('wh-form-address').value = w.address || '';

        document.getElementById('wh-code-group').style.display = 'none';
        document.getElementById('warehouse-modal-title').innerText = 'Edit Gudang';
        openModal('warehouse-modal');
      }
    });
}

function deleteWarehouse(id) {
  if (confirm('Anda yakin ingin menghapus gudang ini?')) {
    fetch(`/api/warehouses/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) loadWarehouses();
    });
  }
}

// ==========================================
// 8. STOCK TRANSACTIONS & FIFO/LIFO ENGINE
// ==========================================
function loadTransactions() {
  const search = document.getElementById('tx-search').value;
  const type = document.getElementById('tx-filter-type').value;
  const whId = document.getElementById('tx-filter-warehouse').value;

  fetch(`/api/transactions?search=${encodeURIComponent(search)}&type=${type}&warehouseId=${whId}&page=${transactionPage}&limit=${transactionLimit}`, {
    headers: { 'x-csrf-token': csrfToken }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      let html = '';
      if (data.data.length === 0) {
        html = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">Tidak ada transaksi.</td></tr>';
        document.getElementById('tx-table-body').innerHTML = html;
        document.getElementById('tx-pagination-info').innerText = 'Menampilkan 0 dari 0';
        return;
      }

      data.data.forEach(t => {
        const typeBadge = t.type === 'in' 
          ? '<span class="badge badge-success">Masuk (IN)</span>' 
          : '<span class="badge badge-danger">Keluar (OUT)</span>';

        html += `
          <tr>
            <td><strong>${t.code}</strong></td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${t.created_at}</td>
            <td>${typeBadge}</td>
            <td>${t.product_name} <br><small style="color:var(--text-muted)">${t.product_code}</small></td>
            <td>${t.warehouse_name}</td>
            <td>${t.quantity} ${t.product_unit}</td>
            <td>Rp ${t.price_per_unit.toLocaleString('id-ID')}</td>
            <td><strong>Rp ${t.total_price.toLocaleString('id-ID')}</strong></td>
            <td style="font-size: 0.85rem; color:var(--text-muted)">${t.reference_no || '-'}</td>
          </tr>
        `;
      });
      document.getElementById('transaction-table-body').innerHTML = html;

      const pag = data.pagination;
      document.getElementById('tx-pagination-info').innerText = `Halaman ${pag.page} dari ${pag.pages || 1} (Total: ${pag.total} transaksi)`;
      document.getElementById('tx-prev-btn').disabled = pag.page <= 1;
      document.getElementById('tx-next-btn').disabled = pag.page >= pag.pages;
    }
  });
}

function prevTxPage() { if (transactionPage > 1) { transactionPage--; loadTransactions(); } }
function nextTxPage() { transactionPage++; loadTransactions(); }

function openTransactionModal() {
  document.getElementById('transaction-form').reset();
  openModal('transaction-modal');
}

function calculateValuation() {
  const prodId = document.getElementById('valuation-product-select').value;
  if (!prodId) {
    document.getElementById('valuation-result-box').style.display = 'none';
    return;
  }

  fetch(`/api/transactions/valuation/${prodId}`, { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const sum = data.summary;
        
        // FIFO Render
        document.getElementById('fifo-ending-val').innerText = 'Rp ' + sum.fifo.endingInventoryValue.toLocaleString('id-ID');
        document.getElementById('fifo-cogs').innerText = 'Rp ' + sum.fifo.cogs.toLocaleString('id-ID');
        document.getElementById('fifo-ending-qty').innerText = `${sum.fifo.endingQuantity} ${data.unit}`;

        // LIFO Render
        document.getElementById('lifo-ending-val').innerText = 'Rp ' + sum.lifo.endingInventoryValue.toLocaleString('id-ID');
        document.getElementById('lifo-cogs').innerText = 'Rp ' + sum.lifo.cogs.toLocaleString('id-ID');
        document.getElementById('lifo-ending-qty').innerText = `${sum.lifo.endingQuantity} ${data.unit}`;

        document.getElementById('valuation-result-box').style.display = 'block';
      }
    });
}

// ==========================================
// 9. WAREHOUSE STOCKS TRANSFERS
// ==========================================
function loadTransfers() {
  fetch('/api/transfers', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let html = '';
        if (data.data.length === 0) {
          html = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding:20px;">Tidak ada pengajuan transfer barang.</td></tr>';
          document.getElementById('transfer-table-body').innerHTML = html;
          return;
        }

        data.data.forEach(t => {
          let statusBadge = '';
          if (t.status === 'pending') statusBadge = '<span class="badge badge-warning">Pending</span>';
          else if (t.status === 'completed') statusBadge = '<span class="badge badge-success">Completed</span>';
          else statusBadge = '<span class="badge badge-danger">Cancelled</span>';

          let actionHtml = '-';
          if (t.status === 'pending' && ['admin', 'manager'].includes(currentUser.role)) {
            actionHtml = `
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary" style="padding: 4px 8px; font-size:0.75rem;" onclick="approveTransfer(${t.id})">Setujui</button>
                <button class="btn btn-danger" style="padding: 4px 8px; font-size:0.75rem;" onclick="rejectTransfer(${t.id})">Tolak</button>
              </div>
            `;
          }

          html += `
            <tr>
              <td><strong>${t.code}</strong></td>
              <td>${t.product_name} <br><small style="color:var(--text-muted)">${t.product_code}</small></td>
              <td>${t.from_warehouse_name}</td>
              <td>${t.to_warehouse_name}</td>
              <td>${t.quantity} ${t.product_unit}</td>
              <td>${statusBadge}</td>
              <td>${t.requested_by_fullname || 'System'}</td>
              <td>${t.approved_by_fullname || '-'}</td>
              <td>${actionHtml}</td>
            </tr>
          `;
        });
        document.getElementById('transfer-table-body').innerHTML = html;
      }
    });
}

function openTransferModal() {
  document.getElementById('transfer-form').reset();
  openModal('transfer-modal');
}

function approveTransfer(id) {
  if (confirm('Apakah Anda menyetujui mutasi transfer stok ini? Perubahan saldo di kedua gudang akan diproses secara paralel.')) {
    fetch(`/api/transfers/${id}/approve`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        loadTransfers();
        loadDashboardData();
      }
    });
  }
}

function rejectTransfer(id) {
  if (confirm('Tolak permintaan transfer ini?')) {
    fetch(`/api/transfers/${id}/reject`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) loadTransfers();
    });
  }
}

// ==========================================
// 10. BACKGROUND JOBS & CSV PARALLEL IMPORT
// ==========================================
function loadJobs() {
  fetch('/api/jobs', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const panel = document.getElementById('job-queue-panel');
        if (data.data.length === 0) {
          panel.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 15px; text-align: center;">Tidak ada antrean pekerjaan latar belakang.</div>';
          return;
        }

        let html = '';
        data.data.forEach(j => {
          let statusBadge = '';
          if (j.status === 'pending') statusBadge = '<span class="badge badge-secondary">Pending</span>';
          else if (j.status === 'processing') statusBadge = '<span class="badge badge-warning animate-pulse-slow">Processing</span>';
          else if (j.status === 'completed') statusBadge = '<span class="badge badge-success">Completed</span>';
          else statusBadge = '<span class="badge badge-danger">Failed</span>';

          let downloadLink = '';
          if (j.status === 'completed' && j.type === 'generate_report' && j.result) {
            downloadLink = `
              <div style="margin-top: 10px;">
                <a href="${j.result}" target="_blank" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem; display: inline-flex;">
                  <i data-lucide="download" style="width:12px; height:12px"></i> Unduh Laporan
                </a>
              </div>
            `;
          }

          let errorMsg = j.error ? `<div style="color:var(--danger); font-size:0.75rem; margin-top:5px; max-height:80px; overflow-y:auto; font-family:monospace;">${j.error}</div>` : '';
          let resultMsg = j.status === 'completed' && j.type === 'sync_warehouses' ? `<div style="color:var(--success); font-size:0.8rem; margin-top:5px;">${j.result}</div>` : '';

          html += `
            <div class="notif-item" style="border-left-width: 4px; border-left-color: ${j.status === 'completed' ? 'var(--success)' : j.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)'}">
              <div class="notif-header">
                <span style="font-weight:700;">Job #${j.id}: ${j.type === 'generate_report' ? 'Laporan Inventaris' : 'Sinkronisasi Gudang'}</span>
                <span>${statusBadge}</span>
              </div>
              <div class="notif-time" style="margin-bottom:5px;">Mulai: ${j.created_at} | Selesai: ${j.updated_at || '-'}</div>
              ${resultMsg}
              ${errorMsg}
              ${downloadLink}
            </div>
          `;
        });
        panel.innerHTML = html;
        lucide.createIcons();
      }
    });
}

function enqueueReportJob() {
  fetch('/api/jobs/report', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken }
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    if (data.success) loadJobs();
  });
}

function enqueueSyncJob() {
  fetch('/api/jobs/sync', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken }
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    if (data.success) loadJobs();
  });
}

// ==========================================
// 11. AUDIT LOGS DISPLAY (Admin Only)
// ==========================================
function loadLogs() {
  const action = document.getElementById('log-search').value;
  const severity = document.getElementById('log-filter-severity').value;

  fetch(`/api/monitoring/logs?action=${encodeURIComponent(action)}&severity=${severity}&page=${logPage}&limit=${logLimit}`, {
    headers: { 'x-csrf-token': csrfToken }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      let html = '';
      if (data.data.length === 0) {
        html = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Tidak ada log audit.</td></tr>';
        document.getElementById('log-table-body').innerHTML = html;
        document.getElementById('log-pagination-info').innerText = 'Menampilkan 0 dari 0';
        return;
      }

      data.data.forEach(l => {
        let badge = 'badge-secondary';
        if (l.severity === 'critical') badge = 'badge-danger';
        else if (l.severity === 'warning') badge = 'badge-warning';

        html += `
          <tr>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${l.created_at}</td>
            <td><strong>${l.username || 'system'}</strong></td>
            <td><code style="background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${l.action}</code></td>
            <td>${l.entity || '-'}</td>
            <td><span class="badge ${badge}">${l.severity}</span></td>
            <td style="font-size: 0.85rem; max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.details}">${l.details}</td>
          </tr>
        `;
      });
      document.getElementById('log-table-body').innerHTML = html;

      const pag = data.pagination;
      document.getElementById('log-pagination-info').innerText = `Halaman ${pag.page} dari ${pag.pages || 1} (Total: ${pag.total} log)`;
      document.getElementById('log-prev-btn').disabled = pag.page <= 1;
      document.getElementById('log-next-btn').disabled = pag.page >= pag.pages;
    }
  });
}

function prevLogPage() { if (logPage > 1) { logPage--; loadLogs(); } }
function nextLogPage() { logPage++; loadLogs(); }

// ==========================================
// 12. USER MANAGEMENT (Admin Only)
// ==========================================
function loadUsers() {
  fetch('/api/auth/users', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let html = '';
        data.data.forEach(u => {
          const statusBadge = u.is_active === 1 
            ? '<span class="badge badge-success">Aktif</span>' 
            : '<span class="badge badge-secondary">Nonaktif</span>';

          html += `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td>${u.full_name}</td>
              <td>${u.email}</td>
              <td><span class="badge badge-info" style="text-transform: uppercase;">${u.role}</span></td>
              <td>${u.warehouse_name || 'Semua Gudang / Global'}</td>
              <td style="font-size: 0.85rem; color:var(--text-muted);">${u.last_login || '-'}</td>
              <td>${statusBadge}</td>
              <td>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editUser(${u.id})">Edit</button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; color: var(--danger); border-color: rgba(239,68,68,0.2)" onclick="deleteUser(${u.id})">Hapus</button>
              </td>
            </tr>
          `;
        });
        document.getElementById('users-table-body').innerHTML = html;
      }
    });
}

function openUserModal() {
  document.getElementById('user-form').reset();
  document.getElementById('user-form-id').value = '';
  document.getElementById('user-modal-title').innerText = 'Tambah Pengguna';
  document.getElementById('pw-required-text').style.display = 'none';
  document.getElementById('user-form-username').disabled = false;
  document.getElementById('user-form-password').setAttribute('required', 'required');
  checkPasswordStrength('');
  toggleUserFormWarehouse();
  openModal('user-modal');
}

function editUser(id) {
  fetch('/api/auth/users', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const u = data.data.find(usr => usr.id === id);
        if (u) {
          document.getElementById('user-form-id').value = u.id;
          document.getElementById('user-form-username').value = u.username;
          document.getElementById('user-form-username').disabled = true; // username locked
          document.getElementById('user-form-fullname').value = u.full_name;
          document.getElementById('user-form-email').value = u.email;
          document.getElementById('user-form-role').value = u.role;
          
          toggleUserFormWarehouse();
          document.getElementById('user-form-warehouse').value = u.warehouse_id || '';
          
          document.getElementById('user-form-password').removeAttribute('required');
          document.getElementById('pw-required-text').style.display = 'inline';
          document.getElementById('user-modal-title').innerText = 'Edit Pengguna';
          checkPasswordStrength('');
          openModal('user-modal');
        }
      }
    });
}

function deleteUser(id) {
  if (confirm('Hapus user ini secara permanen?')) {
    fetch(`/api/auth/users/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken }
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) loadUsers();
    });
  }
}

function toggleUserFormWarehouse() {
  const role = document.getElementById('user-form-role').value;
  const group = document.getElementById('user-form-wh-group');
  if (['manager', 'staff'].includes(role)) {
    group.style.display = 'block';
  } else {
    group.style.display = 'none';
    document.getElementById('user-form-warehouse').value = '';
  }
}

function checkPasswordStrength(pw) {
  const bars = document.querySelectorAll('#password-strength-meter .strength-bar');
  const txt = document.getElementById('password-strength-text');
  
  bars.forEach(b => b.className = 'strength-bar');
  if (!pw) {
    txt.innerText = 'Password minimal 8 karakter';
    txt.style.color = 'var(--text-muted)';
    return;
  }

  const length = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);

  let score = 0;
  if (length) score++;
  if (hasUpper && hasLower) score++;
  if (hasDigit && hasSpecial) score++;

  if (score === 1) {
    bars[0].classList.add('weak');
    txt.innerText = 'Sangat Lemah (Butuh huruf besar/kecil, angka, simbol)';
    txt.style.color = 'var(--danger)';
  } else if (score === 2) {
    bars[0].classList.add('medium');
    bars[1].classList.add('medium');
    txt.innerText = 'Sedang (Tambahkan karakter spesial atau angka)';
    txt.style.color = 'var(--warning)';
  } else if (score === 3) {
    bars.forEach(b => b.classList.add('strong'));
    txt.innerText = 'Sangat Kuat!';
    txt.style.color = 'var(--success)';
  }
}

// ==========================================
// 12. AUXILIARY: DROPDOWNS & MODALS CONTROL
// ==========================================
function loadDropdownOptions() {
  // Load Categories Dropdown
  fetch('/api/categories/all', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let options = '<option value="">Semua Kategori</option>';
        let formOptions = '';
        data.data.forEach(c => {
          options += `<option value="${c.id}">${c.name}</option>`;
          formOptions += `<option value="${c.id}">${c.name} (${c.code})</option>`;
        });
        document.getElementById('prod-filter-category').innerHTML = options;
        document.getElementById('prod-form-category').innerHTML = formOptions;
      }
    });

  // Load Suppliers Dropdown
  fetch('/api/suppliers/all', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let options = '<option value="">Semua Supplier</option>';
        let formOptions = '';
        data.data.forEach(s => {
          options += `<option value="${s.id}">${s.name}</option>`;
          formOptions += `<option value="${s.id}">${s.name} (${s.code})</option>`;
        });
        document.getElementById('prod-filter-supplier').innerHTML = options;
        document.getElementById('prod-form-supplier').innerHTML = formOptions;
      }
    });

  // Load Warehouses Dropdown
  fetch('/api/warehouses/all', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let filterOpts = '<option value="">Semua Gudang</option>';
        let formOpts = '';
        data.data.forEach(w => {
          filterOpts += `<option value="${w.id}">${w.name}</option>`;
          formOpts += `<option value="${w.id}">${w.name} (${w.code})</option>`;
        });
        document.getElementById('tx-filter-warehouse').innerHTML = filterOpts;
        document.getElementById('tx-form-warehouse').innerHTML = formOpts;
        document.getElementById('trf-form-from').innerHTML = formOpts;
        document.getElementById('trf-form-to').innerHTML = formOpts;
        document.getElementById('user-form-warehouse').innerHTML = '<option value="">Pilih Gudang Penugasan</option>' + formOpts;
      }
    });

  // Load Products Dropdown (for transactions & transfer forms)
  fetch('/api/products/all', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let opts = '';
        data.data.forEach(p => {
          opts += `<option value="${p.id}">${p.name} (${p.code})</option>`;
        });
        document.getElementById('tx-form-product').innerHTML = opts;
        document.getElementById('trf-form-product').innerHTML = opts;
        
        // Load valuation calculator product list too
        document.getElementById('valuation-product-select').innerHTML = '<option value="">-- Pilih Produk untuk Evaluasi --</option>' + opts;
      }
    });
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ==========================================
// 13. FORM SUBMISSION INTERCEPTIONS
// ==========================================
function setupForms() {
  // Login
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        csrfToken = data.csrfToken;
        onLoginSuccess();
      } else {
        alert(data.message);
      }
    })
    .catch(() => alert('Terjadi kesalahan koneksi server.'));
  });

  // Product CRUD Form
  document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-form-id').value;
    const formData = new FormData(document.getElementById('product-form'));
    
    // Convert text inputs to append
    formData.append('code', document.getElementById('prod-form-code').value);
    formData.append('name', document.getElementById('prod-form-name').value);
    formData.append('category_id', document.getElementById('prod-form-category').value);
    formData.append('supplier_id', document.getElementById('prod-form-supplier').value);
    formData.append('unit', document.getElementById('prod-form-unit').value);
    formData.append('price', document.getElementById('prod-form-price').value);
    formData.append('min_stock', document.getElementById('prod-form-minstock').value);
    formData.append('description', document.getElementById('prod-form-desc').value);
    
    const fileInput = document.getElementById('prod-form-image');
    if (fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'x-csrf-token': csrfToken },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('product-modal');
        loadProducts();
        loadDropdownOptions(); // Refresh dropdown references
      }
    });
  });

  // Category Form
  document.getElementById('category-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('cat-form-id').value;
    const body = {
      code: document.getElementById('cat-form-code').value,
      name: document.getElementById('cat-form-name').value,
      description: document.getElementById('cat-form-desc').value
    };

    const url = id ? `/api/categories/${id}` : '/api/categories';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('category-modal');
        loadCategories();
        loadDropdownOptions();
      }
    });
  });

  // Supplier Form
  document.getElementById('supplier-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('sup-form-id').value;
    const body = {
      code: document.getElementById('sup-form-code').value,
      name: document.getElementById('sup-form-name').value,
      contact_person: document.getElementById('sup-form-cp').value,
      phone: document.getElementById('sup-form-phone').value,
      city: document.getElementById('sup-form-city').value,
      email: document.getElementById('sup-form-email').value,
      address: document.getElementById('sup-form-address').value
    };

    const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('supplier-modal');
        loadSuppliers();
        loadDropdownOptions();
      }
    });
  });

  // Warehouse Form
  document.getElementById('warehouse-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('wh-form-id').value;
    const body = {
      code: document.getElementById('wh-form-code').value,
      name: document.getElementById('wh-form-name').value,
      city: document.getElementById('wh-form-city').value,
      capacity: document.getElementById('wh-form-capacity').value,
      latitude: document.getElementById('wh-form-lat').value,
      longitude: document.getElementById('wh-form-lng').value,
      manager_name: document.getElementById('wh-form-mgr').value,
      phone: document.getElementById('wh-form-phone').value,
      address: document.getElementById('wh-form-address').value
    };

    const url = id ? `/api/warehouses/${id}` : '/api/warehouses';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('warehouse-modal');
        loadWarehouses();
        loadDashboardData();
        loadDropdownOptions();
      }
    });
  });

  // Transaction Log Form
  document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const body = {
      type: document.getElementById('tx-form-type').value,
      product_id: document.getElementById('tx-form-product').value,
      warehouse_id: document.getElementById('tx-form-warehouse').value,
      quantity: document.getElementById('tx-form-qty').value,
      price_per_unit: document.getElementById('tx-form-price').value,
      reference_no: document.getElementById('tx-form-ref').value,
      note: document.getElementById('tx-form-note').value
    };

    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('transaction-modal');
        loadTransactions();
        loadDashboardData();
      }
    });
  });

  // Warehouse Transfer Form
  document.getElementById('transfer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const body = {
      product_id: document.getElementById('trf-form-product').value,
      from_warehouse_id: document.getElementById('trf-form-from').value,
      to_warehouse_id: document.getElementById('trf-form-to').value,
      quantity: document.getElementById('trf-form-qty').value,
      note: document.getElementById('trf-form-note').value
    };

    fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('transfer-modal');
        loadTransfers();
      }
    });
  });

  // User Form
  document.getElementById('user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('user-form-id').value;
    const body = {
      username: document.getElementById('user-form-username').value,
      full_name: document.getElementById('user-form-fullname').value,
      email: document.getElementById('user-form-email').value,
      role: document.getElementById('user-form-role').value,
      warehouse_id: document.getElementById('user-form-warehouse').value || null,
      password: document.getElementById('user-form-password').value || undefined
    };

    const url = id ? `/api/auth/users/${id}` : '/api/auth/users';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        closeModal('user-modal');
        loadUsers();
      }
    });
  });

  // CSV Batch Parallel Import
  document.getElementById('csv-import-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput.files[0]) return;

    const formData = new FormData();
    formData.append('csvFile', fileInput.files[0]);

    const resBox = document.getElementById('csv-import-result');
    resBox.style.display = 'block';
    resBox.innerHTML = '<span style="color:var(--warning);" class="animate-pulse-slow">Sedang mengimpor data produk secara paralel...</span>';

    fetch('/api/jobs/import-csv', {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let errHtml = '';
        if (data.errors.length > 0) {
          errHtml = `
            <div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
              <strong style="color:var(--danger)">Kesalahan baris (${data.errors.length}):</strong>
              <div style="max-height:100px; overflow-y:auto; font-size:0.75rem; font-family:monospace; margin-top:5px;">
                ${data.errors.map(er => `<li>Baris ${er.row}: ${er.error}</li>`).join('')}
              </div>
            </div>
          `;
        }
        resBox.innerHTML = `
          <strong style="color:var(--success)">Impor Selesai!</strong>
          <div>Produk Berhasil Diimpor/Update: <strong>${data.imported}</strong></div>
          <div>Gagal: <strong>${data.errors.length}</strong></div>
          ${errHtml}
        `;
        loadProducts();
        loadDropdownOptions();
      } else {
        resBox.innerHTML = `<span style="color:var(--danger)">Gagal Impor: ${data.message}</span>`;
      }
    })
    .catch(err => {
      resBox.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
    });
  });
}

// ==========================================
// 14. REPORT GENERATION (PDF) VISUAL PRINT
// ==========================================
function exportDashboardPDF() {
  const printWindow = window.open('', '_blank');
  
  // Compile summary of inventory levels
  fetch('/api/dashboard/stats', { headers: { 'x-csrf-token': csrfToken } })
    .then(res => res.json())
    .then(data => {
      const kpis = data.kpis;
      const cats = data.charts.stockByCategory;
      const whs = data.charts.stockByWarehouse;

      let catRows = cats.map(c => `
        <tr>
          <td>${c.category}</td>
          <td>${c.total_stock} unit</td>
          <td>Rp ${c.value.toLocaleString('id-ID')}</td>
        </tr>
      `).join('');

      let whRows = whs.map(w => `
        <tr>
          <td>${w.warehouse}</td>
          <td>${w.city}</td>
          <td>${w.total_stock} / ${w.capacity} unit</td>
          <td>${Math.round((w.total_stock / w.capacity) * 100)}%</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
        <head>
          <title>SmartStock Pro - Laporan Ringkasan Aset Eksekutif</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header-container { display: flex; justify-content: space-between; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #6366f1; }
            .meta { text-align: right; font-size: 12px; color: #64748b; }
            .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
            
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
            .kpi-box h4 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; color: #64748b; }
            .kpi-box div { font-size: 18px; font-weight: 800; color: #0f172a; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
            th { background: #f1f5f9; color: #334155; font-weight: 600; }
            tr:nth-child(even) td { background: #f8fafc; }
            
            .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; }
            .sig-box { width: 200px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; margin-top: 60px; }
            
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 10px;">
            <button onclick="window.print()" style="padding:8px 16px; background:#6366f1; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Cetak / Simpan PDF</button>
          </div>
          <div class="header-container">
            <div>
              <div class="logo">SmartStock Pro</div>
              <div style="font-size:12px; color:#64748b;">Sistem Manajemen Gudang & Inventaris Real-Time</div>
            </div>
            <div class="meta">
              <strong>PT Maju Bersama Digital</strong><br>
              Dicetak pada: ${new Date().toLocaleString('id-ID')}<br>
              Oleh: ${currentUser.full_name} (${currentUser.role})
            </div>
          </div>

          <div class="title">Laporan Ringkasan Aset Eksekutif</div>

          <div class="kpi-grid">
            <div class="kpi-box">
              <h4>Total Katalog Produk</h4>
              <div>${kpis.totalProducts} Item</div>
            </div>
            <div class="kpi-box">
              <h4>Total Gudang Aktif</h4>
              <div>${kpis.totalWarehouses} Kota</div>
            </div>
            <div class="kpi-box">
              <h4>Nilai Total Inventaris</h4>
              <div>Rp ${kpis.inventoryVal.toLocaleString('id-ID')}</div>
            </div>
            <div class="kpi-box">
              <h4>Peringatan Stok Kritis</h4>
              <div style="color:#ef4444;">${kpis.criticalStockAlerts} Item</div>
            </div>
          </div>

          <h3>Distribusi Stok Berdasarkan Kategori</h3>
          <table>
            <thead>
              <tr>
                <th>Kategori Produk</th>
                <th>Total Kuantitas Stok</th>
                <th>Nilai Total Aset</th>
              </tr>
            </thead>
            <tbody>
              ${catRows}
            </tbody>
          </table>

          <h3>Utilisasi Kapasitas Gudang Kota</h3>
          <table>
            <thead>
              <tr>
                <th>Nama Gudang</th>
                <th>Kota Lokasi</th>
                <th>Kapasitas Terpakai</th>
                <th>Utilisasi (%)</th>
              </tr>
            </thead>
            <tbody>
              ${whRows}
            </tbody>
          </table>

          <div class="footer-sig">
            <div>
              Dibuat Oleh,<br>
              <div class="sig-box">${currentUser.full_name}</div>
            </div>
            <div>
              Mengetahui,<br>
              <div class="sig-box">Direktur Inventaris</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    });
}
