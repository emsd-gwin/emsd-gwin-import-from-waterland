import logger from '../utils/logger.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createDataImporter = (ingressUrl, username, password) => {
  const retryAttempts = 3;
  const timeout = 30000;

  const importWithRetry = async (data, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

      const response = await fetch(ingressUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      if (attempt < retryAttempts) {
        logger.warn(`Import attempt ${attempt} failed, retrying...`, {
          attempt,
          maxAttempts: retryAttempts,
          recordCount: data.length,
          error: error.message
        });
        await delay(1000 * attempt);
        return importWithRetry(data, attempt + 1);
      }
      throw error;
    }
  };

  const importData = async (data) => {
    try {
      logger.info('Importing data to SmartDrainage', {
        url: ingressUrl,
        recordCount: data.length
      });

      if (data.length === 0) {
        logger.info('No data to import');
        return { success: true, recordCount: 0 };
      }

      const sensorInfoList = {
        sensorInfo: data
      };

      const response = await importWithRetry(sensorInfoList);

      logger.info('Data import completed successfully', {
        recordCount: data.length,
        response: response.data
      });

      return {
        success: true,
        recordCount: data.length
      };
    } catch (error) {
      logger.error('Error importing data to SmartDrainage', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  };

  return { import: importData };
};

export default createDataImporter;
