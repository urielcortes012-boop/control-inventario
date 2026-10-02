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
    const saved = localStorage.getItem(`products_global`);
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
        localStorage.setItem(`products_global`, JSON.stringify(products));
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
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    const u = users[currentUser] || {};
    
    document.querySelector('.user-info .details .name').textContent = u.name || currentUser;
    document.querySelector('.user-info .details .role').textContent = u.role || 'Cajero';
    
    const avatarEl = document.getElementById('sidebar-avatar');
    if (u.avatar) {
        avatarEl.innerHTML = `<img src="${u.avatar}" alt="Avatar">`;
    } else {
        avatarEl.innerHTML = `<img src="avatar1.jpg" alt="Avatar">`;
    }
    
    // Check if password reset is needed
    if (users[currentUser] && users[currentUser].needsPasswordUpdate) {
        document.getElementById('password-warning-banner').style.display = 'block';
        document.getElementById('change-old-pwd').parentElement.style.display = 'none'; // hide old pwd
    } else {
        document.getElementById('password-warning-banner').style.display = 'none';
        document.getElementById('change-old-pwd').parentElement.style.display = 'flex';
    }

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
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    const uName = users[currentUser] ? (users[currentUser].name || currentUser) : 'Desconocido';
    const sale = {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        user: uName,
        items: cart.reduce((acc, item) => acc + item.qty, 0),
        total: currentSubtotal,
        profit: cart.reduce((acc, item) => acc + ((item.product.salePrice - item.product.purchasePrice) * item.qty), 0)
    };
    
    let sales = JSON.parse(localStorage.getItem(`sales_global`) || '[]');
    sales.push(sale);
    localStorage.setItem(`sales_global`, JSON.stringify(sales));

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
    const sales = JSON.parse(localStorage.getItem(`sales_global`) || '[]');
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
        
        const displayDate = sale.time ? sale.date : (sale.date.split(',')[0] || sale.date);
        const displayTime = sale.time ? sale.time : (sale.date.split(',')[1] || '--:--');
        const displayUser = sale.user || 'Desconocido';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${displayDate}</td>
            <td>${displayTime}</td>
            <td>${displayUser}</td>
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

let adminUnlocked = false;
let editingUserEmail = null;

function updateAvatarAvailability() {
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    const takenAvatars = Object.values(users).map(u => u.avatar).filter(a => a);
    
    ['reg-avatar', 'admin-avatar'].forEach(name => {
        document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            // Exclude current editing user's avatar from taken list if applicable
            let isTaken = takenAvatars.includes(radio.value);
            if (editingUserEmail && users[editingUserEmail] && users[editingUserEmail].avatar === radio.value) {
                isTaken = false;
            }
            
            if (isTaken) {
                radio.disabled = true;
                if (label) {
                    label.style.opacity = '0.3';
                    label.style.cursor = 'not-allowed';
                }
            } else {
                radio.disabled = false;
                if (label) {
                    label.style.opacity = '1';
                    label.style.cursor = 'pointer';
                }
            }
        });
    });
}

window.showPasswords = false;

document.getElementById('btn-toggle-passwords').addEventListener('click', () => {
    window.showPasswords = !window.showPasswords;
    renderUsers();
});

function renderUsers() {
    const usersTable = document.getElementById('users-table-body');
    let users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    if (adminUnlocked) {
        document.getElementById('admin-add-user-section').style.display = 'block';
        document.getElementById('change-password-section').style.display = 'block';
        document.getElementById('escalate-admin-section').style.display = 'none';
        document.getElementById('btn-toggle-passwords').style.display = 'inline-block';
        document.getElementById('btn-toggle-passwords').innerHTML = window.showPasswords ? '<i class="fa-solid fa-eye-slash"></i> Ocultar Contraseñas' : '<i class="fa-solid fa-eye"></i> Mostrar Contraseñas';
    } else {
        document.getElementById('admin-add-user-section').style.display = 'none';
        document.getElementById('change-password-section').style.display = 'none';
        document.getElementById('escalate-admin-section').style.display = 'block';
        document.getElementById('btn-toggle-passwords').style.display = 'none';
        window.showPasswords = false;
    }
    
    usersTable.innerHTML = '';
    for (const [email, userData] of Object.entries(users)) {
        const isCurrent = email === currentUser;
        const role = userData.role || (email === 'admin@d.artagnan' ? 'Administrador' : 'Cajero');
        const status = isCurrent ? '<span class="badge stock-ok">Activo Ahora</span>' : '<span class="badge" style="background: rgba(255,255,255,0.1);">Desconectado</span>';
        const realName = userData.name || 'Sin Nombre';
        
        let actions = '';
        if (adminUnlocked) {
            actions = `<button class="btn-secondary" onclick="editUser('${email}')" style="padding: 0.5rem; font-size: 1rem;" title="Editar"><i class="fa-solid fa-pen"></i></button>`;
        }
        
        let passDisplay = '********';
        if (adminUnlocked && window.showPasswords) {
            passDisplay = `<span style="font-family: monospace; letter-spacing: 1px;">${userData.pass}</span>`;
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 30px; height: 30px; border-radius: 50%; overflow: hidden; border: 1px solid var(--border-color); flex-shrink: 0;">
                        <img src="${userData.avatar || 'avatar1.jpg'}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    ${realName}
                </div>
            </td>
            <td><strong>${email}</strong></td>
            <td>${role}</td>
            <td>${status}</td>
            <td>${passDisplay}</td>
            <td>${actions}</td>
        `;
        usersTable.appendChild(tr);
    }
    updateAvatarAvailability();
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
    XLSX.writeFile(workbook, `Inventario_Dartagnan.xlsx`);
});

// Excel Export - Reports
document.getElementById('btn-export-reports').addEventListener('click', () => {
    const sales = JSON.parse(localStorage.getItem(`sales_global`) || '[]');
    if (sales.length === 0) {
        return showToast('No hay ventas para exportar', 'error');
    }
    const data = sales.map(s => {
        const displayDate = s.time ? s.date : (s.date.split(',')[0] || s.date);
        const displayTime = s.time ? s.time : (s.date.split(',')[1] || '--:--');
        const displayUser = s.user || 'Desconocido';
        
        return {
            "Fecha": displayDate,
            "Hora": displayTime,
            "Cajero": displayUser,
            "Artículos Vendidos": s.items,
            "Total Venta": s.total,
            "Ganancia Estimada": s.profit
        };
    });
    
    let totalIncome = 0;
    let totalProfit = 0;
    let totalItems = 0;
    sales.forEach(s => {
        totalIncome += s.total;
        totalProfit += s.profit;
        totalItems += s.items;
    });
    
    data.push({
        "Fecha": "TOTALES",
        "Hora": "",
        "Cajero": "",
        "Artículos Vendidos": totalItems,
        "Total Venta": totalIncome,
        "Ganancia Estimada": totalProfit
    });
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte_Ventas");
    XLSX.writeFile(workbook, `Reporte_Ventas_Dartagnan.xlsx`);
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

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.getElementById('btn-login').addEventListener('click', () => {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    if (!users['admin@d.artagnan']) {
        users['admin@d.artagnan'] = { name: 'Administrador Principal', pass: 'admin123', birthDate: '1990-01-01', secret: 'dartagnan', role: 'Administrador', avatar: 'avatar1.jpg' };
    } else {
        users['admin@d.artagnan'].role = 'Administrador';
        if (!users['admin@d.artagnan'].avatar) users['admin@d.artagnan'].avatar = 'avatar1.jpg';
    }
    localStorage.setItem('app_users', JSON.stringify(users));

    if (users[user] && users[user].pass === pass) {
        currentUser = user;
        
        // Remember email
        if (document.getElementById('remember-email').checked) {
            localStorage.setItem('saved_email', user);
        } else {
            localStorage.removeItem('saved_email');
        }
        
        // Save active session
        localStorage.setItem('active_session', user);

        loginScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        init();
        showToast(`Bienvenido ${user}`, 'success');
    } else {
        showToast('Usuario o contraseña incorrectos.', 'error');
    }
});

// Load saved email on startup & Auto login
window.addEventListener('DOMContentLoaded', () => {
    
    const savedEmail = localStorage.getItem('saved_email');
    if (savedEmail) {
        document.getElementById('login-username').value = savedEmail;
    }
    
    // Auto-login logic
    const activeSession = localStorage.getItem('active_session');
    if (activeSession) {
        const users = JSON.parse(localStorage.getItem('app_users') || '{}');
        if (users[activeSession]) {
            currentUser = activeSession;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            init();
        } else {
            localStorage.removeItem('active_session');
        }
    }
});

document.getElementById('btn-register').addEventListener('click', () => {
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    const birthDate = document.getElementById('reg-birth-date').value;
    const secret = document.getElementById('reg-secret').value.trim();
    
    if (!user || !pass || !birthDate || !secret) return showToast('Completa todos los campos', 'error');
    if (!isValidEmail(user)) return showToast('El usuario debe ser un correo válido', 'error');

    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    if (Object.keys(users).length >= 4) {
        return showToast('Límite máximo de 4 usuarios alcanzado', 'error');
    }

    if (users[user]) return showToast('El usuario ya existe', 'error');
    
    const avatarInput = document.querySelector('input[name="reg-avatar"]:checked');
    const avatar = avatarInput ? avatarInput.value : 'avatar1.jpg';
    
    users[user] = { pass, birthDate, secret, role: 'Cajero', name: user, avatar };
    localStorage.setItem('app_users', JSON.stringify(users));
    showToast('Cuenta creada exitosamente. Inicia sesión.', 'success');
    document.getElementById('btn-show-login').click();
});

document.getElementById('btn-show-register').addEventListener('click', () => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
});

document.getElementById('btn-show-login').addEventListener('click', () => {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

document.getElementById('link-forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.remove('hidden');
});

document.getElementById('btn-back-to-login').addEventListener('click', () => {
    document.getElementById('forgot-password-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

document.getElementById('btn-recover-password').addEventListener('click', () => {
    const email = document.getElementById('forgot-email').value.trim();
    const birthDate = document.getElementById('forgot-birth-date').value;
    const secret = document.getElementById('forgot-secret').value.trim();
    
    if (!email || !birthDate || !secret) return showToast('Completa todos los campos', 'error');
    
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    if (users[email] && users[email].birthDate === birthDate && users[email].secret.toLowerCase() === secret.toLowerCase()) {
        users[email].needsPasswordUpdate = true;
        localStorage.setItem('app_users', JSON.stringify(users));
        
        showToast(`Verificación exitosa. Iniciando sesión...`, 'success');
        document.getElementById('btn-back-to-login').click();
        
        // Direct login
        currentUser = email;
        adminUnlocked = true;
        localStorage.setItem('active_session', email); // Save active session
        loginScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        init();
        
    } else {
        showToast('Datos incorrectos. No se pudo recuperar.', 'error');
    }
});

// Change Password inside App
document.getElementById('btn-change-password').addEventListener('click', () => {
    const oldPwd = document.getElementById('change-old-pwd').value;
    const newPwd = document.getElementById('change-new-pwd').value;
    
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    const u = users[currentUser];

    if (u.needsPasswordUpdate) {
        if (!newPwd) return showToast('Ingresa la nueva contraseña', 'error');
    } else {
        if (!oldPwd || !newPwd) return showToast('Completa ambos campos', 'error');
        if (u.pass !== oldPwd) return showToast('La contraseña actual es incorrecta', 'error');
    }

    u.pass = newPwd;
    u.needsPasswordUpdate = false;
    localStorage.setItem('app_users', JSON.stringify(users));
    
    showToast('Contraseña actualizada correctamente', 'success');
    document.getElementById('change-old-pwd').value = '';
    document.getElementById('change-new-pwd').value = '';
    document.getElementById('password-warning-banner').style.display = 'none';
    document.getElementById('change-old-pwd').parentElement.style.display = 'block';
    renderUsers();
});

// Admin add/edit user logic

window.editUser = function(email) {
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    const u = users[email];
    if (u) {
        document.getElementById('admin-user-title').innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Usuario';
        document.getElementById('admin-user-email').value = email;
        document.getElementById('admin-user-email').disabled = (email === 'admin@d.artagnan');
        document.getElementById('admin-user-name').value = u.name || email;
        document.getElementById('admin-user-role').value = u.role || 'Cajero';
        document.getElementById('admin-user-pass').value = '';
        if (u.avatar) {
            const rad = document.querySelector(`input[name="admin-avatar"][value="${u.avatar}"]`);
            if (rad && !rad.disabled) rad.checked = true;
        }
        document.getElementById('btn-admin-cancel-user').style.display = 'inline-block';
        editingUserEmail = email;
        updateAvatarAvailability();
        
        // Scroll to the edit section if on a smaller screen where it might have wrapped
        document.getElementById('admin-add-user-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

document.getElementById('btn-admin-cancel-user').addEventListener('click', () => {
    document.getElementById('admin-user-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> Agregar Usuario';
    document.getElementById('admin-user-email').value = '';
    document.getElementById('admin-user-email').disabled = false;
    document.getElementById('admin-user-name').value = '';
    document.getElementById('admin-user-role').value = 'Cajero';
    document.getElementById('admin-user-pass').value = '';
    document.getElementById('btn-admin-cancel-user').style.display = 'none';
    editingUserEmail = null;
});

document.getElementById('btn-admin-save-user').addEventListener('click', () => {
    const email = document.getElementById('admin-user-email').value.trim();
    const name = document.getElementById('admin-user-name').value.trim() || email;
    const role = email === 'admin@d.artagnan' ? 'Administrador' : 'Cajero'; // Enforce Cajero
    const pass = document.getElementById('admin-user-pass').value;
    
    const avatarInput = document.querySelector('input[name="admin-avatar"]:checked');
    const avatar = avatarInput ? avatarInput.value : 'avatar1.jpg';
    
    if (!email) return showToast('Completa el correo electrónico', 'error');
    if (!isValidEmail(email)) return showToast('Debes ingresar un correo válido', 'error');
    if (!editingUserEmail && !pass) return showToast('Debes asignar una contraseña al nuevo usuario', 'error');
    
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    if (!editingUserEmail) {
        if (Object.keys(users).length >= 4) {
            return showToast('Límite de 4 usuarios alcanzado. Debes eliminar uno.', 'error');
        }
        if (users[email]) {
            return showToast('El usuario ya existe', 'error');
        }
        users[email] = { name, pass, role, birthDate: '2000-01-01', secret: '1234', avatar };
    } else {
        if (email !== editingUserEmail) {
            if (users[email]) {
                return showToast('El nuevo correo ya está en uso por otro usuario', 'error');
            }
            users[email] = users[editingUserEmail];
            delete users[editingUserEmail];
            
            if (currentUser === editingUserEmail) {
                currentUser = email;
                localStorage.setItem('active_session', email);
            }
        }
        
        users[email].name = name;
        users[email].role = role;
        users[email].avatar = avatar;
        if (pass) {
            users[email].pass = pass;
        }
    }
    
    localStorage.setItem('app_users', JSON.stringify(users));
    showToast(editingUserEmail ? 'Usuario actualizado' : 'Usuario creado con éxito', 'success');
    document.getElementById('btn-admin-cancel-user').click();
    renderUsers();
});

// Escalate Privileges & Exit Admin
document.getElementById('btn-escalate-admin').addEventListener('click', () => {
    const pwd = document.getElementById('escalate-admin-pwd').value;
    if (!pwd) return showToast('Ingresa la contraseña del administrador', 'error');
    
    const users = JSON.parse(localStorage.getItem('app_users') || '{}');
    
    // Check if entered password matches the real admin's password (admin@d.artagnan)
    const validAdmin = users['admin@d.artagnan'] && users['admin@d.artagnan'].pass === pwd;
    
    if (validAdmin) {
        adminUnlocked = true;
        showToast('¡Acceso concedido para gestionar usuarios!', 'success');
        document.getElementById('escalate-admin-pwd').value = '';
        renderUsers();
    } else {
        showToast('Contraseña de administrador incorrecta', 'error');
    }
});

document.getElementById('btn-exit-admin').addEventListener('click', () => {
    adminUnlocked = false;
    showToast('Modo administrador cerrado', 'success');
    renderUsers();
});

// Wait for login instead of init() at boot

// Logout dropdown logic
document.getElementById('user-info-btn').addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
});

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#user-info-btn')) {
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) dropdown.style.display = 'none';
    }
});

document.getElementById('btn-logout').addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.removeItem('active_session');
    currentUser = null;
    adminUnlocked = false;
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-password').value = '';
    document.getElementById('user-dropdown-menu').style.display = 'none';
    showToast('Sesión cerrada', 'success');
});
