let products = [];
let cart = [];
let currentUser = null;

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 3600);
}

function loadUserProducts() {
    const saved = localStorage.getItem(`products_${currentUser}`);
    if (saved) {
        products = JSON.parse(saved);
    } else {
        // Default Mock Data
        products = [
            { id: '750101', name: 'Coca-Cola 600ml', category: 'Bebidas', purchasePrice: 12.00, salePrice: 18.00, stock: 45, icon: 'fa-bottle-water' },
            { id: '750102', name: 'Leche Entera 1L', category: 'Lácteos', purchasePrice: 19.50, salePrice: 26.50, stock: 12, icon: 'fa-glass-water' },
            { id: '750103', name: 'Pan Blanco Bimbo', category: 'Panadería', purchasePrice: 35.00, salePrice: 45.00, stock: 4, icon: 'fa-bread-slice' },
            { id: '750104', name: 'Sabritas Sal 170g', category: 'Botanas', purchasePrice: 15.00, salePrice: 22.00, stock: 8, icon: 'fa-cookie' },
            { id: '750105', name: 'Huevos Docena', category: 'Abarrotes', purchasePrice: 32.00, salePrice: 42.00, stock: 100, icon: 'fa-egg' },
            { id: '750106', name: 'Frijoles Lata 400g', category: 'Abarrotes', purchasePrice: 14.00, salePrice: 19.00, stock: 2, icon: 'fa-box' },
            { id: '750107', name: 'Queso Panela 400g', category: 'Lácteos', purchasePrice: 40.00, salePrice: 55.00, stock: 5, icon: 'fa-cheese' },
            { id: '750108', name: 'Manzana Gala 1Kg', category: 'Frutas', purchasePrice: 30.00, salePrice: 45.00, stock: 15, icon: 'fa-apple-whole' }
        ];
        saveUserProducts();
    }
}

function saveUserProducts() {
    if (currentUser) {
        localStorage.setItem(`products_${currentUser}`, JSON.stringify(products));
    }
}

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const cartItemsContainer = document.getElementById('cart-items');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartTotalEl = document.getElementById('cart-total');
const barcodeScanner = document.getElementById('barcode-scanner');
const inventoryTableBody = document.getElementById('inventory-table-body');

// Modal Elements
const checkoutModal = document.getElementById('checkout-modal');
const amountPaidInput = document.getElementById('amount-paid');
const modalTotalAmount = document.getElementById('modal-total-amount');
const modalChangeAmount = document.getElementById('modal-change-amount');
const confirmCheckoutBtn = document.getElementById('confirm-checkout-btn');
const cancelCheckoutBtn = document.getElementById('cancel-checkout-btn');

let currentSubtotal = 0;

// Initialize
function init() {
    loadUserProducts();
    document.querySelector('.user-info .details .name').textContent = currentUser;
    renderProducts();
    renderInventory();
    renderReports();
    renderUsers();
    setupNavigation();
    setupScanner();
}

// Render Products in POS
function renderProducts(filter = '') {
    productsGrid.innerHTML = '';
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase()) || 
        p.id.includes(filter)
    );

    filtered.forEach(product => {
        const isLowStock = product.stock <= 5;
        const card = document.createElement('div');
        card.className = `product-card ${isLowStock ? 'low-stock' : ''}`;
        card.innerHTML = `
            <i class="fa-solid ${product.icon} icon"></i>
            <h4>${product.name}</h4>
            <div class="price">$${product.salePrice.toFixed(2)}</div>
            <span class="stock">${product.stock} disponibles</span>
        `;
        card.onclick = () => addToCart(product);
        productsGrid.appendChild(card);
    });
}

// Cart Logic
function addToCart(product) {
    if (product.stock <= 0) {
        showToast('Producto sin stock', 'error');
        return;
    }
    
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
        if (existing.qty < product.stock) {
            existing.qty++;
        } else {
            showToast('No hay suficiente stock', 'error');
        }
    } else {
        cart.push({ product, qty: 1 });
    }
    updateCartUI();
}

function updateCartQty(productId, delta) {
    const item = cart.find(i => i.product.id === productId);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.product.id !== productId);
        } else if (item.qty > item.product.stock) {
            item.qty = item.product.stock;
            showToast('Stock máximo alcanzado', 'error');
        }
    }
    updateCartUI();
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    currentSubtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.product.salePrice * item.qty;
        currentSubtotal += itemTotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-info">
                <h5>${item.product.name}</h5>
                <div class="cart-item-price">$${item.product.salePrice.toFixed(2)} c/u</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateCartQty('${item.product.id}', -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${item.product.id}', 1)">+</button>
            </div>
            <div style="font-weight: bold;">$${itemTotal.toFixed(2)}</div>
        `;
        cartItemsContainer.appendChild(el);
    });

    cartSubtotalEl.textContent = `$${currentSubtotal.toFixed(2)}`;
    cartTotalEl.textContent = `$${currentSubtotal.toFixed(2)}`;
}

// Checkout Process
document.getElementById('checkout-btn').addEventListener('click', () => {
    if (cart.length === 0) return showToast('El ticket está vacío', 'error');
    
    checkoutModal.classList.remove('hidden');
    modalTotalAmount.textContent = `$${currentSubtotal.toFixed(2)}`;
    amountPaidInput.value = '';
    modalChangeAmount.textContent = '$0.00';
    confirmCheckoutBtn.disabled = true;
    setTimeout(() => amountPaidInput.focus(), 100);
});

amountPaidInput.addEventListener('input', (e) => {
    const paid = parseFloat(e.target.value) || 0;
    if (paid >= currentSubtotal) {
        modalChangeAmount.textContent = `$${(paid - currentSubtotal).toFixed(2)}`;
        confirmCheckoutBtn.disabled = false;
    } else {
        modalChangeAmount.textContent = '$0.00';
        confirmCheckoutBtn.disabled = true;
    }
});

amountPaidInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !confirmCheckoutBtn.disabled) {
        confirmCheckoutBtn.click();
    }
});

cancelCheckoutBtn.addEventListener('click', () => {
    checkoutModal.classList.add('hidden');
});

confirmCheckoutBtn.addEventListener('click', () => {
    // Update stock
    cart.forEach(item => {
        const product = products.find(p => p.id === item.product.id);
        if (product) {
            product.stock -= item.qty;
        }
    });
    saveUserProducts();

    const paid = parseFloat(amountPaidInput.value);
    const change = paid - currentSubtotal;

    // Save sale for reports
    const sale = {
        date: new Date().toLocaleString(),
        items: cart.reduce((acc, item) => acc + item.qty, 0),
        total: currentSubtotal,
        profit: cart.reduce((acc, item) => acc + ((item.product.salePrice - item.product.purchasePrice) * item.qty), 0)
    };
    let sales = JSON.parse(localStorage.getItem(`sales_${currentUser}`) || '[]');
    sales.push(sale);
    localStorage.setItem(`sales_${currentUser}`, JSON.stringify(sales));

    showToast(`Venta procesada. Cambio: $${change.toFixed(2)}`, 'success');
    checkoutModal.classList.add('hidden');
    cart = [];
    updateCartUI();
    renderProducts();
    renderInventory();
    renderReports();
});

document.querySelector('.clear-cart-btn').addEventListener('click', () => {
    cart = [];
    updateCartUI();
});

// Scanner Simulation
function setupScanner() {
    barcodeScanner.addEventListener('input', (e) => {
        const val = e.target.value;
        renderProducts(val);
    });
    
    // Simulating pressing enter with a barcode scanner
    barcodeScanner.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = e.target.value;
            const product = products.find(p => p.id === val);
            if (product) {
                addToCart(product);
                e.target.value = '';
                renderProducts();
            }
        }
    });
}

// Render Inventory Table
function renderInventory() {
    inventoryTableBody.innerHTML = '';
    products.forEach(p => {
        const isLow = p.stock <= 5;
        const tr = document.createElement('tr');
        tr.id = `row-${p.id}`;
        
        tr.innerHTML = `
            <td><span class="view-mode">${p.id}</span><input type="text" class="edit-input edit-mode" value="${p.id}" style="display:none;" id="edit-id-${p.id}"></td>
            <td><span class="view-mode">${p.name}</span><input type="text" class="edit-input edit-mode" value="${p.name}" style="display:none;" id="edit-name-${p.id}"></td>
            <td><span class="view-mode">${p.category}</span><input type="text" class="edit-input edit-mode" value="${p.category}" style="display:none;" id="edit-cat-${p.id}"></td>
            <td><span class="badge ${isLow ? 'stock-low' : 'stock-ok'} view-mode">${p.stock}</span><input type="number" class="edit-input edit-mode" value="${p.stock}" style="display:none;" id="edit-stock-${p.id}"></td>
            <td><span class="view-mode">$${p.purchasePrice.toFixed(2)}</span><input type="number" step="0.01" class="edit-input edit-mode" value="${p.purchasePrice}" style="display:none;" id="edit-purchase-${p.id}"></td>
            <td><span class="view-mode">$${p.salePrice.toFixed(2)}</span><input type="number" step="0.01" class="edit-input edit-mode" value="${p.salePrice}" style="display:none;" id="edit-sale-${p.id}"></td>
            <td>
                <button class="btn-primary view-mode" onclick="toggleEdit('${p.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-primary edit-mode" onclick="saveEdit('${p.id}')" style="display:none; padding: 0.4rem 0.8rem; font-size: 0.8rem; background-color: var(--success);"><i class="fa-solid fa-check"></i></button>
            </td>
        `;
        inventoryTableBody.appendChild(tr);
    });
}

function toggleEdit(id) {
    const row = document.getElementById(`row-${id}`);
    const views = row.querySelectorAll('.view-mode');
    const edits = row.querySelectorAll('.edit-mode');
    
    views.forEach(v => v.style.display = 'none');
    edits.forEach(e => e.style.display = 'inline-block');
}

function saveEdit(id) {
    const p = products.find(prod => prod.id === id);
    if(p) {
        const newId = document.getElementById(`edit-id-${id}`).value;
        p.id = newId;
        p.name = document.getElementById(`edit-name-${id}`).value;
        p.category = document.getElementById(`edit-cat-${id}`).value;
        p.stock = parseInt(document.getElementById(`edit-stock-${id}`).value) || 0;
        p.purchasePrice = parseFloat(document.getElementById(`edit-purchase-${id}`).value) || 0;
        p.salePrice = parseFloat(document.getElementById(`edit-sale-${id}`).value) || 0;
        
        saveUserProducts();
        renderInventory();
        renderProducts();
    }
}

// Navigation
function setupNavigation() {
    const links = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view-section');

    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetView = link.getAttribute('data-view');
            views.forEach(v => {
                v.classList.remove('active');
                if (v.id === `${targetView}-view`) {
                    v.classList.add('active');
                }
            });
            
            if (targetView === 'pos') {
                barcodeScanner.focus();
            }
        });
    });
}

// Reports & Users
function renderReports() {
    const sales = JSON.parse(localStorage.getItem(`sales_${currentUser}`) || '[]');
    const statsGrid = document.getElementById('stats-grid');
    const salesTable = document.getElementById('sales-table-body');
    
    let totalIncome = 0;
    let totalProfit = 0;
    let totalItems = 0;
    
    salesTable.innerHTML = '';
    
    // Sort latest first
    sales.slice().reverse().forEach(sale => {
        totalIncome += sale.total;
        totalProfit += sale.profit;
        totalItems += sale.items;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sale.date}</td>
            <td>${sale.items}</td>
            <td>$${sale.total.toFixed(2)}</td>
            <td style="color: var(--success); font-weight: bold;">$${sale.profit.toFixed(2)}</td>
        `;
        salesTable.appendChild(tr);
    });

    statsGrid.innerHTML = `
        <div class="stat-card">
            <h4>Ventas Totales</h4>
            <div class="value">${sales.length}</div>
        </div>
        <div class="stat-card">
            <h4>Artículos Vendidos</h4>
            <div class="value">${totalItems}</div>
        </div>
        <div class="stat-card">
            <h4>Ingresos Brutos</h4>
            <div class="value">$${totalIncome.toFixed(2)}</div>
        </div>
        <div class="stat-card">
            <h4>Ganancia Estimada</h4>
            <div class="value success">$${totalProfit.toFixed(2)}</div>
        </div>
    `;
}

function renderUsers() {
    const usersTable = document.getElementById('users-table-body');
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    usersTable.innerHTML = '';
    for (const [username, pass] of Object.entries(users)) {
        const isCurrent = username === currentUser;
        const role = username === 'admin' ? 'Administrador' : 'Cajero';
        const status = isCurrent ? '<span class="badge stock-ok">Activo Ahora</span>' : '<span class="badge" style="background: rgba(255,255,255,0.1);">Desconectado</span>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${username}</strong></td>
            <td>${role}</td>
            <td>${status}</td>
        `;
        usersTable.appendChild(tr);
    }
}

// Excel Export
document.getElementById('btn-export-excel').addEventListener('click', () => {
    const data = products.map(p => ({
        "Código": p.id,
        "Producto": p.name,
        "Categoría": p.category,
        "Stock": p.stock,
        "Precio Compra": p.purchasePrice,
        "Precio Venta": p.salePrice
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `${currentUser}_inventario.xlsx`);
});

// Excel Import
document.getElementById('btn-import-excel').addEventListener('click', () => {
    document.getElementById('file-import').click();
});

document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json && json.length > 0) {
                products = json.map(row => ({
                    id: (row['Código'] || '').toString(),
                    name: row['Producto'] || 'Desconocido',
                    category: row['Categoría'] || 'General',
                    stock: parseInt(row['Stock']) || 0,
                    purchasePrice: parseFloat(row['Precio Compra']) || 0,
                    salePrice: parseFloat(row['Precio Venta']) || 0,
                    icon: 'fa-box'
                }));
                saveUserProducts();
                renderInventory();
                renderProducts();
                showToast('Inventario importado con éxito', 'success');
            } else {
                showToast('El archivo Excel está vacío', 'error');
            }
        } catch (err) {
            showToast('Error al leer el archivo. Verifica el formato.', 'error');
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
});

// Auth Logic
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');

document.getElementById('btn-login').addEventListener('click', () => {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    if (user === 'admin' && pass === 'admin') { // Admin backdoor
        users[user] = pass;
        localStorage.setItem('app_users', JSON.stringify(users));
    }

    if (users[user] && users[user] === pass) {
        currentUser = user;
        loginScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        init();
        showToast(`Bienvenido ${user}`, 'success');
    } else {
        showToast('Usuario o contraseña incorrectos.', 'error');
    }
});

document.getElementById('btn-register').addEventListener('click', () => {
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    if (!user || !pass) return showToast('Completa ambos campos', 'error');
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    if (users[user]) return showToast('El usuario ya existe', 'error');
    
    users[user] = pass;
    localStorage.setItem('app_users', JSON.stringify(users));
    showToast('Cuenta creada exitosamente. Inicia sesión.', 'success');
    document.getElementById('btn-show-login').click();
});

document.getElementById('btn-show-register').addEventListener('click', () => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
});

document.getElementById('btn-show-login').addEventListener('click', () => {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

// Wait for login instead of init() at boot
