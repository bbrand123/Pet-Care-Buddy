(function registerDefaultMinigameDescriptors(global) {
    'use strict';

    const DEFAULT_MINIGAME_DESCRIPTORS = [
        { id: 'fetch', name: 'Fetch', icon: '🎾', description: 'Throw a ball for your pet! Click or press Enter to throw.', a11y: 'keyboard', a11yNote: 'Fully keyboard accessible', scoreLabel: 'catches', sortOrder: 1 },
        { id: 'hideseek', name: 'Hide & Seek', icon: '🍪', description: 'Find hidden treats! Use keyboard (Tab + Enter) or pointer.', a11y: 'keyboard', a11yNote: 'Fully keyboard accessible', scoreLabel: 'treats', sortOrder: 2 },
        { id: 'bubblepop', name: 'Bubble Pop', icon: '🫧', description: 'Pop bubbles during bath time! Use pointer or Tab to navigate bubbles.', a11y: 'keyboard', a11yNote: 'Keyboard: Tab to bubbles, Enter to pop', scoreLabel: 'pops', sortOrder: 3 },
        { id: 'matching', name: 'Matching', icon: '🃏', description: 'Match food & accessory pairs! Use keyboard or click.', a11y: 'keyboard', a11yNote: 'Fully keyboard accessible', scoreLabel: 'score', sortOrder: 4 },
        { id: 'simonsays', name: 'Simon Says', icon: '🎵', description: 'Follow the pattern of colors & sounds! Use keyboard or click.', a11y: 'keyboard', a11yNote: 'Fully keyboard accessible', scoreLabel: 'rounds', sortOrder: 5 },
        { id: 'coloring', name: 'Coloring', icon: '🎨', description: 'Color your pet or backgrounds! Use pointer or keyboard.', a11y: 'keyboard', a11yNote: 'Keyboard: Tab to regions, Enter to color', scoreLabel: 'points', sortOrder: 6 },
        { id: 'racing', name: 'Lane Racing', icon: '🏁', description: 'Switch lanes and dodge obstacles on the race track.', a11y: 'keyboard', a11yNote: 'Keyboard: Left/Right arrows to switch lanes', scoreLabel: 'dodges', sortOrder: 7 },
        { id: 'cooking', name: 'Cooking Lab', icon: '🍲', description: 'Combine ingredients to cook special pet food.', a11y: 'keyboard', a11yNote: 'Keyboard: Tab ingredients, Enter to add and cook', scoreLabel: 'recipes', sortOrder: 8 },
        { id: 'fishing', name: 'Pond Fishing', icon: '🎣', description: 'Cast and catch fish in the park pond timing zone.', a11y: 'keyboard', a11yNote: 'Keyboard: Space to cast and reel in', scoreLabel: 'catches', sortOrder: 9 },
        { id: 'rhythm', name: 'Rhythm Beats', icon: '🥁', description: 'Match procedural beats and keep your combo alive.', a11y: 'keyboard', a11yNote: 'Keyboard: Space on beat to score', scoreLabel: 'beats', sortOrder: 10 },
        { id: 'slider', name: 'Slider Puzzle', icon: '🧩', description: 'Solve a sliding portrait puzzle of your pet.', a11y: 'keyboard', a11yNote: 'Keyboard: Arrow keys move the blank tile', scoreLabel: 'tiles', sortOrder: 11 },
        { id: 'trivia', name: 'Animal Trivia', icon: '🦉', description: 'Answer real animal fact questions for rewards.', a11y: 'keyboard', a11yNote: 'Keyboard: Tab choices, Enter to answer', scoreLabel: 'facts', sortOrder: 12 },
        { id: 'runner', name: 'Endless Runner', icon: '🏃', description: 'Jump over endless obstacles and chase distance.', a11y: 'keyboard', a11yNote: 'Keyboard: Space to jump', scoreLabel: 'meters', sortOrder: 13 },
        { id: 'tournament', name: 'Tournament Cup', icon: '🏆', description: 'Play bracket rounds, climb leaderboard, win the cup.', a11y: 'keyboard', a11yNote: 'Keyboard: Tab actions, Enter to advance round', scoreLabel: 'wins', sortOrder: 14 },
        { id: 'coop', name: 'Co-op Relay', icon: '🤝', description: 'Control two pets at once in cooperative challenges.', a11y: 'keyboard', a11yNote: 'Keyboard: Alternate A and L for each pet', scoreLabel: 'relay', sortOrder: 15 }
    ];

    if (global.MiniGameRegistry && typeof global.MiniGameRegistry.registerMany === 'function') {
        global.MiniGameRegistry.registerMany(DEFAULT_MINIGAME_DESCRIPTORS);
    }

    global.DEFAULT_MINIGAME_DESCRIPTORS = DEFAULT_MINIGAME_DESCRIPTORS;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DEFAULT_MINIGAME_DESCRIPTORS;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
