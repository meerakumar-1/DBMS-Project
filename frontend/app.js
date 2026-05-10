const API_BASE = 'http://localhost:3000/api';

const tags = ['Indian', 'Street Food', 'Asian', 'American', 'Healthy', 'Mexican', 'Italian', 'Japanese', 'BBQ', 'Desserts', 'Cafe'];

// Mock User State
let user = {
    isLoggedIn: false,
    name: "John Smith",
    email: "john@example.com",
    savedAddresses: []
};

let restaurants = [];
let activeRestaurant = null;
let menuData = [];
let cart = [];
let selectedAddress = null;

const sections = {
    restaurants: document.getElementById('restaurants-section'),
    checkout: document.getElementById('checkout-section'),
    confirmation: document.getElementById('confirmation-section')
};

// DOM References
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const tagList = document.getElementById('tag-list');
const restaurantCount = document.getElementById('restaurant-count');
const restaurantList = document.getElementById('restaurant-list');
const menuModal = document.getElementById('menu-modal');
const closeModalBtn = document.getElementById('close-modal');
const restaurantNameModal = document.getElementById('restaurant-name-modal');
const restaurantDetailsModal = document.getElementById('restaurant-details-modal');
const categoryChipsModal = document.getElementById('category-chips-modal');
const menuListModal = document.getElementById('menu-list-modal');
const miniCart = document.getElementById('mini-cart');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryTotal = document.getElementById('summary-total');
const checkoutButton = document.getElementById('checkout-button');
const addressSelect = document.getElementById('address-select');
const orderNotes = document.getElementById('order-notes');
const placeOrderButton = document.getElementById('place-order');
const checkoutItems = document.getElementById('checkout-items');
const checkoutSubtotal = document.getElementById('checkout-subtotal');
const checkoutTotal = document.getElementById('checkout-total');
const confirmationOrderId = document.getElementById('confirmation-order-id');
const confirmationRestaurant = document.getElementById('confirmation-restaurant');
const confirmationTotal = document.getElementById('confirmation-total');

// New Auth and Address References
const loginNavButton = document.getElementById('login-nav-button');
const logoutButton = document.getElementById('logout-button');
const userProfileNav = document.getElementById('user-profile-nav');
const loginModal = document.getElementById('login-modal');
const doLoginButton = document.getElementById('do-login-button');
const closeLoginModal = document.getElementById('close-login-modal');
const addressSelectionGroup = document.getElementById('address-selection-group');
const addressInputGroup = document.getElementById('address-input-group');
const addNewAddressBtn = document.getElementById('add-new-address-btn');
const cancelAddAddress = document.getElementById('cancel-add-address');
const newAddressInput = document.getElementById('new-address-input');
const saveAddressCheckbox = document.getElementById('save-address-checkbox');

const DELIVERY_FEE = 2.99;

searchButton.addEventListener('click', onSearch);
searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') onSearch();
});

loginNavButton.addEventListener('click', () => {
    loginModal.classList.add('active');
});

closeLoginModal.addEventListener('click', () => {
    loginModal.classList.remove('active');
});

doLoginButton.addEventListener('click', () => {
    user.isLoggedIn = true;
    updateAuthUI();
    loginModal.classList.remove('active');
});

logoutButton.addEventListener('click', () => {
    user.isLoggedIn = false;
    updateAuthUI();
});

addNewAddressBtn.addEventListener('click', () => {
    toggleAddressInput(true);
});

cancelAddAddress.addEventListener('click', () => {
    toggleAddressInput(false);
});

document.getElementById('back-restaurants')?.addEventListener('click', () => showPage('restaurants'));
document.getElementById('view-cart-mobile')?.addEventListener('click', () => {
    closeMenuModal();
    showPage('checkout');
});
document.getElementById('back-menu')?.addEventListener('click', () => showPage('restaurants'));
document.getElementById('continue-shopping').addEventListener('click', () => showPage('restaurants'));
closeModalBtn.addEventListener('click', closeMenuModal);
menuModal.addEventListener('click', (e) => {
    if (e.target === menuModal) closeMenuModal();
});
checkoutButton.addEventListener('click', () => {
    if (!user.isLoggedIn) {
        alert("Please login first to proceed to checkout.");
        loginModal.classList.add('active');
        return;
    }
    showPage('checkout');
});
placeOrderButton.addEventListener('click', placeOrder);

window.addEventListener('DOMContentLoaded', async () => {
    renderTags();
    await loadRestaurants();
    updateAuthUI();
    updateCartDisplay();
});

function updateAuthUI() {
    if (user.isLoggedIn) {
        loginNavButton.style.display = 'none';
        userProfileNav.style.display = 'flex';
    } else {
        loginNavButton.style.display = 'block';
        userProfileNav.style.display = 'none';
    }
    renderAddresses();
}

function toggleAddressInput(show) {
    if (show) {
        addressSelectionGroup.style.display = 'none';
        addressInputGroup.style.display = 'block';
        selectedAddress = null;
    } else {
        addressSelectionGroup.style.display = 'block';
        addressInputGroup.style.display = 'none';
        renderAddresses();
    }
}

async function loadRestaurants() {
    try {
        const response = await fetch(`${API_BASE}/restaurants`);
        restaurants = await response.json();
        displayRestaurants(restaurants);
    } catch (error) {
        console.error('Error loading restaurants:', error);
    }
}

function renderTags() {
    tagList.innerHTML = '';
    tags.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'tag';
        button.textContent = tag;
        button.addEventListener('click', () => filterByTag(tag, button));
        tagList.appendChild(button);
    });
}

function filterByTag(tag, clickedButton) {
    const filtered = restaurants.filter(r => r.cuisine.toLowerCase().includes(tag.toLowerCase()));
    displayRestaurants(filtered);
    document.querySelectorAll('.tag').forEach(el => el.classList.toggle('active', el === clickedButton));
}

function onSearch() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = restaurants.filter(r => {
        return r.name.toLowerCase().includes(query) ||
               r.description.toLowerCase().includes(query) ||
               r.cuisine.toLowerCase().includes(query) ||
               r.address.toLowerCase().includes(query);
    });
    displayRestaurants(filtered);
}

function displayRestaurants(list) {
    restaurantList.innerHTML = '';
    restaurantCount.textContent = `${list.length} restaurants found`;

    if (!list.length) {
        restaurantList.innerHTML = '<p>No restaurants match your search yet.</p>';
        return;
    }

    list.forEach(restaurant => {
        const card = document.createElement('article');
        card.className = 'restaurant-card';
        card.innerHTML = `
            <div>
                <h3>${restaurant.name}</h3>
                <p>${restaurant.description}</p>
                <div class="restaurant-meta">
                    <span>${restaurant.cuisine}</span>
                    <span>${restaurant.delivery_time}</span>
                    <span>${restaurant.price_range}</span>
                    <span>${restaurant.rating.toFixed(1)} ★</span>
                </div>
                <p>${restaurant.address}</p>
            </div>
            <button class="btn btn-primary btn-see-menu" data-id="${restaurant.id}">See Menu</button>
        `;
        
        const seeMenuBtn = card.querySelector('.btn-see-menu');
        seeMenuBtn.addEventListener('click', () => openRestaurant(restaurant.id));
        
        restaurantList.appendChild(card);
    });
}

async function openRestaurant(id) {
    const restaurantId = parseInt(id, 10);
    activeRestaurant = restaurants.find(r => r.id == restaurantId);
    if (!activeRestaurant) return;

    // Open modal immediately to show it's responsive
    menuModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    restaurantNameModal.textContent = activeRestaurant.name;
    restaurantDetailsModal.innerHTML = `
        <span>${activeRestaurant.cuisine}</span>
        <span>${activeRestaurant.rating.toFixed(1)} ★</span>
        <span>${activeRestaurant.delivery_time}</span>
        <span>Min order ₹${activeRestaurant.min_order.toFixed(2)}</span>
    `;

    try {
        const response = await fetch(`${API_BASE}/restaurants/${id}/menu`);
        const rawItems = await response.json();
        
        // Group items by category to match the UI's expected structure
        const categoryMap = {};
        rawItems.forEach(item => {
            const cat = item.category || 'Chef Specials';
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(item);
        });
        
        menuData = Object.keys(categoryMap).map(cat => ({
            category: cat,
            items: categoryMap[cat]
        }));
        
        renderMenu(menuData);
    } catch (error) {
        console.error('Error loading menu:', error);
        menuListModal.innerHTML = '<p>Error loading menu. Please try again.</p>';
    }
}

function closeMenuModal() {
    menuModal.classList.remove('active');
    document.body.style.overflow = '';
}

function renderMenu(categories) {
    menuListModal.innerHTML = '';
    categoryChipsModal.innerHTML = '';

    categories.forEach((categoryBlock, index) => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = categoryBlock.category;
        chip.addEventListener('click', () => scrollToCategory(index));
        categoryChipsModal.appendChild(chip);

        const categorySection = document.createElement('div');
        categorySection.className = 'menu-category';
        categorySection.id = `category-${index}`;
        categorySection.innerHTML = `<h3>${categoryBlock.category}</h3>`;

        const grid = document.createElement('div');
        grid.className = 'menu-grid';

        categoryBlock.items.forEach(item => {
            const itemCard = document.createElement('article');
            itemCard.className = 'menu-card';
            itemCard.innerHTML = `
                <div>
                    <h4>${item.name}</h4>
                    <p>${item.description || 'Delicious choice'}</p>
                    <div class="price-row">
                        <span class="price">₹${item.price.toFixed(2)}</span>
                        <span>${item.available ? 'Available' : 'Sold out'}</span>
                    </div>
                </div>
                <button class="btn btn-primary btn-add-cart" ${item.available ? '' : 'disabled'}>Add</button>
            `;
            
            const addBtn = itemCard.querySelector('.btn-add-cart');
            addBtn.addEventListener('click', () => addItemToCart(item.id, item.name, item.price));
            
            grid.appendChild(itemCard);
        });

        categorySection.appendChild(grid);
        menuListModal.appendChild(categorySection);
    });
}

function escapeQuotes(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function scrollToCategory(index) {
    const section = document.getElementById(`category-${index}`);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addItemToCart(itemId, name, price) {
    const existing = cart.find(item => item.id === itemId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: itemId, name, price, quantity: 1 });
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    renderMiniCart();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    summarySubtotal.textContent = subtotal.toFixed(2);
    const total = subtotal ? subtotal + DELIVERY_FEE : 0;
    summaryTotal.textContent = total.toFixed(2);
    checkoutButton.disabled = !cart.length;
}

function renderMiniCart() {
    miniCart.innerHTML = '';

    if (!cart.length) {
        miniCart.innerHTML = '<p>Your cart is empty. Add something delicious!</p>';
        return;
    }

    cart.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'cart-item-mini';
        card.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <div>${item.quantity} × ₹${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-controls">
                <button class="btn btn-link btn-decrease">-</button>
                <button class="btn btn-link btn-increase">+</button>
            </div>
        `;
        
        card.querySelector('.btn-decrease').addEventListener('click', () => changeQuantity(index, -1));
        card.querySelector('.btn-increase').addEventListener('click', () => changeQuantity(index, 1));
        
        miniCart.appendChild(card);
    });
}

function changeQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartDisplay();
}

function showPage(pageKey) {
    Object.values(sections).forEach(page => page.hidden = true);
    sections[pageKey].hidden = false;
    Object.values(sections).forEach(page => page.classList.remove('active'));
    sections[pageKey].classList.add('active');

    if (pageKey === 'checkout') {
        renderCheckout();
    }
}

function renderAddresses() {
    addressSelect.innerHTML = '';
    
    if (user.savedAddresses.length === 0) {
        toggleAddressInput(true);
        cancelAddAddress.style.display = 'none'; // Hide cancel if no other options
    } else {
        cancelAddAddress.style.display = 'inline-block';
        user.savedAddresses.forEach((addr, idx) => {
            const option = document.createElement('option');
            option.value = addr;
            option.textContent = addr;
            addressSelect.appendChild(option);
        });
        selectedAddress = user.savedAddresses[0];
        addressSelect.addEventListener('change', () => {
            selectedAddress = addressSelect.value;
        });
    }
}

function renderCheckout() {
    checkoutItems.innerHTML = '';
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!cart.length) {
        checkoutItems.innerHTML = '<p>Your cart is empty. Add delicious items first.</p>';
    }

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'checkout-item';
        row.innerHTML = `
            <span>${item.name} × ${item.quantity}</span>
            <strong>₹${(item.price * item.quantity).toFixed(2)}</strong>
        `;
        checkoutItems.appendChild(row);
    });

    checkoutSubtotal.textContent = subtotal.toFixed(2);
    checkoutTotal.textContent = (cart.length ? subtotal + DELIVERY_FEE : 0).toFixed(2);
}

async function placeOrder() {
    if (!cart.length) {
        alert('Please add items to your cart before checking out.');
        return;
    }

    let finalAddress = selectedAddress;
    
    if (addressInputGroup.style.display !== 'none') {
        finalAddress = newAddressInput.value.trim();
        if (!finalAddress) {
            alert('Please enter a delivery address.');
            return;
        }
        if (saveAddressCheckbox.checked) {
            if (!user.savedAddresses.includes(finalAddress)) {
                user.savedAddresses.push(finalAddress);
            }
        }
    }

    if (!finalAddress) {
        alert('Please select or enter a delivery address.');
        return;
    }

    const items = cart.map(item => ({ id: item.id, quantity: item.quantity }));
    const notes = orderNotes.value.trim();
    const orderData = {
        customer_id: 1, // Mock user ID
        restaurant_id: activeRestaurant.id,
        items,
        delivery_address_id: 1, // Mock address ID for DB constraint
        notes
    };

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Failed to place order');
        }

        const result = await response.json();
        confirmationOrderId.textContent = result.order_id;
        confirmationRestaurant.textContent = activeRestaurant.name;
        confirmationTotal.textContent = `₹${result.total_price.toFixed(2)}`;
        cart = [];
        updateCartDisplay();
        orderNotes.value = '';
        newAddressInput.value = '';
        toggleAddressInput(false);
        showPage('confirmation');
    } catch (error) {
        console.error(error);
        alert('There was an error placing your order. Please try again.');
    }
}
