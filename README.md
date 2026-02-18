# Kilo Gateway AI Model Explorer

A modern, high-performance AI model explorer built with Next.js 16, React 19, and Tailwind CSS 4. This application allows users to browse, search, and filter AI models available through the Kilo Gateway API.

## Features

- **Live Model Browsing**: Fetches real-time data from the Kilo Gateway API.
- **Advanced Filtering**: Filter by provider, free/paid status, and search by name or ID.
- **Modality Badges**: Visual indicators for Text, Image, Audio, and Video capabilities.
- **Responsive Design**: Optimized for mobile, tablet, and desktop views.
- **Grid & List Views**: Toggle between different layout styles.
- **Dark Mode**: Sleek zinc/slate palette with neon-green and violet accents.
- **Performance**: Built with Next.js Server Components and optimized client-side interactivity.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `src/app/`: Next.js App Router pages and layouts.
- `src/components/`: Reusable React components (ModelCard, SearchFilter, etc.).
- `src/lib/`: Utility functions and TypeScript type definitions.
- `.kilocode/`: AI context and development recipes.

## Development

### Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun lint` | Run ESLint checks |
| `bun typecheck` | Run TypeScript type checks |

## License

MIT
