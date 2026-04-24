<template>
    <div class="store-page">
        <button class="back-button" @click="goHome">
            <img :src="backIcon" alt="Back to EiTake homepage" />
        </button>

        <button class="script-button" @click="openScriptModal">
            <img :src="speechBubbleIcon" alt="Shopping script" />
        </button>

        <header class="store-header">
            <div>
                <h1>English Only Boutique!</h1>
                <p>Practice shopping in English</p>
            </div>
        </header>

        <nav class="category-nav" aria-label="Clothing categories">
            <button v-for="category in categories" :key="category.id" class="nav-pill"
                @click="scrollToCategory(category.id)">
                {{ category.label }}
            </button>
        </nav>

        <main class="store-layout">
            <aside class="cart-panel">
                <h2>Cart</h2>

                <p v-if="cart.length === 0">Your cart is empty.</p>

                <ul v-else>
                    <li v-for="item in cart" :key="item.id">
                        <span>{{ item.name }}</span>
                        <span>${{ item.price.toLocaleString() }}</span>
                        <button @click="removeFromCart(item.id)">×</button>
                    </li>
                </ul>

                <div class="cart-total">
                    Total: ${{ cartTotal.toLocaleString() }}
                </div>

                <button v-if="cart.length" class="clear-cart-button" @click="clearCart">
                    Clear Cart
                </button>
            </aside>

            <section class="product-area">
                <section v-for="category in categories" :id="category.id" :key="category.id" class="category-section">
                    <button class="category-title-button" :aria-expanded="!isCollapsed(category.id)"
                        @click="toggleCategory(category.id)">
                        <h2>{{ category.label }}</h2>

                        <span class="collapse-icon" :class="{ collapsed: isCollapsed(category.id) }"></span>
                    </button>

                    <Transition name="section-collapse">
                        <div v-show="!isCollapsed(category.id)" class="clothing-grid">
                            <button v-for="item in category.items" :key="item.id" class="clothing-card"
                                :class="{ sold: isInCart(item.id) }" @click="selectItem(item)">
                                <div class="image-wrap">
                                    <img :src="item.image" :alt="item.name" loading="lazy" />

                                    <div v-if="isInCart(item.id)" class="sold-out">
                                        SOLD OUT
                                    </div>
                                </div>

                                <div class="item-name">{{ item.name }}</div>
                                <div class="item-price">${{ item.price.toLocaleString() }}</div>
                            </button>
                        </div>
                    </Transition>
                </section>
            </section>
        </main>

        <div v-if="selectedItem" class="details-overlay" @click.self="closeDetails">
            <div class="details-modal">
                <button class="close-button" @click="closeDetails">×</button>

                <img :src="selectedItem.image" :alt="selectedItem.name" class="details-image" />

                <h2>{{ selectedItem.name }}</h2>
                <p class="details-price">${{ selectedItem.price.toLocaleString() }}</p>

                <button class="add-button" :disabled="isInCart(selectedItem.id)" @click="addToCart(selectedItem)">
                    {{ isInCart(selectedItem.id) ? 'Sold Out' : 'Add to Cart' }}
                </button>

                <button class="phrase-box" :class="{ expanded: showItemPractice }"
                    @click="showItemPractice = !showItemPractice">
                    <p class="phrase-title"><strong>Practice:</strong></p>

                    <Transition name="practice-collapse">
                        <div v-if="showItemPractice" class="practice-dialogue">
                            <p class="detail-dialogue-line clerk">
                                <strong>Clerk:</strong> “How about this?”
                            </p>

                            <p class="detail-dialogue-line customer">
                                <strong>Customer:</strong> “How much is it?”
                            </p>

                            <p class="detail-dialogue-line clerk">
                                <strong>Clerk:</strong> “It's ${{ selectedItem.price.toLocaleString() }}.”
                            </p>

                            <p class="detail-dialogue-line customer">
                                <strong>Customer:</strong> “I'll take it!”
                            </p>
                        </div>
                    </Transition>
                </button>
            </div>
        </div>

        <div v-if="showScriptModal" class="details-overlay" @click.self="closeScriptModal">
            <div class="script-modal">
                <button class="close-button" @click="closeScriptModal">×</button>

                <h2>Shopping English Script</h2>

                <div class="script-scroll">
                    <div class="script-lines">
                        <p class="script-line clerk">
                            <strong>Clerk:</strong> “Welcome! How may I help you?”
                        </p>

                        <p class="script-line customer">
                            <strong>Customer:</strong>
                            “Hello. I'm looking for
                            <span class="blank-tooltip" @mouseenter="showTooltip('item', $event)"
                                @mouseleave="hideTooltip">
                                _____________
                            </span>.”
                        </p>

                        <p class="script-line clerk">
                            <strong>Clerk:</strong> “Of course! How about this one?”
                        </p>

                        <p class="script-line customer">
                            <strong>Customer:</strong>
                            “It's okay, but I don't like the
                            <span class="blank-tooltip" @mouseenter="showTooltip('dislike', $event)"
                                @mouseleave="hideTooltip">
                                _________
                            </span>.”
                        </p>

                        <p class="script-line clerk">
                            <strong>Clerk:</strong> “I see. Then, how about this one?”
                        </p>

                        <p class="script-line customer">
                            <strong>Customer:</strong> “That's great! How much is it?”
                        </p>

                        <p class="script-line clerk">
                            <strong>Clerk:</strong>
                            “It's
                            <span class="blank-tooltip" @mouseenter="showTooltip('price', $event)"
                                @mouseleave="hideTooltip">
                                _______
                            </span>
                            dollars.”
                        </p>

                        <p class="script-line customer">
                            <strong>Customer:</strong> “I'll take it!”
                        </p>
                    </div>
                </div>
            </div>
            <div v-if="activeTooltip" class="script-floating-tooltip" :style="{
                left: `${tooltipPosition.left}px`,
                top: `${tooltipPosition.top}px`
            }">
                {{ tooltipText[activeTooltip] }}
            </div>
        </div>

        <button v-if="showBackToTop" class="back-to-top-button" @click="scrollToTop">
            ↑ Top
        </button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

import speechBubbleIcon from '@/assets/images/icons/speech-bubble.png'
import backIcon from '@/assets/images/icons/back-icon.png'

import shirt01 from '@/assets/images/games/clothing-store/shirts/shirt_01.png'
import shirt02 from '@/assets/images/games/clothing-store/shirts/shirt_02.png'
import shirt03 from '@/assets/images/games/clothing-store/shirts/shirt_03.png'
import shirt04 from '@/assets/images/games/clothing-store/shirts/shirt_04.png'
import shirt05 from '@/assets/images/games/clothing-store/shirts/shirt_05.png'
import shirt06 from '@/assets/images/games/clothing-store/shirts/shirt_06.png'
import shirt07 from '@/assets/images/games/clothing-store/shirts/shirt_07.png'
import shirt08 from '@/assets/images/games/clothing-store/shirts/shirt_08.png'
import shirt09 from '@/assets/images/games/clothing-store/shirts/shirt_09.png'
import shirt10 from '@/assets/images/games/clothing-store/shirts/shirt_10.png'
import shirt11 from '@/assets/images/games/clothing-store/shirts/shirt_11.png'
import shirt12 from '@/assets/images/games/clothing-store/shirts/shirt_12.png'

import pants01 from '@/assets/images/games/clothing-store/pants/pants_01.png'
import pants02 from '@/assets/images/games/clothing-store/pants/pants_02.png'
import pants03 from '@/assets/images/games/clothing-store/pants/pants_03.png'
import pants04 from '@/assets/images/games/clothing-store/pants/pants_04.png'
import pants05 from '@/assets/images/games/clothing-store/pants/pants_05.png'
import pants06 from '@/assets/images/games/clothing-store/pants/pants_06.png'
import pants07 from '@/assets/images/games/clothing-store/pants/pants_07.png'
import pants08 from '@/assets/images/games/clothing-store/pants/pants_08.png'
import pants09 from '@/assets/images/games/clothing-store/pants/pants_09.png'
import pants10 from '@/assets/images/games/clothing-store/pants/pants_10.png'
import pants11 from '@/assets/images/games/clothing-store/pants/pants_11.png'
import pants12 from '@/assets/images/games/clothing-store/pants/pants_12.png'

import jacket01 from '@/assets/images/games/clothing-store/jackets/jacket_01.png'
import jacket02 from '@/assets/images/games/clothing-store/jackets/jacket_02.png'
import jacket03 from '@/assets/images/games/clothing-store/jackets/jacket_03.png'
import jacket04 from '@/assets/images/games/clothing-store/jackets/jacket_04.png'
import jacket05 from '@/assets/images/games/clothing-store/jackets/jacket_05.png'
import jacket06 from '@/assets/images/games/clothing-store/jackets/jacket_06.png'
import jacket07 from '@/assets/images/games/clothing-store/jackets/jacket_07.png'
import jacket08 from '@/assets/images/games/clothing-store/jackets/jacket_08.png'
import jacket09 from '@/assets/images/games/clothing-store/jackets/jacket_09.png'
import jacket10 from '@/assets/images/games/clothing-store/jackets/jacket_10.png'
import jacket11 from '@/assets/images/games/clothing-store/jackets/jacket_11.png'
import jacket12 from '@/assets/images/games/clothing-store/jackets/jacket_12.png'

import hat01 from '@/assets/images/games/clothing-store/hats/hat_01.png'
import hat02 from '@/assets/images/games/clothing-store/hats/hat_02.png'
import hat03 from '@/assets/images/games/clothing-store/hats/hat_03.png'
import hat04 from '@/assets/images/games/clothing-store/hats/hat_04.png'
import hat05 from '@/assets/images/games/clothing-store/hats/hat_05.png'
import hat06 from '@/assets/images/games/clothing-store/hats/hat_06.png'
import hat07 from '@/assets/images/games/clothing-store/hats/hat_07.png'
import hat08 from '@/assets/images/games/clothing-store/hats/hat_08.png'
import hat09 from '@/assets/images/games/clothing-store/hats/hat_09.png'
import hat10 from '@/assets/images/games/clothing-store/hats/hat_10.png'
import hat11 from '@/assets/images/games/clothing-store/hats/hat_11.png'
import hat12 from '@/assets/images/games/clothing-store/hats/hat_12.png'

import shoes01 from '@/assets/images/games/clothing-store/shoes/shoes_01.png'
import shoes02 from '@/assets/images/games/clothing-store/shoes/shoes_02.png'
import shoes03 from '@/assets/images/games/clothing-store/shoes/shoes_03.png'
import shoes04 from '@/assets/images/games/clothing-store/shoes/shoes_04.png'
import shoes05 from '@/assets/images/games/clothing-store/shoes/shoes_05.png'
import shoes06 from '@/assets/images/games/clothing-store/shoes/shoes_06.png'
import shoes07 from '@/assets/images/games/clothing-store/shoes/shoes_07.png'
import shoes08 from '@/assets/images/games/clothing-store/shoes/shoes_08.png'
import shoes09 from '@/assets/images/games/clothing-store/shoes/shoes_09.png'
import shoes10 from '@/assets/images/games/clothing-store/shoes/shoes_10.png'
import shoes11 from '@/assets/images/games/clothing-store/shoes/shoes_11.png'
import shoes12 from '@/assets/images/games/clothing-store/shoes/shoes_12.png'

const selectedItem = ref(null)
const cart = ref([])
const showBackToTop = ref(false)
const showScriptModal = ref(false)
const activeTooltip = ref(null)
const tooltipPosition = ref({ left: 0, top: 0 })
const showItemPractice = ref(false)

const tooltipText = {
    item: 'a shirt · a jacket · a hat · pants · shoes',
    dislike: 'color · shape · size · style',
    price: '$$$$$$$$$$$$'
}

const categories = [
    {
        id: 'shirts',
        label: 'Shirts',
        items: [
            { id: 'shirt-01', name: 'Blue Blouse', type: 'shirt', price: 27, image: shirt01 },
            { id: 'shirt-02', name: 'Floral Button-Up Shirt', type: 'shirt', price: 43, image: shirt02 },
            { id: 'shirt-03', name: 'Mrs. Green Apple Sweater', type: 'shirt', price: 58, image: shirt03 },
            { id: 'shirt-04', name: 'Pajama Shirt', type: 'shirt', price: 23, image: shirt04 },
            { id: 'shirt-05', name: 'Tuxedo T-Shirt', type: 'shirt', price: 17, image: shirt05 },
            { id: 'shirt-06', name: 'Formal Button-Up Shirt', type: 'shirt', price: 52, image: shirt06 },
            { id: 'shirt-07', name: 'Red Button-Up Shirt', type: 'shirt', price: 37, image: shirt07 },
            { id: 'shirt-08', name: 'Blue Button-Up Shirt', type: 'shirt', price: 34, image: shirt08 },
            { id: 'shirt-09', name: 'Ruffle Blouse', type: 'shirt', price: 64, image: shirt09 },
            { id: 'shirt-10', name: 'Yukata', type: 'shirt', price: 109, image: shirt10 },
            { id: 'shirt-11', name: 'Heart Shirt', type: 'shirt', price: 46, image: shirt11 },
            { id: 'shirt-12', name: 'Beach T-Shirt', type: 'shirt', price: 22, image: shirt12 }
        ]
    },
    {
        id: 'pants',
        label: 'Pants',
        items: [
            { id: 'pants-01', name: 'Cargo Shorts', type: 'pants', price: 42, image: pants01 },
            { id: 'pants-02', name: 'Sports Shorts', type: 'pants', price: 31, image: pants02 },
            { id: 'pants-03', name: 'Ducky Pajama Pants', type: 'pants', price: 24, image: pants03 },
            { id: 'pants-04', name: 'Jean Shorts', type: 'pants', price: 19, image: pants04 },
            { id: 'pants-05', name: 'Red Skirt', type: 'skirt', price: 32, image: pants05 },
            { id: 'pants-06', name: 'Light Blue Sweatpants', type: 'pants', price: 38, image: pants06 },
            { id: 'pants-07', name: 'Green Sport Shorts', type: 'pants', price: 29, image: pants07 },
            { id: 'pants-08', name: 'Christmas Pajamas', type: 'pants', price: 18, image: pants08 },
            { id: 'pants-09', name: 'Jeans', type: 'pants', price: 33, image: pants09 },
            { id: 'pants-10', name: 'Checkered Pants', type: 'pants', price: 68, image: pants10 },
            { id: 'pants-11', name: 'Pink Snow Pants', type: 'pants', price: 114, image: pants11 },
            { id: 'pants-12', name: 'Cargo Pants', type: 'pants', price: 51, image: pants12 }
        ]
    },
    {
        id: 'jackets',
        label: 'Jackets',
        items: [
            { id: 'jacket-01', name: 'Leather Jacket', type: 'jacket', price: 83, image: jacket01 },
            { id: 'jacket-02', name: 'Bomber Jacket', type: 'jacket', price: 36, image: jacket02 },
            { id: 'jacket-03', name: 'One Piece Jacket', type: 'jacket', price: 67, image: jacket03 },
            { id: 'jacket-04', name: 'Long Coat', type: 'jacket', price: 73, image: jacket04 },
            { id: 'jacket-05', name: 'Puffy Winter Jacket', type: 'jacket', price: 108, image: jacket05 },
            { id: 'jacket-06', name: 'Light Winter Coat', type: 'jacket', price: 127, image: jacket06 },
            { id: 'jacket-07', name: 'Outdoor Coat', type: 'jacket', price: 104, image: jacket07 },
            { id: 'jacket-08', name: 'Akatsuki Jacket', type: 'jacket', price: 92, image: jacket08 },
            { id: 'jacket-09', name: 'Pink Outdoor Jacket', type: 'jacket', price: 86, image: jacket09 },
            { id: 'jacket-10', name: 'Fuzzy Jacket', type: 'jacket', price: 129, image: jacket10 },
            { id: 'jacket-11', name: 'Red Overcoat', type: 'jacket', price: 123, image: jacket11 },
            { id: 'jacket-12', name: 'Sunrise Puffy Jacket', type: 'jacket', price: 101, image: jacket12 }
        ]
    },
    {
        id: 'hats',
        label: 'Hats',
        items: [
            { id: 'hat-01', name: 'Cowboy Hat', type: 'hat', price: 157, image: hat01 },
            { id: 'hat-02', name: 'Bowler Hat', type: 'hat', price: 82, image: hat02 },
            { id: 'hat-03', name: 'Gardening Hat', type: 'hat', price: 24, image: hat03 },
            { id: 'hat-04', name: 'Pikachu Ears', type: 'hat', price: 16, image: hat04 },
            { id: 'hat-05', name: 'Blue Beanie', type: 'hat', price: 21, image: hat05 },
            { id: 'hat-06', name: 'Sombrero', type: 'hat', price: 47, image: hat06 },
            { id: 'hat-07', name: 'Fedora', type: 'hat', price: 53, image: hat07 },
            { id: 'hat-08', name: 'Cycling Cap', type: 'hat', price: 44, image: hat08 },
            { id: 'hat-09', name: 'Astronaut Helmet', type: 'hat', price: 1497, image: hat09 },
            { id: 'hat-10', name: 'Dark Gray Ballcap', type: 'hat', price: 18, image: hat10 },
            { id: 'hat-11', name: 'Sunhat', type: 'hat', price: 42, image: hat11 },
            { id: 'hat-12', name: 'Red Beret', type: 'hat', price: 27, image: hat12 }
        ]
    },
    {
        id: 'shoes',
        label: 'Shoes',
        items: [
            { id: 'shoes-01', name: 'White Sneakers', type: 'shoes', price: 39, image: shoes01 },
            { id: 'shoes-02', name: 'Plain Sandals', type: 'shoes', price: 26, image: shoes02 },
            { id: 'shoes-03', name: 'Cardboard Heels', type: 'shoes', price: 9, image: shoes03 },
            { id: 'shoes-04', name: 'Black Heel Boots', type: 'shoes', price: 78, image: shoes04 },
            { id: 'shoes-05', name: 'Fuzzy Boots', type: 'shoes', price: 63, image: shoes05 },
            { id: 'shoes-06', name: 'Goku Sneakers', type: 'shoes', price: 46, image: shoes06 },
            { id: 'shoes-07', name: 'Fancy Sandals', type: 'shoes', price: 34, image: shoes07 },
            { id: 'shoes-08', name: 'Red Rubber Boots', type: 'shoes', price: 57, image: shoes08 },
            { id: 'shoes-09', name: 'Thin Heels', type: 'shoes', price: 61, image: shoes09 },
            { id: 'shoes-10', name: 'White Converse', type: 'shoes', price: 24, image: shoes10 },
            { id: 'shoes-11', name: 'Old Geta Sandals', type: 'shoes', price: 6, image: shoes11 },
            { id: 'shoes-12', name: 'Cowboy Boots', type: 'shoes', price: 97, image: shoes12 }
        ]
    }
]

const collapsedCategories = ref(categories.map(category => category.id))


const cartTotal = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.price, 0)
})

watch([selectedItem, showScriptModal], ([item, scriptOpen]) => {
    document.body.style.overflow = item || scriptOpen ? 'hidden' : ''
})

function selectItem(item) {
    selectedItem.value = item
    showItemPractice.value = false
}

function closeDetails() {
    selectedItem.value = null
    showItemPractice.value = false
}

function openScriptModal() {
    showScriptModal.value = true
}

function showTooltip(type, event) {
    const blank = event.currentTarget
    if (!blank) return

    const blankRect = blank.getBoundingClientRect()

    activeTooltip.value = type

    tooltipPosition.value = {
        left: blankRect.left + blankRect.width / 2,
        top: blankRect.bottom + 10
    }
}

function hideTooltip() {
    activeTooltip.value = null
}

function closeScriptModal() {
    showScriptModal.value = false
}

function goHome() {
    window.location.href = '/'
}

function isInCart(itemId) {
    return cart.value.some(item => item.id === itemId)
}

function addToCart(item) {
    if (isInCart(item.id)) return
    cart.value.push(item)
}

function removeFromCart(itemId) {
    cart.value = cart.value.filter(item => item.id !== itemId)
}

function clearCart() {
    cart.value = []
}

function isCollapsed(categoryId) {
    return collapsedCategories.value.includes(categoryId)
}

function toggleCategory(categoryId) {
    if (isCollapsed(categoryId)) {
        collapsedCategories.value = collapsedCategories.value.filter(id => id !== categoryId)
        return
    }

    collapsedCategories.value.push(categoryId)
}

function scrollToCategory(categoryId) {
    if (isCollapsed(categoryId)) {
        collapsedCategories.value = collapsedCategories.value.filter(id => id !== categoryId)
    }

    requestAnimationFrame(() => {
        const element = document.getElementById(categoryId)
        if (!element) return

        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        })
    })
}

function handleScroll() {
    showBackToTop.value = window.scrollY > 350
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    })
}

onMounted(() => {
    handleScroll()
    window.addEventListener('scroll', handleScroll)
})

onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll)
    document.body.style.overflow = ''
})
</script>

<style scoped>
.store-page {
    min-height: 100vh;
    padding: 24px;
    background:
        radial-gradient(circle at top left, #fff2a8, transparent 28%),
        radial-gradient(circle at bottom right, #b8f7ff, transparent 30%),
        #fff7df;
    color: #2f2a24;
    font-family: system-ui, sans-serif;
    scroll-behavior: smooth;
}

.back-button,
.script-button {
    position: fixed;
    top: 22px;
    z-index: 45;
    width: 58px;
    height: 58px;
    border: 4px solid #2f2a24;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    box-shadow: 5px 5px 0 #2f2a24;
    display: grid;
    place-items: center;
    transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        background-color 0.16s ease;
}

.back-button {
    left: 22px;
}

.script-button {
    right: 22px;
}

.back-button img,
.script-button img {
    width: 34px;
    height: 34px;
    object-fit: contain;
    transition:
        transform 0.2s ease,
        filter 0.2s ease;
}

.back-button:hover,
.script-button:hover {
    transform: translateY(-4px) rotate(-5deg) scale(1.04);
    box-shadow: 8px 8px 0 #2f2a24;
    background: #fff0f6;
}

.back-button:hover img,
.script-button:hover img {
    transform: rotate(8deg) scale(1.14);
    filter: drop-shadow(2px 2px 0 #ffe066);
}

.back-button:active,
.script-button:active {
    transform: translateY(1px) rotate(0deg) scale(0.98);
    box-shadow: 3px 3px 0 #2f2a24;
}

.store-header {
    display: flex;
    justify-content: center;
    text-align: center;
    margin-bottom: 22px;
}

.store-header h1 {
    display: inline-block;
    margin: 0;
    padding: 14px 30px 18px;
    font-size: clamp(2.4rem, 6vw, 4.8rem);
    line-height: 1;
    color: #ffffff;
    background: #ff6b6b;
    border: 5px solid #2f2a24;
    border-radius: 28px;
    text-shadow:
        3px 3px 0 #2f2a24,
        5px 5px 0 #ffe066;
    box-shadow:
        8px 8px 0 #2f2a24,
        0 10px 0 #ffb347;
    transform: rotate(-1.5deg);
    letter-spacing: 1px;
}

.store-header p {
    margin: 18px 0 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: #2f2a24;
}

.category-nav {
    position: sticky;
    top: 12px;
    z-index: 20;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    margin: 0 auto 28px;
    padding: 10px;
    max-width: 100%;
    overflow: visible;
}

.nav-pill {
    border: 3px solid #2f2a24;
    border-radius: 999px;
    padding: 9px 18px;
    background: #ffffff;
    color: #2f2a24;
    font-size: 1rem;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 3px 3px 0 #2f2a24;
    transition:
        transform 0.14s ease,
        box-shadow 0.14s ease,
        background-color 0.14s ease;
}

.nav-pill:hover {
    transform: translateY(-3px) rotate(-1deg);
    box-shadow: 5px 5px 0 #2f2a24;
    background: #fff0f6;
}

.nav-pill:active {
    transform: translateY(1px);
    box-shadow: 2px 2px 0 #2f2a24;
}

.store-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 24px;
    align-items: start;
    overflow: visible;
    position: relative;
}

.product-area {
    display: flex;
    flex-direction: column;
    gap: 32px;
    overflow: visible;
    min-width: 0;
}

.category-section {
    scroll-margin-top: 90px;
    overflow: visible;
}

.category-title-button {
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
    padding: 8px 14px 8px 4px;
    border: none;
    background: transparent;
    color: #2f2a24;
    cursor: pointer;
    border-radius: 16px;
    transition:
        background-color 0.14s ease,
        transform 0.14s ease;
}

.category-title-button:hover {
    background: rgba(255, 255, 255, 0.42);
    transform: translateX(3px);
}

.category-title-button h2 {
    margin: 0;
    font-size: 1.8rem;
}

.collapse-icon {
    width: 16px;
    height: 16px;
    border-right: 3px solid #2f2a24;
    border-bottom: 3px solid #2f2a24;
    transform: rotate(45deg) translateY(-3px);
    transition:
        transform 0.18s ease,
        opacity 0.18s ease;
}

.category-title-button:hover .collapse-icon {
    opacity: 0.55;
}

.collapse-icon.collapsed {
    transform: rotate(-45deg) translateY(3px);
}

.clothing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 18px;
    overflow: visible;
    padding: 8px;
    margin: -8px;
}

.section-collapse-enter-active,
.section-collapse-leave-active {
    transition:
        max-height 0.32s ease,
        opacity 0.24s ease,
        transform 0.24s ease,
        margin 0.32s ease;
    max-height: 1200px;
    overflow: visible;
}

.section-collapse-enter-from,
.section-collapse-leave-to {
    max-height: 0;
    opacity: 0;
    transform: translateY(-12px) scaleY(0.96);
    margin-top: -8px;
    overflow: hidden;
}

.section-collapse-enter-to,
.section-collapse-leave-from {
    max-height: 1200px;
    opacity: 1;
    transform: translateY(0) scaleY(1);
    overflow: visible;
}

.clothing-card {
    background: white;
    border: 4px solid #2f2a24;
    border-radius: 22px;
    padding: 14px;
    cursor: pointer;
    box-shadow: 5px 5px 0 #2f2a24;
    transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        background-color 0.16s ease,
        opacity 0.16s ease;
}

.clothing-card:hover {
    transform: translateY(-6px) rotate(-1deg);
    box-shadow: 8px 8px 0 #2f2a24;
    background: #fff0f6;
}

.clothing-card:active {
    transform: translateY(1px);
    box-shadow: 3px 3px 0 #2f2a24;
}

.clothing-card.sold {
    opacity: 0.7;
}

.image-wrap {
    position: relative;
}

.clothing-card img {
    width: 100%;
    height: 120px;
    object-fit: contain;
}

.sold-out {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(47, 42, 36, 0.72);
    color: white;
    font-size: 1.4rem;
    font-weight: 900;
    transform: rotate(-12deg);
    letter-spacing: 2px;
    border-radius: 14px;
}

.item-name {
    margin-top: 10px;
    font-weight: 800;
    font-size: 1rem;
}

.item-price {
    color: #ff6b6b;
    font-weight: 900;
}

.cart-panel {
    position: fixed;
    right: 28px;
    bottom: 92px;
    width: 320px;
    max-height: min(70vh, 560px);
    overflow-y: auto;
    background: white;
    border: 4px solid #2f2a24;
    border-radius: 24px;
    padding: 20px;
    box-shadow: 6px 6px 0 #2f2a24;
    z-index: 35;
}

.cart-panel h2 {
    margin: 0 0 12px;
}

.cart-panel ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.cart-panel li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 2px dashed #ddd;
}

.cart-panel li button {
    border: none;
    background: #ff6b6b;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-weight: 900;
    transition:
        transform 0.14s ease,
        background-color 0.14s ease;
}

.cart-panel li button:hover {
    transform: rotate(90deg) scale(1.12);
    background: #ff4757;
}

.cart-total {
    margin-top: 14px;
    font-size: 1.4rem;
    font-weight: 900;
}

.clear-cart-button {
    width: 100%;
    margin-top: 14px;
    border: 3px solid #2f2a24;
    border-radius: 14px;
    padding: 10px 14px;
    background: #ffb3b3;
    color: #2f2a24;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 3px 3px 0 #2f2a24;
    transition:
        transform 0.14s ease,
        box-shadow 0.14s ease,
        background-color 0.14s ease;
}

.clear-cart-button:hover {
    transform: translateY(-3px);
    box-shadow: 5px 5px 0 #2f2a24;
    background: #ff8f8f;
}

.details-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(255, 247, 223, 0.92);
    display: grid;
    place-items: center;
    padding: clamp(12px, 3vw, 28px);
    overflow-y: auto;
}

.details-modal {
    position: relative;
    width: min(560px, 94vw);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: white;
    border: 5px solid #2f2a24;
    border-radius: 30px;
    padding: clamp(18px, 4vw, 28px);
    text-align: center;
    box-shadow: 10px 10px 0 #2f2a24;
    animation: popIn 0.18s ease-out;
}

.close-button {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
    border: 3px solid #2f2a24;
    border-radius: 50%;
    background: #ff6b6b;
    color: white;
    font-size: 1.4rem;
    font-weight: 900;
    cursor: pointer;
    transition:
        transform 0.16s ease,
        background-color 0.16s ease,
        box-shadow 0.16s ease;
}

.close-button:hover {
    transform: rotate(90deg) scale(1.08);
    background: #ff4757;
    box-shadow: 3px 3px 0 #2f2a24;
}

.details-image {
    width: 100%;
    height: clamp(180px, 38vh, 300px);
    object-fit: contain;
    background: #f4fbff;
    border-radius: 20px;
}

.details-modal h2 {
    margin: 14px 0 8px;
    font-size: 2rem;
}

.details-price {
    font-size: 2rem;
    font-weight: 900;
    color: #ff6b6b;
    margin: 8px 0 16px;
}

.add-button {
    width: 100%;
    border: 4px solid #2f2a24;
    border-radius: 16px;
    padding: 12px;
    background: #7bed9f;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 4px 4px 0 #2f2a24;
    transition:
        transform 0.12s ease,
        box-shadow 0.12s ease;
}

.add-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 6px 6px 0 #2f2a24;
}

.add-button:disabled {
    cursor: not-allowed;
    background: #ccc;
    opacity: 0.8;
}

.phrase-box {
    width: 100%;
    margin-top: 18px;
    background: #fff7df;
    border: 3px solid #2f2a24;
    border-radius: 18px;
    padding: 14px;
    text-align: left;
    cursor: pointer;
    box-shadow: 4px 4px 0 #2f2a24;
    transition:
        transform 0.14s ease,
        box-shadow 0.14s ease,
        background-color 0.14s ease;
}

.phrase-box:hover {
    transform: translateY(-3px);
    box-shadow: 6px 6px 0 #2f2a24;
    background: #fff1c7;
}

.phrase-box.expanded:hover {
    transform: none;
}

.phrase-title {
    margin: 0;
    font-size: 1.1rem;
}

.detail-dialogue-line {
    width: fit-content;
    max-width: 86%;
    margin: 8px 0;
    padding: 10px 12px;
    border: 3px solid #2f2a24;
    border-radius: 16px;
    line-height: 1.45;
}

.detail-dialogue-line.clerk {
    margin-right: auto;
    background: #dff4ff;
}

.detail-dialogue-line.customer {
    margin-left: auto;
    background: #fff1c7;
}

.practice-dialogue {
    margin-top: 12px;
}

.practice-collapse-enter-active,
.practice-collapse-leave-active {
    transition:
        max-height 0.22s ease,
        opacity 0.18s ease,
        transform 0.18s ease;
    max-height: 260px;
    overflow: hidden;
}

.practice-collapse-enter-from,
.practice-collapse-leave-to {
    max-height: 0;
    opacity: 0;
    transform: translateY(-8px);
}

.practice-collapse-enter-to,
.practice-collapse-leave-from {
    max-height: 260px;
    opacity: 1;
    transform: translateY(0);
}


.script-modal {
    position: relative;
    width: min(680px, 94vw);
    height: auto;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: white;
    border: 5px solid #2f2a24;
    border-radius: 30px;
    padding: clamp(18px, 4vw, 32px);
    box-shadow: 10px 10px 0 #2f2a24;
    animation: popIn 0.18s ease-out;
}

.script-modal h2 {
    flex: 0 0 auto;
    margin: 0 0 18px;
    font-size: clamp(1.5rem, 5vw, 2rem);
    text-align: center;
}

.script-scroll {
    flex: 1 1 auto;
    min-height: 0;
    max-height: calc(100vh - 150px);
    overflow-y: auto;
    overflow-x: hidden;
    padding: 2px 4px 6px;
}

.script-lines {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.script-line {
    position: relative;
    width: fit-content;
    max-width: 82%;
    margin: 0;
    padding: 12px 14px;
    border: 3px solid #2f2a24;
    border-radius: 18px;
    font-size: 1.05rem;
    line-height: 1.5;
}

.script-line.clerk {
    align-self: flex-start;
    background: #dff4ff;
}

.script-line.customer {
    align-self: flex-end;
    background: #fff1c7;
}


.script-modal {
    position: relative;
    overflow: hidden;
}

.blank-tooltip {
    display: inline-block;
    font-weight: 900;
    cursor: help;
    text-decoration: underline;
    text-decoration-thickness: 3px;
    text-underline-offset: 4px;
}

.script-floating-tooltip {
    position: fixed;
    z-index: 999;
    transform: translateX(-50%);
    max-width: calc(100vw - 48px);
    padding: 8px 14px;
    background: #ffffff;
    color: #2f2a24;
    border: 3px solid #2f2a24;
    border-radius: 999px;
    box-shadow: 4px 4px 0 #2f2a24;
    font-size: 0.9rem;
    font-weight: 900;
    white-space: nowrap;
    text-align: center;
    pointer-events: none;
    animation: tooltipPop 0.14s ease-out;
}

@keyframes tooltipPop {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(-4px) scale(0.96);
    }

    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
}

.back-to-top-button {
    position: fixed;
    right: 28px;
    bottom: 28px;
    z-index: 30;
    border: 4px solid #2f2a24;
    border-radius: 999px;
    padding: 12px 18px;
    background: #ffe066;
    color: #2f2a24;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 5px 5px 0 #2f2a24;
    transition:
        transform 0.14s ease,
        box-shadow 0.14s ease,
        background-color 0.14s ease;
}

.back-to-top-button:hover {
    transform: translateY(-4px);
    box-shadow: 7px 7px 0 #2f2a24;
    background: #fff0a8;
}

@keyframes popIn {
    from {
        transform: scale(0.88) rotate(-1deg);
        opacity: 0;
    }

    to {
        transform: scale(1) rotate(0deg);
        opacity: 1;
    }
}

@media (max-width: 900px) {
    .store-layout {
        grid-template-columns: 1fr;
    }

    .cart-panel {
        position: static;
        width: min(320px, 100%);
        max-height: none;
        margin: 0 auto 28px;
    }

    .back-to-top-button {
        right: 16px;
        bottom: 20px;
    }

    .store-header h1 {
        font-size: 2.3rem;
    }

    .category-nav {
        position: static;
    }

    .details-modal {
        max-height: calc(100vh - 24px);
    }

    .script-modal {
        width: min(680px, 92vw);
        max-height: calc(100vh - 24px);
    }

    .script-scroll {
        max-height: calc(100vh - 135px);
    }

    .back-button,
    .script-button {
        top: 12px;
        width: 48px;
        height: 48px;
    }

    .back-button {
        left: 12px;
    }

    .script-button {
        right: 12px;
    }

    .back-button img,
    .script-button img {
        width: 28px;
        height: 28px;
    }

    .script-line,
    .detail-dialogue-line {
        max-width: 94%;
    }

    .tooltip-options {
        white-space: normal;
        min-width: 180px;
        text-align: center;
    }
}
</style>