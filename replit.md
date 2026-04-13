# Elite Engine

A web-based game engine / IDE interface built with React 19 + TypeScript + Vite.

## Features
- Project manager (create, open, delete game projects)
- Multiple editor modes: Screens, Level Editor, Code Editor, Preview
- AI Assistant via Google Gemini API
- Scene hierarchy & virtual file system management

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
