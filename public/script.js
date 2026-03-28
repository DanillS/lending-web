// ============ ЗАГРУЗКА КАТАЛОГА ============
let allProducts = [];

async function loadCatalog() {
    const container = document.getElementById('catalogContainer');
    if (!container) return;
    
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        allProducts = data.products || data;
        renderProducts(allProducts);
    } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
        container.innerHTML = '<p style="text-align:center">Ошибка загрузки каталога</p>';
    }
}

function renderProducts(products) {
    const container = document.getElementById('catalogContainer');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p style="text-align:center">Товары не найдены</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-img" style="background-image: url('${product.image || '/images/placeholder.jpg'}')"></div>
            <div class="product-info">
                <div class="product-title">${escapeHtml(product.name)}</div>
                <div class="product-price">
                    ${formatPrice(product.price)} ₽
                    ${product.oldPrice ? `<span class="product-old-price">${formatPrice(product.oldPrice)} ₽</span>` : ''}
                </div>
                <div class="product-desc">${escapeHtml(product.description)}</div>
                <div style="margin-top: 16px;">
                    <button class="btn btn-sm btn-dark" onclick="openOrderForm('${escapeHtml(product.name)}')">Заказать</button>
                </div>
            </div>
        </div>
    `).join('');
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ============ ФИЛЬТРАЦИЯ ============
function filterByCategory(category) {
    if (category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === category);
        renderProducts(filtered);
    }
    
    // Активная кнопка
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
}

function searchProducts() {
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    if (!query) {
        renderProducts(allProducts);
        return;
    }
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
    );
    renderProducts(filtered);
}

function sortProducts() {
    const sortBy = document.getElementById('sortSelect')?.value || 'name';
    const sorted = [...allProducts];
    if (sortBy === 'price_asc') {
        sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
        sorted.sort((a, b) => b.price - a.price);
    } else {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    renderProducts(sorted);
}

// ============ ОТПРАВКА ЗАЯВКИ ============
async function submitOrder(event) {
    event.preventDefault();
    
    const name = document.getElementById('orderName')?.value.trim();
    const phone = document.getElementById('orderPhone')?.value.trim();
    const product = document.getElementById('orderProduct')?.value;
    const comment = document.getElementById('orderComment')?.value;
    const page = document.querySelector('title')?.innerText || 'Сайт дверей';
    
    if (!name || !phone) {
        showToast('Пожалуйста, заполните имя и телефон');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn?.innerText || 'Отправить';
    if (submitBtn) {
        submitBtn.innerText = 'Отправка...';
        submitBtn.disabled = true;
    }
    
    try {
        const response = await fetch('/api/submit-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, product, comment, page })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Заявка отправлена! Мы свяжемся с вами.');
            event.target.reset();
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Попробуйте позже'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка отправки. Проверьте интернет.');
    } finally {
        if (submitBtn) {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    }
}

function openOrderForm(productName) {
    const productInput = document.getElementById('orderProduct');
    if (productInput) {
        productInput.value = productName;
    }
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
}

// ============ WHATSAPP ССЫЛКА ============
async function openWhatsApp() {
    try {
        const response = await fetch('/api/whatsapp-link');
        const data = await response.json();
        window.open(data.link, '_blank');
    } catch (error) {
        console.error('Ошибка:', error);
        window.open('https://wa.me/79503101560', '_blank');
    }
}

// ============ УВЕДОМЛЕНИЯ ============
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ============ МОБИЛЬНОЕ МЕНЮ ============
function initMobileMenu() {
    const menuBtn = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');
    if (menuBtn && mobileNav) {
        menuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('show');
        });
        
        document.querySelectorAll('.mobile-nav a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('show');
            });
        });
    }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    initMobileMenu();
    
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', submitOrder);
    }
    
    // Если есть глобальные кнопки WhatsApp
    const waBtn = document.getElementById('whatsappBtn');
    if (waBtn) waBtn.addEventListener('click', openWhatsApp);
});