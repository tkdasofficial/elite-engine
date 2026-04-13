# Elite Engine

A web-based game engine / IDE interface built with React 19 + TypeScript + Vite.

## Features
- Project manager (create, open, delete game projects)
- Multiple editor modes: Screens, Level Editor, Code Editor, Preview
- AI Assistant via Google Gemini API
- Scene hierarchy & virtual file system management
- Professional Viewport (Level Editor):
  - Infinite grid with configurable size, opacity, and on/off toggle
  - 667×375 Safe Zone indicator with indigo border + corner markers + label
  - Dimmed outer area (box-shadow) outside the safe zone
  - CSS-transform based pan/zoom (mouse wheel, middle-click drag, pinch-to-zoom, two-finger pan)
  - Object click-to-select, pointer drag-to-move with snap-to-grid
  - Selection gizmo (8 corner handles + rotation handle + name label)
  - Screen-based object visibility (Assign to Screen in inspector)
  - HUD: zoom percentage indicator, active screen indicator, Reset View button

## Tech Stack
- **Frontend:** React 19, TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS 4
- **Animations:** Motion (Framer Motion)
- **Icons:** Lucide React
- **Code Editor:** react-simple-code-editor + PrismJS
- **AI:** @google/genai (Google Gemini)

## Development
```bash
npm install
npm run dev   # starts on port 5000
```

## Environment Variables
- `GEMINI_API_KEY` — Required for AI assistant features (set in Secrets)

## Deployment
- Type: Static site
- Build: `npm run build`
- Public dir: `dist`
