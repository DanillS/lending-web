// ============ ЗАГРУЗКА КАТАЛОГА ============
let allProducts = [];

async function loadCatalog() {
    const container = document.getElementById('catalogContainer');
    if (!container) return;
    
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        allProducts = data.products || data;
        renderFilteredAndSorted()
    } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
        container.innerHTML = '<p style="text-align:center">Ошибка загрузки каталога</p>';
    }
}

async function loadPopularProducts() {
    const container = document.getElementById('popularContainer')
    if (!container) return 

    try {
        const response = await fetch('api/products')
        const data = await response.json()
        const products = data.products || data
        const popular = products.filter(p => p.popular === true)
        renderProducts(popular, container)
    } catch (error) {
        console.error('Ошибка загрузки популярных:', error)
        container.innerHTML = '<p style="text-align: center">Ошибка загрузки</p>'
    }
}

function renderSpecs(specs) {
    if (!specs || Object.keys(specs).length === 0) {
        return '<div class="specs-empty">Характеристики отсутствуют</div>';
    }

    let html = '<div class="specs-grid">'

    for (const [key, value] of Object.entries(specs)) {
        html += `
            <div class="spec-row">
                <div class="spec-key">${escapeHtml(key)}</div>
                <div class="spec-value">${escapeHtml(value)}</div>
            </div>
        `
    }

    html += '</div>'

    return html
}

function renderProducts(products, container) {
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p style="text-align:center">Товары не найдены</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-info-block">
                <div class="product-img" style="background-image: url('${product.image || '/images/placeholder.jpg'}')"></div>
                <div class="product-info">
                    <div class="product-title">${escapeHtml(product.name)}</div>
                    <div class="product-price">
                        ${formatPrice(product.price)} ₽
                        ${product.oldPrice ? `<span class="product-old-price">${formatPrice(product.oldPrice)} ₽</span>` : ''}
                    </div>
                    <div class="product-desc">${escapeHtml(product.description)}</div>
                    <div style="margin-bottom: 5px;margin-top: auto; text-align: center;">
                        <button class="btn btn-sm btn-dark" onclick="openOrderForm('${escapeHtml(product.name)}')">Заказать</button>
                    </div>
                </div>
            </div>

            <div class="product-specs-block" style="display: none;">
                <div class="specs-title">Характеристики</div>
                <div class="specs-list">
                    ${renderSpecs(product.specs)}
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

function initCardHandlers() {
    const catalogContainer = document.getElementById('catalogContainer')
    if (catalogContainer) {
        catalogContainer.removeEventListener('click', ToggleCardClick)
        catalogContainer.addEventListener('click', ToggleCardClick)
    }

    const popularContainer = document.getElementById('popularContainer')
    if (popularContainer) {
        popularContainer.removeEventListener('click', ToggleCardClick)
        popularContainer.addEventListener('click', ToggleCardClick)
    }
}

function ToggleCardClick(event) {
    const card = event.target.closest('.product-card')
    if (!card) return 

    if (event.target.closest('.btn-dark')) return 

    const infoBlock = card.querySelector('.product-info-block')
    const specsBlock = card.querySelector('.product-specs-block')

    if (!infoBlock || !specsBlock) return

    if (infoBlock.style.display !== 'none') {
        infoBlock.style.display = 'none'
        specsBlock.style.display = 'block'
    } else {
        infoBlock.style.display = 'block'
        specsBlock.style.display = 'none'
    }

}

// ============ ФИЛЬТРАЦИЯ ============
function filterByCategory(category) {
    currentCategory = category
    
    // Активная кнопка
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    renderFilteredAndSorted()
}

function searchProducts() {
    const searchInput = document.getElementById('searchInput')
    if (!searchInput) return

    currentSearchQuery = searchInput.value
    renderFilteredAndSorted()
}

function sortProducts() {
    const sortSelect = document.getElementById('sortSelect')

    if (!sortSelect) return

    currentSort = sortSelect.value

    renderFilteredAndSorted()
}

let currentCategory = 'all'
let currentSort = 'name'
let currentSearchQuery = ''

function renderFilteredAndSorted() {
    const container = document.getElementById('catalogContainer')
    if (!container) return

    let result = [...allProducts];

    if (currentCategory !== 'all') {
        result = result.filter(product => product.category === currentCategory)
    }

    if (currentSearchQuery.trim() !== '') {
        const query = currentSearchQuery.toLowerCase()
        result = result.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query)
        )
    }

    if (currentSort === 'price_asc') {
        result.sort((a, b) => a.price - b.price)
    } else if (currentSort === 'price_desc') {
        result.sort((a, b) => b.price - a.price);
    } else {
        result.sort((a, b) => a.name.localeCompare(b.name));
    }
    renderProducts(result, container);

    initCardHandlers()
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
    const catalogContainer = document.getElementById('catalogContainer')
    const popularContainer = document.getElementById('popularContainer')

    if (catalogContainer)
        loadCatalog();

    if (popularContainer)
        loadPopularProducts()
    
    initMobileMenu();
    initCardHandlers()
    
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', submitOrder);
    }
});