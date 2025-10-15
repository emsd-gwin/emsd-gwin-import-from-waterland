# emsd-gwin-import-from-waterland

EMSD GWIN Import from Waterland - Automated Data Import Handler

## Overview

This application automatically fetches sensor data from the WaterLand API and imports it to the SmartDrainage system. It runs once per execution and is designed for external scheduling (cron, systemd, Kubernetes) to ensure continuous data synchronization.

## Features

- **Single Execution Mode**: Runs once per execution, exits with status code
- **Two-Step API Integration**: 
  1. Fetches site information from WaterLand API
  2. Retrieves latest sensor data for each site
- **Data Transformation**: Validates and transforms data to SmartDrainage format
- **Batch Import**: Sends all records as JSON array in single request
- **Robust Error Handling**: Includes retry logic and comprehensive error logging
- **Winston Logger**: Professional logging with timestamps and structured data
- **Functional Architecture**: ES6 arrow functions and functional programming patterns

## Architecture

```
src/
├── app/
│   └── index.js          # Main orchestrator - runImportCycle()
├── services/
│   ├── dataFetcher.js    # createDataFetcher() - WaterLand API
│   ├── dataProcessor.js  # process() - Data transformation
│   └── dataImporter.js   # createDataImporter() - SmartDrainage API
├── utils/
│   └── logger.js         # Winston logger configuration
└── index.js              # Application entry point
```

**Code Style**: Uses ES6 arrow functions and functional programming - no classes.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Valid WaterLand API access token
- SmartDrainage Dashboard credentials

## Installation

1. Clone the repository:
```bash
git clone https://github.com/emsd-gwin/emsd-gwin-import-from-waterland.git
cd emsd-gwin-import-from-waterland
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your actual credentials:
```env
# WaterLand API Configuration
WATERLAND_API_BASE_URL=https://flowapi.waterland.com.hk/api
WATERLAND_API_ACCESS_TOKEN=your_actual_token_here

# SmartDrainage Dashboard Configuration
DASHBOARD_INGRESS_URL=http://localhost:8086/jeecg-boot/ingress/receive/
DASHBOARD_INGRESS_USERNAME=waterland
DASHBOARD_INGRESS_PASSWORD=waterland@2025

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
```

## Usage

### Development Mode
```bash
npm start
```
Runs with Babel transpilation for development. Executes once and exits.

### Production Mode
```bash
npm run build
npm run start:prod
```
Builds the project and runs the compiled version.

### Linting
```bash
npm run lint
```
Checks code quality using ESLint with Standard style guide.

## WaterLand API Integration

### API 1: Get Token and Sites Information
**Endpoint**: `GET /api/{api_access_token}`

**Response Structure**:
```json
{
  "project_id": "WTD00224EMSD",
  "sites": [
    {
      "id": 138,
      "site_name": "RK005 (Lin Shing Road 2)",
      "project_site_id": "51.RK005 (Lin Shing Road 2)",
      "position_latitude": "22.262056",
      "position_longitude": "114.236030",
      "device_serial_number": "6072250087",
      ...
    }
  ]
}
```

### API 2: Get Sensor Data
**Endpoint**: `GET /api/{api_access_token}/{site_name}/data/latest`

**Response Structure**:
```json
{
  "id": 1525,
  "device_name": "6072250087",
  "device_type": "JMAX WL",
  "water_depth": 0,
  "water_level": 0,
  "signal_value": 18,
  "voltage": 375,
  "timestamp": "2025-10-08T12:00:00.000Z",
  "project_site_id": "138",
  "hko_rain_data": 0
}
```

## SmartDrainage Integration

### Data Transformation

WaterLand data is transformed to SmartDrainage format:

```javascript
{
  stationID: "device_name",
  deviceName: "device_name",
  devEUI: "device_name",
  tags: {
    StationID: "device_name",
    Latitude: 22.262056,
    Longitude: 114.236030,
    Location: "site_name",
    isCameraOnly: false
  },
  objectJSON: JSON.stringify({
    waterLevel: 0,
    batteryVoltage: 375,
    version: 2,
    rainGaugeDrop: 0,
    rssi: 18,
    ultrasonic: 0,
    // ... additional fields
  })
}
```

### Import Method

- **Endpoint**: `POST /jeecg-boot/ingress/receive/`
- **Authentication**: Basic Auth (username/password)
- **Format**: JSON array of transformed records
- **Retry**: 3 attempts with exponential backoff

## Data Processing

The application performs the following data processing steps:

1. **Validation**: Checks for required fields and data types
   - `device_name` (required)
   - `timestamp` (required)
   - `project_site_id` (required)

2. **Transformation**: Converts WaterLand API format to SmartDrainage format
   - Standardizes field names
   - Converts timestamps to ISO format
   - Combines sensor data with site information
   - Calculates derived values (e.g., AC voltage from DC)

3. **Error Handling**: Filters out invalid records and logs warnings

## Scheduling

The application is designed to run once per execution and then exit. Scheduling should be handled externally using one of the following methods:

### Option 1: Cron (Linux/macOS)
Add to crontab (`crontab -e`):
```bash
# Run every minute
* * * * * cd /path/to/emsd-gwin-import-from-waterland && npm start >> /var/log/emsd-gwin-import.log 2>&1
```

### Option 2: Systemd Timer (Linux)
Create `/etc/systemd/system/emsd-gwin-import.service`:
```ini
[Unit]
Description=EMSD GWIN Import from Waterland

[Service]
Type=oneshot
User=youruser
WorkingDirectory=/path/to/emsd-gwin-import-from-waterland
ExecStart=/usr/bin/npm start
```

Create `/etc/systemd/system/emsd-gwin-import.timer`:
```ini
[Unit]
Description=Run EMSD GWIN Import every minute

[Timer]
OnCalendar=*:0/1
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable emsd-gwin-import.timer
sudo systemctl start emsd-gwin-import.timer
```

### Option 3: Kubernetes CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: emsd-gwin-import
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: emsd-gwin-import
            image: your-registry/emsd-gwin-import:latest
            env:
            - name: WATERLAND_API_BASE_URL
              valueFrom:
                secretKeyRef:
                  name: emsd-gwin-secrets
                  key: api-url
          restartPolicy: OnFailure
```

## Logging

The application uses Winston for structured logging:

- **Log Levels**: error, warn, info, debug
- **Console Output**: Colorized with timestamps
- **Structured Data**: JSON metadata for easy parsing
- **Error Tracking**: Stack traces included for errors

### Log Examples

```
2025-10-15 08:36:15 [info]: Starting EMSD GWIN Import from Waterland...
2025-10-15 08:36:15 [info]: Fetching data from WaterLand API {"baseUrl":"https://flowapi.waterland.com.hk/api"}
2025-10-15 08:36:16 [info]: Sites retrieved from WaterLand API {"siteCount":15}
2025-10-15 08:36:17 [info]: Data processed successfully {"total":15,"valid":15,"invalid":0}
2025-10-15 08:36:18 [info]: Import cycle completed successfully {"success":true,"recordCount":15,"durationMs":3542}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WATERLAND_API_BASE_URL` | WaterLand API base URL | Required |
| `WATERLAND_API_ACCESS_TOKEN` | WaterLand API access token | Required |
| `DASHBOARD_INGRESS_URL` | SmartDrainage ingress endpoint | Required |
| `DASHBOARD_INGRESS_USERNAME` | SmartDrainage username | Required |
| `DASHBOARD_INGRESS_PASSWORD` | SmartDrainage password | Required |
| `NODE_ENV` | Environment (development/production) | `development` |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | `info` |

## Development

### Project Structure

- **Entry Point**: `src/index.js` - Loads environment variables and starts the app
- **Main Module**: `src/app/index.js` - Orchestrates the import cycle
- **Services**: Functional modules for fetching, processing, and importing data
- **Utils**: Shared utilities like the logger

### Code Style

The codebase uses **functional programming with ES6 arrow functions**:
- All functions use arrow syntax: `const myFunc = () => {}`
- Factory functions for services: `createDataFetcher()`
- Pure functions for data processing: `process()`
- No classes - functional patterns throughout

### Adding New Features

1. **New Data Source**: Create a new factory function in `src/services/`
2. **New Validation Rule**: Add to `validate()` in `dataProcessor.js`
3. **New Transformation**: Update `transform()` in `dataProcessor.js`

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env` file exists in project root
   - Check that dotenv.config() runs before imports

2. **Invalid URL Error**
   - Verify `WATERLAND_API_BASE_URL` has no trailing slash
   - Confirm API URLs are correctly formatted

3. **Authentication Errors**
   - Verify `WATERLAND_API_ACCESS_TOKEN` is valid and not expired
   - Check SmartDrainage credentials have proper permissions

4. **No Data Returned**
   - Check if sites exist in WaterLand API response
   - Verify site names are correct
   - Review validation rules in `dataProcessor.js`

5. **Import Failures**
   - Enable debug logging: `LOG_LEVEL=debug`
   - Check SmartDrainage API availability
   - Review retry logic in `dataImporter.js`

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Build the application:
   ```bash
   npm run build
   ```
3. Set up external scheduling (see Scheduling section above)
4. For production execution:
   ```bash
   npm run start:prod
   ```

### Exit Codes
- `0` - Success
- `1` - Failure (check logs for details)

## License

ISC

## Support

For issues and questions, please open an issue in the GitHub repository.
