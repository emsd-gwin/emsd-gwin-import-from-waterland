# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Data Import Handler that fetches sensor data from the WaterLand API and imports it to the SmartDrainage system. The application runs once per execution and is designed for external scheduling (cron, systemd, Kubernetes).

## Architecture

The codebase uses **functional programming with ES6 arrow functions** - no classes.

### Entry Points
- `src/index.js` - Entry point that loads environment variables and starts the app
- `src/app/index.js` - Main import cycle function `runImportCycle()`

### Services (Functional Pattern)
- `src/services/dataFetcher.js` - Factory function `createDataFetcher()` for WaterLand API integration
- `src/services/dataProcessor.js` - Pure function `process()` for data validation and transformation
- `src/services/dataImporter.js` - Factory function `createDataImporter()` for SmartDrainage API

### Utilities
- `src/utils/logger.js` - Winston logger configuration

## Data Flow

1. **Fetch**: Get sites from WaterLand `/api/{token}`
2. **Fetch**: Get sensor data from `/api/{token}/{site_name}/data/latest` for each site
3. **Transform**: Convert WaterLand format to SmartDrainage format
4. **Import**: POST data as JSON array to SmartDrainage with basic auth

## Code Style

- **ES6 Arrow Functions**: All functions use arrow syntax (`const func = () => {}`)
- **Functional Programming**: Factory functions and pure functions, no classes
- **Const Declarations**: Use `const` for all variable declarations
- **Modern JavaScript**: Destructuring, async/await, template literals

## Common Commands

### Development
- `npm start` - Run the application using babel-node (runs once and exits)
- `npm run start:prod` - Run the production build from dist/ folder
- `npm run build` - Build the project (clears dist/, transpiles with Babel, copies .env and config/)

### Linting
- `npm run lint` - Run ESLint on source files (follows Standard config)

## Environment Variables

```env
# WaterLand API
WATERLAND_API_BASE_URL=https://flowapi.waterland.com.hk/api
WATERLAND_API_ACCESS_TOKEN=your_token

# SmartDrainage Dashboard
DASHBOARD_INGRESS_URL=http://localhost:8086/jeecg-boot/ingress/receive/
DASHBOARD_INGRESS_USERNAME=waterland
DASHBOARD_INGRESS_PASSWORD=waterland@2025

# Settings
NODE_ENV=development
LOG_LEVEL=info
```

## WaterLand API Integration

### API 1: Get Token and Sites
- **URL**: `GET /api/{token}`
- **Returns**: Project and sites information

### API 2: Get Sensor Data
- **URL**: `GET /api/{token}/{site_name}/data/latest`
- **Returns**: Latest sensor readings for site

## SmartDrainage Format

Data is transformed to SmartDrainage format:
```javascript
{
  stationID: string,
  deviceName: string,
  devEUI: string,
  tags: {
    StationID: string,
    Latitude: number,
    Longitude: number,
    Location: string,
    isCameraOnly: boolean
  },
  objectJSON: string // JSON.stringify of sensor data
}
```

## Scheduling

The application is designed for external scheduling:
- **Cron**: `* * * * * cd /path && npm start`
- **Systemd**: Create service + timer units
- **Kubernetes**: CronJob with schedule `*/1 * * * *`

## Exit Codes

- `0` - Success
- `1` - Failure (check logs)

## Key Implementation Notes

1. **No Classes**: All code uses functional programming patterns
2. **Arrow Functions**: Use ES6 arrow syntax consistently
3. **Factory Functions**: Services use factory pattern (e.g., `createDataFetcher()`)
4. **Pure Functions**: Data processing uses pure functions
5. **Single Execution**: App runs once per execution, no internal scheduler
6. **Batch Import**: All records sent as JSON array in single request
7. **Environment Loading**: dotenv.config() runs before importing modules
