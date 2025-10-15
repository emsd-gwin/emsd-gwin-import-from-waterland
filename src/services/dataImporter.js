import axios from 'axios';
import logger from '../utils/logger.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createDataImporter = (ingressUrl, username, password) => {
  const retryAttempts = 3;
  const timeout = 30000;

  const importWithRetry = async (data, attempt = 1) => {
    try {
      const response = await axios.post(ingressUrl, data, {
        auth: {
          username,
          password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout
      });

      return response;
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

      const response = await importWithRetry(data);

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
