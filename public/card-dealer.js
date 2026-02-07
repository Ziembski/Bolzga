// Card Dealer Script
// Manages dealing cards with sliding animation and stacking

// Constants for card notations
const SUITS = {
    SPADES: 'S',
    CLUBS: 'C',
    DIAMONDS: 'D',
    HEARTS: 'H'
};

const JOKERS = {
    BLACK: 'B',
    BLUE: 'U',
    RED: 'R'
};

const FIGURES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Card dealer state
let cardDeck = [];
let dealtCards = [];
let cardCounter = 0;

// Update deck counter display
function updateDeckCounter() {
    const counterElement = document.getElementById('deck-count');
    if (counterElement) {
        counterElement.textContent = cardDeck.length;
    }
}

// Initialize the deck with all 55 cards (52 standard + 3 jokers)
function initializeDeck() {
    cardDeck = [];
    
    // Add standard 52 cards
    Object.values(SUITS).forEach(suit => {
        FIGURES.forEach(figure => {
            cardDeck.push({ 
                figure: figure,      // Just the figure (A, 2, K, etc.)
                suit: suit,          // Just the suit (S, C, D, H)
                notation: figure     // Display notation is just the figure
            });
        });
    });
    
    // Add 3 jokers
    cardDeck.push({ figure: 'J', suit: JOKERS.BLACK, notation: 'J' });
    cardDeck.push({ figure: 'J', suit: JOKERS.BLUE, notation: 'J' });
    cardDeck.push({ figure: 'J', suit: JOKERS.RED, notation: 'J' });
    
    // Shuffle the deck
    shuffleDeck();
    
    // Update counter
    updateDeckCounter();
}

// Fisher-Yates shuffle algorithm
function shuffleDeck() {
    for (let i = cardDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardDeck[i], cardDeck[j]] = [cardDeck[j], cardDeck[i]];
    }
}

// Deal a card from the deck
function dealCard() {
    if (cardDeck.length === 0) {
        console.log('Deck is empty! Resetting...');
        initializeDeck();
    }
    
    const card = cardDeck.pop();
    createCardElement(card);
    dealtCards.push(card);
    updateDeckCounter();
}

// Deal a blank card
function dealBlankCard() {
    const blankCard = { figure: '', suit: '', notation: 'BLANK', isBlank: true };
    createCardElement(blankCard);
    dealtCards.push(blankCard);
}

// Create and animate a card element
function createCardElement(card) {
    const container = document.querySelector('.card_dealer_container');
    if (!container) {
        console.error('Card dealer container not found!');
        return;
    }
    
    // Create card wrapper
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'dealt-card';
    cardWrapper.style.zIndex = cardCounter;
    cardWrapper.dataset.cardId = cardCounter;
    
    // Create the card structure (similar to flip-playing-card but without flip)
    const cardInner = document.createElement('div');
    cardInner.className = 'dealt-card-inner';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'dealt-card-front';
    
    if (card.isBlank) {
        // Blank card - show backside
        const backside = document.createElement('div');
        backside.className = 'playing-card-backside';
        const backsideImg = document.createElement('img');
        backsideImg.src = '/img/cards/Backside.png';
        backside.appendChild(backsideImg);
        cardFront.appendChild(backside);
    } else {
        // Regular card
        const playingCard = document.createElement('div');
        playingCard.className = 'playing-card';
        
        // Inner frame with card image
        const innerFrame = document.createElement('div');
        innerFrame.className = 'pc-inner-frame';
        const cardImg = document.createElement('img');
        cardImg.src = getCardImagePath(card);
        innerFrame.appendChild(cardImg);
        playingCard.appendChild(innerFrame);
        
        // Top-left corner
        const topLeft = document.createElement('div');
        topLeft.className = 'pc-top-left';
        
        const topNotation = document.createElement('div');
        topNotation.className = 'detail-item field-pl-cd';
        const topValue = document.createElement('span');
        topValue.className = 'detail-value';
        topValue.textContent = card.notation;
        
        // Apply color based on suit
        if (card.suit === 'H' || card.suit === 'D' || card.suit === 'R') {
            topValue.style.color = '#d81b04'; // Red for Hearts, Diamonds, and Red Joker
        } else if (card.suit === 'U') {
            topValue.style.color = '#24b0ee'; // Blue for Blue Joker
        } else {
            topValue.style.color = '#000000'; // Black for Spades, Clubs, and Black Joker
        }
        
        topNotation.appendChild(topValue);
        topLeft.appendChild(topNotation);
        
        const topSuitWrapper = document.createElement('div');
        topSuitWrapper.className = 'img3-wrapper';
        const topSuitContainer = document.createElement('div');
        topSuitContainer.className = 'img3-container';
        const topSuitImg = document.createElement('img');
        topSuitImg.src = getSuitImagePath(card);
        topSuitContainer.appendChild(topSuitImg);
        topSuitWrapper.appendChild(topSuitContainer);
        topLeft.appendChild(topSuitWrapper);
        
        playingCard.appendChild(topLeft);
        
        // Bottom-right corner (rotated)
        const bottomRight = document.createElement('div');
        bottomRight.className = 'pc-bottom-right';
        
        const bottomNotation = document.createElement('div');
        bottomNotation.className = 'detail-item field-pl-cd';
        const bottomValue = document.createElement('span');
        bottomValue.className = 'detail-value';
        bottomValue.textContent = card.notation;
        
        // Apply color based on suit
        if (card.suit === 'H' || card.suit === 'D' || card.suit === 'R') {
            bottomValue.style.color = '#d81b04'; // Red for Hearts, Diamonds, and Red Joker
        } else if (card.suit === 'U') {
            bottomValue.style.color = '#24b0ee'; // Blue for Blue Joker
        } else {
            bottomValue.style.color = '#000000'; // Black for Spades, Clubs, and Black Joker
        }
        
        bottomNotation.appendChild(bottomValue);
        bottomRight.appendChild(bottomNotation);
        
        const bottomSuitWrapper = document.createElement('div');
        bottomSuitWrapper.className = 'img3-wrapper';
        const bottomSuitContainer = document.createElement('div');
        bottomSuitContainer.className = 'img3-container';
        const bottomSuitImg = document.createElement('img');
        bottomSuitImg.src = getSuitImagePath(card);
        bottomSuitContainer.appendChild(bottomSuitImg);
        bottomSuitWrapper.appendChild(bottomSuitContainer);
        bottomRight.appendChild(bottomSuitWrapper);
        
        playingCard.appendChild(bottomRight);
        
        cardFront.appendChild(playingCard);
    }
    
    cardInner.appendChild(cardFront);
    cardWrapper.appendChild(cardInner);
    container.appendChild(cardWrapper);
    
    // Trigger animation
    animateCardDeal(cardWrapper, cardCounter);
    cardCounter++;
}

// Get the card image path (Img4) - format: /img/cards/X_Y.png
function getCardImagePath(card) {
    if (card.isBlank) return '';
    return `/img/cards/${card.figure}_${card.suit}.png`;
}

// Get the suit image path (Img3) - format: /img/cards/Y.png where Y is suit
function getSuitImagePath(card) {
    if (card.isBlank) return '';
    return `/img/cards/${card.suit}.png`;
}

// Animate card dealing
function animateCardDeal(cardElement, index) {
    // Start position: bottom center, off-screen
    cardElement.style.transform = 'translateY(100vh)';
    cardElement.style.opacity = '0';
    
    // Force reflow
    cardElement.offsetHeight;
    
    // Calculate final position in stack
    const stackOffset = index * 3; // Each card offset by 3vmin
    
    // Animate to final position
    setTimeout(() => {
        cardElement.style.transition = 'transform 0.8s ease-out, opacity 0.5s ease-out';
        cardElement.style.transform = `translateY(${stackOffset}vmin)`;
        cardElement.style.opacity = '1';
    }, 50);
}

// Reset the deck and clear dealt cards
function resetDeck() {
    const container = document.querySelector('.card_dealer_container');
    if (!container) return;
    
    // Remove all dealt cards with animation
    const dealtCardElements = container.querySelectorAll('.dealt-card');
    dealtCardElements.forEach((card, index) => {
        setTimeout(() => {
            card.style.transition = 'transform 0.5s ease-in, opacity 0.5s ease-in';
            card.style.transform = 'translateY(100vh)';
            card.style.opacity = '0';
            
            setTimeout(() => {
                card.remove();
            }, 500);
        }, index * 50);
    });
    
    // Reset state
    setTimeout(() => {
        dealtCards = [];
        cardCounter = 0;
        initializeDeck();
    }, dealtCardElements.length * 50 + 500);
}

// Initialize on page load
function initCardDealer() {
    initializeDeck();
    console.log('Card dealer initialized with', cardDeck.length, 'cards');
}

// Auto-initialize if the container exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCardDealer);
} else {
    initCardDealer();
}
