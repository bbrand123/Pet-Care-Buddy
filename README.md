# 🐾 My Little Friend

A fun, interactive virtual pet game built with vanilla JavaScript, HTML, and CSS.

## 🎮 Features

### Core Gameplay
- **13 Pet Types**: Dogs, cats, bunnies, birds, hamsters, turtles, fish, frogs, hedgehogs, pandas, penguins, unicorns 🦄, and dragons 🐉
- **Growth System**: Pets grow from Baby → Child → Adult based on care actions
- **4 Core Needs**: Hunger, Cleanliness, Happiness, Energy
- **Dynamic Day/Night Cycle**: Real-time based with mood effects
- **Weather & Seasons**: Affects pet mood and gameplay bonuses

### Customization
- **4 Egg Types**: Different eggs hint at what pet will hatch (furry, feathery, scaly, magical)
- **Color Picker**: Choose from 5 colors per pet type
- **4 Patterns**: Solid, Spotted, Striped, Patchy
- **Accessories**: Hats, bows, collars, glasses, costumes
- **Furniture**: Customize beds and decorations in bedroom, kitchen, and bathroom
- **Text-to-Speech**: Hear your pet's name spoken aloud

### Activities
- **6 Rooms**: Bedroom, Kitchen, Bathroom, Backyard, Park, Garden
- **Room Bonuses**: Each room gives +30% bonus to specific actions
- **6 Mini-Games**: Fetch, Hide & Seek, Bubble Pop, Matching, Simon Says, Coloring
- **Garden System**: Plant, water, and harvest crops to feed your pet

### Progression
- **Mythical Unlocks**: Raise adult pets to unlock unicorns (2 adults) and dragons (3 adults)
- **Pet Codex**: Discover and collect all pet species
- **Stats Tracking**: View detailed statistics and achievements

## 📁 Project Structure

```
My-Little-Friend/
├── index.html          (1.2KB - minimal HTML structure)
├── css/
│   └── style.css      (113KB - all styles, animations, themes)
└── js/
    ├── constants.js   (22KB - game data: pets, rooms, seasons)
    ├── svg.js         (60KB - SVG generation for pets and eggs)
    ├── game.js        (82KB - core logic: save/load, stats, decay)
    ├── ui.js          (85KB - rendering functions and modals)
    └── minigames.js   (125KB - all 6 mini-games)
```

## 🚀 Getting Started

### Play Online
Visit the GitHub Pages URL: `https://[your-username].github.io/My-Little-Friend/`

### Run Locally
1. Clone the repository
2. Open `index.html` in a web browser
3. Start caring for your pet!

No build process or dependencies required - it's pure vanilla JavaScript!

## 🛠️ Development

### File Organization

**constants.js** - Game Data
- Pet types, egg types, patterns, accessories
- Rooms, weather, seasons, crops
- All game constants and configuration

**svg.js** - Graphics
- SVG generation for eggs (4 types)
- SVG generation for pets (13 species)
- Pattern and accessory overlays

**game.js** - Core Logic
- Game state management
- Save/load to localStorage
- Pet creation and stats
- Decay timers and weather system

**ui.js** - User Interface
- Render functions (egg phase, pet phase)
- Modals (naming, customization, codex, stats)
- Toasts and particle effects

**minigames.js** - Mini-games
- Fetch, Hide & Seek, Bubble Pop
- Matching, Simon Says, Coloring
- Score tracking and rewards

### Adding New Features

**Add a New Pet Type:**
1. Add entry to `PET_TYPES` in `constants.js`
2. Create SVG generator in `svg.js`
3. Add to appropriate egg type

**Add a New Room:**
1. Add to `ROOMS` in `constants.js`
2. Define background colors and bonuses
3. Add navigation button in `generateRoomNavHTML()`

**Add a New Mini-game:**
1. Add game functions to `minigames.js`
2. Add button in mini-games menu
3. Implement scoring and rewards

## 🎨 Customization

### Modify Colors
Edit color variables in `css/style.css`:
```css
:root {
    --color-primary: #FF6B9D;
    --color-secondary: #4ECDC4;
    --color-accent: #FFE66D;
}
```

### Add New Accessories
Add to `ACCESSORIES` object in `constants.js`:
```javascript
newAccessory: {
    name: 'Accessory Name',
    emoji: '🎀',
    type: 'hat|bow|collar|glasses|costume',
    position: 'top|head|neck|eyes|body'
}
```

Then add rendering logic in `generateAccessoryOverlay()` in `svg.js`.

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## ♿ Accessibility

- WCAG AA color contrast compliance
- Full keyboard navigation
- Screen reader support with ARIA labels
- Touch targets minimum 48px
- Reduced motion support

## 📊 Performance

- **Initial Load**: < 500KB total
- **First Paint**: Fast (minimal HTML)
- **Browser Caching**: CSS/JS cached separately
- **LocalStorage**: Game saves automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

Built with ❤️ using vanilla JavaScript - no frameworks, just pure web technologies!

---

**Tip**: Press `📖 Codex` to view all pet species and track your collection progress!
