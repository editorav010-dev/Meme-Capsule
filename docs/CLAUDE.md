# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Setup

1. **Install Dependencies**:
   `npm install` - Installs all required packages including TypeScript, React, and build tools.

2. **Start Development Server**:
   `npm run dev` - Launch Vite development server (assumes `vite` is configured in package.json).

3. **Build Production Bundle**:
   `npm run build` - Generates optimized production assets using Rollup/Babel (based on node_modules configuration).

4. **Run Tests**:
   `npm test` - Executes Jest/Hairstandard tests (configured in Jest configuration files).

5. **Lint Code**:
   `npm run lint` - Runs ESLint/TypeScript linter (configured in .eslintrc and tsconfig.json).

6. **Hot Reload**:
   `npm run watch` - Enables file watcher for TypeScript and React code changes.

## Code Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite (with react-refresh support)
- **Bundler**: Rollup (for production builds)
- **State Management**: Context API/Public API (no Redux/VRTX indicated)
- **Utility Libraries**: nanoid for unique IDs, picocolors for styling

### Key Directories
- `src/`: Main source code with React components and hooks
- `public/`: Static assets (no build process required)
- `node_modules/`: Contains all dependencies including:
  - Vite CLI for dev server
  - Rollup for bundling
  - Esbuild for TypeScript compilation
  - JSDom for testing

### Build Process
1. Development: `npm run dev` runs Vite in watch mode with React-Refresh hot reloading
2. Production: `npm run build` bundles code with Rollup and TypeScript
3. Testing: `npm test` runs Jest tests with code coverage

## Configuration Files
- `tsconfig.json`: TypeScript configuration (target ES2020, module ESNext)
- `package.json`: Scripts for dev/build/test
- `.eslintrc`: Linting rules (extends airbnb-base with React/jest
- `vite.config.js`: Configuration for Vite dev server

## Common Patterns
- Uses `nanoid` for unique meme IDs
- Components follow context-based structure (e.g. `MemeComponent.tsx`)
- TypeScript interfaces defined in `/types/` (if exists)
- JSX syntax with React.FC and hooks

## Commands to Remember
- `npm start` - Alternative dev command (if defined in package.json)
- `tsc --build` - For TypeScript compilation
- `eslint --fix` - Auto-fix linting issues
- `npm run build` - For production build
- `npm run test` - For running tests