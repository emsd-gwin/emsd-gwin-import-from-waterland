import logger from '../utils/logger.js';
import createDataFetcher from '../services/dataFetcher.js';
import processData from '../services/dataProcessor.js';
import createDataImporter from '../services/dataImporter.js';

const runImportCycle = async () => {
  const waterlandApiBaseUrl = process.env.WATERLAND_API_BASE_URL || '';
  const waterlandApiAccessToken = process.env.WATERLAND_API_ACCESS_TOKEN || '';
  const dashboardIngressUrl = process.env.DASHBOARD_INGRESS_URL || '';
  const dashboardIngressUsername = process.env.DASHBOARD_INGRESS_USERNAME || '';
  const dashboardIngressPassword = process.env.DASHBOARD_INGRESS_PASSWORD || '';

  logger.info('Starting EMSD GWIN Import from Waterland...');
  logger.info('Data Import Handler initialized', {
    waterlandApiBaseUrl,
    dashboardIngressUrl,
    username: dashboardIngressUsername
  });

  const startTime = Date.now();

  try {
    logger.info('Starting import cycle');

    // Initialize services
    const dataFetcher = createDataFetcher(waterlandApiBaseUrl, waterlandApiAccessToken);
    const dataImporter = createDataImporter(
      dashboardIngressUrl,
      dashboardIngressUsername,
      dashboardIngressPassword
    );

    // Fetch data from WaterLand API
    const rawData = await dataFetcher.fetch();

    // Process data with validation and transformation
    const processedData = await processData(rawData);

    // Import to SmartDrainage system
    const result = await dataImporter.import(processedData);

    const duration = Date.now() - startTime;
    logger.info('Import cycle completed successfully', {
      ...result,
      durationMs: duration
    });

    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error during import cycle', {
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });
    process.exit(1);
  }
};

export default runImportCycle;
