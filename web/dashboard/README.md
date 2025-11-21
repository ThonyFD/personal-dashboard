# AI Finance Agent - Dashboard

React + TypeScript dashboard for viewing financial transactions.

## Features

- Overview page with KPIs and recent transactions
- Transactions page with full list and CSV export
- Merchants page with analytics
- Responsive design
- Real-time data from Firebase Data Connect

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create `.env.local`:

```
VITE_API_URL=https://your-api-endpoint.com
```

## Deployment

### Firebase Hosting

```bash
# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Cloud Run (Static Hosting)

```bash
# Build
npm run build

# Create simple static server
npm install -g serve

# Deploy dist folder to Cloud Run
# (Use nginx Docker image to serve static files)
```

## API Integration

The dashboard expects a REST API with these endpoints:

- `GET /api/stats` - Dashboard statistics
- `GET /api/transactions?limit=N` - List transactions
- `GET /api/merchants` - List merchants with stats
- `GET /api/transactions/export` - Export transactions as CSV

These endpoints should be implemented as a thin layer over Firebase Data Connect GraphQL queries.

## Tech Stack

- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- React Router
- Recharts (for charts)
- date-fns (for date formatting)
