import axios from 'axios';
import logger from '../utils/logger.js';

const createDataFetcher = (baseUrl, apiAccessToken) => {
  const timeout = 30000;

  const getTokenData = async () => {
    try {
      const url = `${baseUrl}/api/${apiAccessToken}`;
      logger.debug('Fetching token data', { url });

      const response = await axios.get(url, { timeout });
      return response.data;
    } catch (error) {
      logger.error('Error fetching token data', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  };

  const getSensorData = async (siteName, siteInfo) => {
    try {
      const url = `${baseUrl}/api/${apiAccessToken}/${siteName}/data/latest`;
      logger.debug('Fetching sensor data', { siteName, url });

      const response = await axios.get(url, { timeout });

      return {
        ...response.data,
        siteInfo
      };
    } catch (error) {
      logger.error('Error fetching sensor data for site', {
        siteName,
        error: error.message,
        status: error.response?.status
      });
      return null;
    }
  };

  const fetch = async () => {
    try {
      logger.info('Fetching data from WaterLand API', { baseUrl });

      const tokenData = await getTokenData();

      if (!tokenData || !tokenData.sites || tokenData.sites.length === 0) {
        logger.warn('No sites found in token response');
        return [];
      }

      logger.info('Sites retrieved from WaterLand API', { siteCount: tokenData.sites.length });

      const sensorDataPromises = tokenData.sites.map(site =>
        getSensorData(site.site_name, site)
      );

      const sensorDataResults = await Promise.allSettled(sensorDataPromises);

      const successfulData = sensorDataResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

      const failedResults = sensorDataResults.filter(result => result.status === 'rejected');
      if (failedResults.length > 0) {
        logger.warn('Some sensor data requests failed', { failedCount: failedResults.length });
      }

      logger.info('Data fetched successfully', { recordCount: successfulData.length });
      return successfulData;
    } catch (error) {
      logger.error('Error fetching data from WaterLand API', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  };

  return { fetch };
};

export default createDataFetcher;
