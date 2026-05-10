const API_BASE = 'http://localhost:3000/api';

let restaurants = [];
let activeRestaurant = null;
let menuData = [];
let cart = [];
let addresses = [];
let selectedAddressId = null;

const tags = ['Indian', 'Street Food', 'Asian', 'American', 'Healthy', 'Mexican', 'Italian', 'Japanese', 'BBQ', 'Desserts', 'Cafe'];

const sections = {
    restaurants: document.getElementById('restaurants-section'),
    menu: document.getElementById('menu-section'),
    checkout: document.getElementById('checkout-section'),
    confirmation: document.getElementById('confirmation-section')
};

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const tagList = document.getElementById('tag-list');
const restaurantCount = document.getElementById('restaurant-count');
const restaurantList = document.getElementById('restaurant-list');
const categoryChips = document.getElementById('category-chips');
const menuList = document.getElementById('menu-list');
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
const restaurantName = document.getElementById('restaurant-name');
const restaurantDetails = document.getElementById('restaurant-details');

const DELIVERY_FEE = 2.99;

searchButton.addEventListener('click', onSearch);
searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') onSearch();
});

document.getElementById('back-restaurants').addEventListener('click', () => showPage('restaurants'));
document.getElementById('view-cart-mobile').addEventListener('click', () => showPage('checkout'));
document.getElementById('back-menu').addEventListener('click', () => showPage('menu'));
document.getElementById('continue-shopping').addEventListener('click', () => showPage('restaurants'));
checkoutButton.addEventListener('click', () => showPage('checkout'));
placeOrderButton.addEventListener('click', placeOrder);

window.addEventListener('DOMContentLoaded', async () => {
    renderTags();
    await loadRestaurants();
    await loadAddresses();
    updateCartDisplay();
});

async function loadRestaurants() {
    try {
        const response = await fetch(`${API_BASE}/restaurants`);
        restaurants = await response.json();
        displayRestaurants(restaurants);
    } catch (error) {
        console.error('Error loading restaurants:', error);
    }
}

async function loadAddresses() {
    try {
        const response = await fetch(`${API_BASE}/users/1/addresses`);
        addresses = await response.json();
        renderAddresses();
    } catch (error) {
        console.error('Error loading addresses:', error);
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
            <button class="btn btn-primary" onclick="openRestaurant(${restaurant.id})">See Menu</button>
        `;
        restaurantList.appendChild(card);
    });
}

async function openRestaurant(id) {
    activeRestaurant = restaurants.find(r => r.id === id);
    if (!activeRestaurant) return;

    restaurantName.textContent = activeRestaurant.name;
    restaurantDetails.innerHTML = `
        <span>${activeRestaurant.cuisine}</span>
        <span>${activeRestaurant.rating.toFixed(1)} ★</span>
        <span>${activeRestaurant.delivery_time}</span>
        <span>Min order ₹${activeRestaurant.min_order.toFixed(2)}</span>
    `;

    try {
        const response = await fetch(`${API_BASE}/restaurants/${id}/menu`);
        menuData = await response.json();
        renderMenu(menuData);
        showPage('menu');
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

function renderMenu(categories) {
    menuList.innerHTML = '';
    categoryChips.innerHTML = '';

    categories.forEach((categoryBlock, index) => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = categoryBlock.category;
        chip.addEventListener('click', () => scrollToCategory(index));
        categoryChips.appendChild(chip);

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
                <button class="btn btn-primary" ${item.available ? '' : 'disabled'} onclick="addItemToCart(${item.id}, '${escapeQuotes(item.name)}', ${item.price})">Add</button>
            `;
            grid.appendChild(itemCard);
        });

        categorySection.appendChild(grid);
        menuList.appendChild(categorySection);
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
            <div>
                <button class="btn btn-link" onclick="changeQuantity(${index}, -1)">-</button>
                <button class="btn btn-link" onclick="changeQuantity(${index}, 1)">+</button>
            </div>
        `;
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
    addresses.forEach(address => {
        const option = document.createElement('option');
        option.value = address.id;
        option.textContent = `${address.address_line}, ${address.city}`;
        addressSelect.appendChild(option);
    });
    selectedAddressId = addresses[0]?.id || null;
    addressSelect.addEventListener('change', () => {
        selectedAddressId = parseInt(addressSelect.value, 10);
    });
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
    if (!selectedAddressId) {
        alert('Please select a delivery address.');
        return;
    }

    const items = cart.map(item => ({ id: item.id, quantity: item.quantity }));
    const notes = orderNotes.value.trim();
    const orderData = {
        customer_id: 1,
        restaurant_id: activeRestaurant.id,
        items,
        delivery_address_id: selectedAddressId,
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
        showPage('confirmation');
    } catch (error) {
        console.error(error);
        alert('There was an error placing your order. Please try again.');
    }
}
