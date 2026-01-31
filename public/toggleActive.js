/**
 * Expanded toggleActive script
 * Adds/removes 'inactive' class to specific elements within a player-row
 */

function toggleActive(checkbox) {
    // Find the parent player-row
    const playerRow = checkbox.closest('.player-row');
    
    if (!playerRow) {
        console.warn('No .player-row parent found for checkbox');
        return;
    }
    
    const isChecked = checkbox.checked;
    
    // Define all the selectors for elements that should get the inactive class
    const selectors = [
        '.player-img-element',
        '.player-name',
        '.stat-label1',
        '.stat-value[data-field="Garda"]',
        '.stat-value[data-field="Wytrzymałość"]',
        '.stat-label3',
        '.stat-value2',
        '.stat-label4',
        '.karta-input'
    ];
    
    // Toggle inactive class on each matching element
    selectors.forEach(selector => {
        const elements = playerRow.querySelectorAll(selector);
        elements.forEach(element => {
            if (isChecked) {
                element.classList.remove('inactive');
            } else {
                element.classList.add('inactive');
            }
        });
    });
    
    // Also uncheck szok-checkbox when agent is unchecked
    const szokCheckbox = playerRow.querySelector('[id^="szok-checkbox"]');
    if (szokCheckbox && !isChecked) {
        szokCheckbox.checked = false;
    }
}
