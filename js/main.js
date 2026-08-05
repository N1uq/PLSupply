document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let products = [];
    let cart = JSON.parse(localStorage.getItem('plsupply_cart')) || [];
    const WHATSAPP_NUMBER = '5511999999999'; // Substitua pelo número real
    const FIXED_PRICE = 119.90;

    // --- ELEMENTS ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('[data-route]');
    const sections = document.querySelectorAll('.page-section');
    const featuredGrid = document.getElementById('featured-grid');
    const catalogGrid = document.getElementById('catalog-grid');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cartBadge = document.getElementById('cart-badge');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummaryContainer = document.getElementById('cart-summary-container');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const btnFinalize = document.getElementById('btn-finalize');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const checkoutPagamento = document.getElementById('checkout-pagamento');
    const pixInfo = document.getElementById('pix-info');

    // --- INITIALIZATION ---
    init();

    async function init() {
        setupThemeToggle();
        updateCartBadge();
        setupNavigation();
        setupMobileMenu();

        try {
            const response = await fetch('data/products.json');
            if (!response.ok) throw new Error('Falha ao carregar produtos');
            products = await response.json();

            renderFeatured();
            renderCatalog(products);
            setupFiltersAndSearch();
            renderCart();
        } catch (error) {
            console.error('Erro:', error);
            catalogGrid.innerHTML = '<p class="text-center w-100">Erro ao carregar o catálogo. Tente novamente mais tarde.</p>';
        }
    }

    // --- THEME ---
    function setupThemeToggle() {
        const savedTheme = localStorage.getItem('plsupply_theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('plsupply_theme', 'light');
                themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('plsupply_theme', 'dark');
                themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            }
        });
    }

    // --- NAVIGATION (SPA) ---
    function setupNavigation() {
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('data-route');

                // Update active link
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                if (link.classList.contains('nav-links a') || link.closest('.nav-links a')) {
                    link.classList.add('active');
                } else {
                    const navMatch = document.querySelector(`.nav-links a[data-route="${route}"]`);
                    if (navMatch) navMatch.classList.add('active');
                }

                // Show section
                sections.forEach(sec => sec.classList.remove('active'));
                document.getElementById(`${route}-section`).classList.add('active');

                // Close mobile menu if open
                navLinks.classList.remove('show');

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });

                if (route === 'cart') {
                    renderCart();
                }
            });
        });
    }

    function setupMobileMenu() {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }

    // --- RENDERING PRODUCTS ---
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';

        const sizesHtml = product.tamanhos.map(size =>
            `<button class="size-btn" data-size="${size}">${size}</button>`
        ).join('');

        let mediaHtml = '<div class="product-media-container">';
        if (product.media && product.media.length > 0) {
            product.media.forEach((m, idx) => {
                const activeClass = idx === 0 ? 'media-active' : '';
                if (m.type === 'video') {
                    mediaHtml += `<video src="${m.url}" class="${activeClass}" autoplay loop muted playsinline></video>`;
                } else {
                    mediaHtml += `<img src="${m.url}" class="${activeClass}" loading="lazy" alt="${product.nome}">`;
                }
            });
            if (product.media.length > 1) {
                mediaHtml += `
                    <button class="carousel-btn carousel-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-btn carousel-next"><i class="fas fa-chevron-right"></i></button>
                    <div class="carousel-dots">
                        ${product.media.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('')}
                    </div>
                `;
            }
        } else if (product.imagem) {
             mediaHtml += `<img src="${product.imagem}" class="media-active product-image" alt="${product.nome}">`;
        }
        mediaHtml += '</div>';

        let musicHtml = '';
        if (product.music) {
            const separator = product.music.includes('?') ? '&' : '?';
            musicHtml = `
            <div class="music-player-container">
                <iframe src="${product.music}${separator}autoplay=0" frameborder="0" allow="autoplay; encrypted-media"></iframe>
            </div>`;
        }

        card.innerHTML = `
            ${mediaHtml}
            <div class="product-info">
                <span class="product-category">${product.categoria}</span>
                <h3 class="product-name">${product.nome}</h3>
                <span class="product-code">Cód: ${product.codigo}</span>
                <div class="product-price">${formatCurrency(product.preco)}</div>
                
                ${musicHtml}
                <div class="product-sizes" data-product="${product.codigo}">
                    ${sizesHtml}
                </div>
                
                <button class="btn btn-primary w-100 btn-add-cart" data-codigo="${product.codigo}">
                    <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                </button>
            </div>
        `;

        // Carousel logic
        if (product.media && product.media.length > 1) {
            let currentMediaIdx = 0;
            const mediaEls = card.querySelectorAll('.product-media-container video, .product-media-container img');
            const dots = card.querySelectorAll('.dot');
            const prevBtn = card.querySelector('.carousel-prev');
            const nextBtn = card.querySelector('.carousel-next');

            const updateMedia = (newIdx) => {
                mediaEls[currentMediaIdx].classList.remove('media-active');
                dots[currentMediaIdx].classList.remove('active');
                currentMediaIdx = (newIdx + product.media.length) % product.media.length;
                mediaEls[currentMediaIdx].classList.add('media-active');
                dots[currentMediaIdx].classList.add('active');
            };

            prevBtn.addEventListener('click', () => updateMedia(currentMediaIdx - 1));
            nextBtn.addEventListener('click', () => updateMedia(currentMediaIdx + 1));
            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    updateMedia(parseInt(e.target.dataset.index));
                });
            });
        }

        // Size selection logic
        const sizeBtns = card.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Add to cart logic
        const addBtn = card.querySelector('.btn-add-cart');
        addBtn.addEventListener('click', () => {
            const selectedSizeBtn = card.querySelector('.size-btn.selected');
            if (!selectedSizeBtn) {
                alert('Por favor, selecione um tamanho antes de adicionar ao carrinho.');
                return;
            }
            addToCart(product, selectedSizeBtn.dataset.size);

            // Visual feedback
            const originalText = addBtn.innerHTML;
            addBtn.innerHTML = '<i class="fas fa-check"></i> Adicionado';
            addBtn.style.backgroundColor = 'var(--primary-color)';
            setTimeout(() => {
                addBtn.innerHTML = originalText;
                addBtn.style.backgroundColor = '';
                selectedSizeBtn.classList.remove('selected');
            }, 2000);
        });

        return card;
    }

    function renderFeatured() {
        // Exibir os 4 primeiros produtos como destaque
        featuredGrid.innerHTML = '';
        const featured = products.slice(0, 4);
        featured.forEach(product => {
            featuredGrid.appendChild(createProductCard(product));
        });
    }

    function renderCatalog(items) {
        catalogGrid.innerHTML = '';
        if (items.length === 0) {
            catalogGrid.innerHTML = '<p class="text-center w-100 mt-4">Nenhum produto encontrado.</p>';
            return;
        }
        items.forEach(product => {
            catalogGrid.appendChild(createProductCard(product));
        });
    }

    // --- FILTERS & SEARCH ---
    function setupFiltersAndSearch() {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyFilters();
            });
        });

        searchInput.addEventListener('input', applyFilters);
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        const filtered = products.filter(product => {
            const matchesSearch = product.nome.toLowerCase().includes(searchTerm) ||
                product.codigo.toLowerCase().includes(searchTerm);

            const matchesFilter = activeFilter === 'all' || product.categoria === activeFilter;

            return matchesSearch && matchesFilter;
        });

        renderCatalog(filtered);
    }

    // --- CART LOGIC ---
    function addToCart(product, size) {
        const cartItemIndex = cart.findIndex(item => item.codigo === product.codigo && item.tamanho === size);

        if (cartItemIndex > -1) {
            cart[cartItemIndex].quantidade += 1;
        } else {
            cart.push({
                codigo: product.codigo,
                nome: product.nome,
                imagem: product.media ? product.media[0].url : product.imagem,
                preco: product.preco,
                tamanho: size,
                quantidade: 1
            });
        }

        saveCart();
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        saveCart();
        renderCart();
    }

    function updateQuantity(index, delta) {
        const newQty = cart[index].quantidade + delta;
        if (newQty > 0) {
            cart[index].quantidade = newQty;
            saveCart();
            renderCart();
        }
    }

    function saveCart() {
        localStorage.setItem('plsupply_cart', JSON.stringify(cart));
        updateCartBadge();
    }

    function updateCartBadge() {
        const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
        cartBadge.textContent = totalItems;

        if (totalItems > 0) {
            cartBadge.style.display = 'inline-block';
        } else {
            cartBadge.style.display = 'none';
        }
    }

    function renderCart() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart-message text-center">
                    <p>Seu carrinho está vazio.</p>
                    <br>
                    <button class="btn btn-primary" onclick="document.querySelector('[data-route=\\'catalog\\']').click()">Voltar às compras</button>
                </div>
            `;
            cartSummaryContainer.style.display = 'none';
            return;
        }

        cartSummaryContainer.style.display = 'block';
        cartItemsContainer.innerHTML = '';

        let subtotal = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.preco * item.quantidade;
            subtotal += itemTotal;

            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <img src="${item.imagem}" alt="${item.nome}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.nome}</div>
                    <div class="cart-item-meta">Cód: ${item.codigo} | Tamanho: ${item.tamanho}</div>
                    <div class="cart-item-price">${formatCurrency(itemTotal)}</div>
                </div>
                <div class="quantity-control">
                    <button class="qty-btn btn-minus" data-index="${index}">-</button>
                    <input type="text" class="qty-input" value="${item.quantidade}" readonly>
                    <button class="qty-btn btn-plus" data-index="${index}">+</button>
                </div>
                <button class="btn btn-danger btn-remove" data-index="${index}" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            cartItemsContainer.appendChild(itemEl);
        });

        // Add event listeners for cart actions
        document.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.index, -1));
        });

        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.index, 1));
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            // Need to handle icon click as well
            const btnEl = btn.closest('.btn-remove');
            btnEl.addEventListener('click', (e) => removeFromCart(btnEl.dataset.index));
        });

        // Update totals
        const frete = 9.90;
        cartSubtotal.textContent = formatCurrency(subtotal);
        cartTotal.textContent = formatCurrency(subtotal + frete);
    }

    // --- CHECKOUT WHATSAPP ---
    if (checkoutPagamento) {
        checkoutPagamento.addEventListener('change', (e) => {
            if (e.target.value === 'PIX') {
                pixInfo.style.display = 'block';
                btnFinalize.innerHTML = '<i class="fab fa-whatsapp"></i> ENVIAR PEDIDO E COMPROVANTE';
            } else {
                pixInfo.style.display = 'none';
                btnFinalize.innerHTML = '<i class="fab fa-whatsapp"></i> FINALIZAR PELO WHATSAPP';
            }
        });
    }

    btnFinalize.addEventListener('click', () => {
        const nome = document.getElementById('checkout-nome').value.trim();
        const cidade = document.getElementById('checkout-cidade').value.trim();
        const pagamento = document.getElementById('checkout-pagamento').value;

        if (!nome || !cidade || !pagamento) {
            alert('Por favor, preencha seu nome, cidade e forma de pagamento.');
            return;
        }

        if (cart.length === 0) return;

        let mensagem = `Olá! Gostaria de realizar este pedido.\n\n*Pedido:*\n`;
        let subtotal = 0;

        cart.forEach(item => {
            mensagem += `${item.quantidade}x ${item.codigo} (Tam: ${item.tamanho})\n`;
            subtotal += item.preco * item.quantidade;
        });

        const frete = 9.90;
        const total = subtotal + frete;

        mensagem += `\n*Subtotal:* ${formatCurrency(subtotal)}\n`;
        mensagem += `*Frete fixo:* ${formatCurrency(frete)}\n`;
        mensagem += `*Total:* ${formatCurrency(total)}\n\n`;
        mensagem += `*Nome:* ${nome}\n`;
        mensagem += `*Cidade/Estado:* ${cidade}\n`;
        mensagem += `*Forma de pagamento:* ${pagamento}\n\n`;
        mensagem += `Obrigado!`;

        const encodedMessage = encodeURIComponent(mensagem);
        const whatsappUrl = `https://wa.me/${5585992528809}?text=${encodedMessage}`;

        // Esvaziar carrinho após redimensionar (opcional)
        // cart = []; saveCart(); renderCart();

        window.open(whatsappUrl, '_blank');
    });

    // --- CUSTOM ORDER ---
    const btnCustomOrder = document.getElementById('btn-custom-order');
    if (btnCustomOrder) {
        btnCustomOrder.addEventListener('click', () => {
            const shirtName = document.getElementById('custom-shirt-name').value.trim();
            let msg = 'Olá! Não encontrei a camisa que eu queria no catálogo.';
            if (shirtName) {
                msg += ` Gostaria de consultar a disponibilidade e valor da camisa: *${shirtName}*.`;
            } else {
                msg += ` Gostaria de ver o catálogo completo ou outras opções de camisas.`;
            }
            const whatsappUrl = `https://wa.me/5585992528809?text=${encodeURIComponent(msg)}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    // --- UTILS ---
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
});
