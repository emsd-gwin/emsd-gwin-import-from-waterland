import { HttpsProxyAgent } from 'https-proxy-agent';
import logger from '../utils/logger.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createDataImporter = (ingressUrl, username, password, options = {}) => {
  const retryAttempts = options.retryAttempts || 3;
  const timeout = options.timeout || 30000;
  const proxyUrl = options.proxy;

  // Create proxy agent if proxy URL is provided
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  if (proxyUrl) {
    logger.info('Using proxy for requests', { proxy: proxyUrl });
  }

  const importWithRetry = async (data, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(data),
        signal: controller.signal
      };

      if (agent) {
        fetchOptions.agent = agent;
      }

      const response = await fetch(ingressUrl, fetchOptions);

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
