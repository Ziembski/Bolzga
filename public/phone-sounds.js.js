// sound configuration
// Easy configuration: Just change the sound path for each button
const buttonSounds = {
    'd4': './sounds/dial1.mp3',
    'd6': './sounds/dial2.mp3',
    'd8': './sounds/dial3.mp3',
    'd10': './sounds/dial4.mp3',
    'd12': './sounds/dial5.mp3',
    'plus': './sounds/dial6.mp3',    // For +1 button
    'minus': './sounds/dial7.mp3',   // For -1 button
    'clear': './sounds/dial8.mp3'    // For X button
};

// Audio player with volume control
const phoneAudio = {
    volume: 0.5, // Adjust volume here (0.0 to 1.0)
    
    play: function(buttonType) {
        const soundPath = buttonSounds[buttonType];
        if (!soundPath) return;
        
        const audio = new Audio(soundPath);
        audio.volume = this.volume;
        audio.play().catch(err => console.log('Audio playback failed:', err));
    }
};

// Add click listeners to phone buttons
document.addEventListener('DOMContentLoaded', function() {
    // Map phone button classes to their types
    const buttonMap = {
        'phone_d4': 'd4',
        'phone_d6': 'd6',
        'phone_d8': 'd8',
        'phone_d10': 'd10',
        'phone_d12': 'd12',
        'phone_plus': 'plus',
        'phone_minus': 'minus',
        'phone_x': 'clear'
    };
    
    // Attach listeners to each button
    Object.keys(buttonMap).forEach(className => {
        const button = document.querySelector(`.${className}`);
        if (button) {
            button.addEventListener('click', function() {
                phoneAudio.play(buttonMap[className]);
            });
        }
    });
});