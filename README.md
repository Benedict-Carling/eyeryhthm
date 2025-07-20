# EyeRhythm

A real-time eye movement tracking application that monitors blink patterns to detect fatigue and improve screen time awareness.

## Features

- **Real-time Blink Detection**: Uses MediaPipe Face Mesh to accurately detect eye blinks
- **Personalized Calibration**: Custom calibration flow to optimize detection for each user
- **Session Tracking**: Monitor screen time sessions with automatic start/stop based on face detection
- **Fatigue Monitoring**: Track blink rate patterns to identify potential eye fatigue
- **Privacy-First**: All processing happens locally in your browser - no video data is stored or transmitted

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI**: Radix UI, Tailwind CSS
- **Computer Vision**: MediaPipe Face Mesh, TensorFlow.js
- **Visualization**: Recharts for data visualization
- **State Management**: React Context API
- **Testing**: Vitest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A device with a webcam

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Benedict-Carling/eyeryhthm.git
cd eyeryhthm
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Calibration**: Start with the Calibration tab to set up personalized blink detection
2. **Blink Detection**: Test your calibration and see real-time blink counting
3. **Sessions**: Enable tracking to monitor your screen time and blink patterns

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:unit` - Run unit tests with Vitest

## Architecture

The application uses a modular architecture with:
- Custom React hooks for camera access and blink detection
- Context providers for global state management
- Reusable components for video display and visualization
- Service classes for calibration and data processing

## Privacy

This application prioritizes user privacy:
- All video processing happens locally in your browser
- No video data is recorded or transmitted
- Session data is stored only in browser local storage
- Camera access can be revoked at any time

## License

This project is private and proprietary.

## Acknowledgments

- MediaPipe team for the excellent face landmark detection
- Radix UI for accessible component primitives
- Next.js team for the amazing framework