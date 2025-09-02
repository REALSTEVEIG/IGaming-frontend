# iGaming Frontend

A Next.js-based frontend application for the iGaming platform providing user interface for authentication, game participation, and leaderboard viewing.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── game/            # Game session page
│   ├── home/            # User dashboard
│   ├── leaderboard/     # Leaderboard displays
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Landing page
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state
└── hooks/               # Custom React hooks
    └── useSocket.ts     # Socket.IO hook
```

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Running backend API server

## Environment Variables

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Installation

```bash
# Install dependencies
npm install
```

## Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Available Scripts

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Features

### Authentication
- User login and registration
- JWT token management
- Automatic token refresh
- Protected route handling

### Game Session
- Real-time game participation
- Number selection interface
- Session status monitoring
- WebSocket connection management

### Leaderboard
- Top players ranking
- Recent game sessions
- Winners by time period (day/week/month)
- Personal statistics display

### User Interface
- Responsive design
- Modern component styling
- Loading states
- Error handling
- Toast notifications

## Configuration

### API Integration
The frontend communicates with the backend API through:
- REST endpoints for data fetching
- WebSocket connections for real-time updates
- JWT authentication headers

### Styling
- Tailwind CSS for utility-first styling
- Custom CSS components in globals.css
- Responsive design breakpoints
- Dark/light theme support ready

## Development Guidelines

### File Organization
- Use Next.js App Router structure
- Place reusable components in appropriate directories
- Keep contexts separate from components
- Use TypeScript for type safety

### State Management
- React Context for global state (authentication)
- Local component state for UI interactions
- Custom hooks for reusable logic

### Error Handling
- Axios interceptors for API errors
- React error boundaries for component errors
- User-friendly error messages

## Build Configuration

### Next.js Configuration
Key configurations in `next.config.js`:
- TypeScript support
- ESLint integration
- Image optimization
- API proxy (if needed)

### Tailwind Configuration
Customizations in `tailwind.config.js`:
- Custom color palette
- Extended spacing scale
- Custom font families
- Component utilities

## Production Deployment

### Build Process
```bash
npm run build
npm start
```

### Static Export (optional)
For static hosting:
```bash
# Modify next.config.js for static export
npm run build
```

### Environment Variables
Set production environment variables:
- `NEXT_PUBLIC_API_URL` - Production API endpoint

## Performance Considerations

- Image optimization with Next.js Image component
- Code splitting with dynamic imports
- Bundle analysis with webpack-bundle-analyzer
- Caching strategies for API calls

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features required
- WebSocket support required for real-time features

## Troubleshooting

### Common Issues

1. **API Connection**: Verify NEXT_PUBLIC_API_URL is correct and backend is running
2. **WebSocket Issues**: Check network connectivity and firewall settings
3. **Authentication Problems**: Clear localStorage and cookies
4. **Build Errors**: Run `npm run type-check` to identify TypeScript issues

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=* npm run dev
```

## Contributing

1. Follow Next.js and React best practices
2. Use TypeScript for all new code
3. Implement responsive design
4. Add proper error handling
5. Test across different browsers
6. Follow the existing code structure

## Security Considerations

- JWT tokens stored in localStorage
- XSS protection through Content Security Policy
- CSRF protection for API calls
- Input validation and sanitization
- Secure cookie settings for production