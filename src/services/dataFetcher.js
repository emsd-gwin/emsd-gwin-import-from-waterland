import { HttpsProxyAgent } from 'https-proxy-agent';
import logger from '../utils/logger.js';

const createDataFetcher = (baseUrl, apiAccessToken, options = {}) => {
  const timeout = options.timeout || 30000;
  const proxyUrl = options.proxy;

  // Create proxy agent if proxy URL is provided
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  if (proxyUrl) {
    logger.info('Using proxy for requests', { proxy: proxyUrl });
  }

  const getTokenData = async () => {
    try {
      const url = `${baseUrl}/api/${apiAccessToken}`;
      logger.debug('Fetching token data', { url });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        signal: controller.signal
      };

      if (agent) {
        fetchOptions.agent = agent;
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error fetching token data', {
        error: error.message,
        status: error.status
      });
      throw error;
    }
  };

  const getSensorData = async (siteName, siteInfo) => {
    try {
      const url = `${baseUrl}/api/${apiAccessToken}/${siteName}/data/latest`;
      logger.debug('Fetching sensor data', { siteName, url });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        signal: controller.signal
      };

      if (agent) {
        fetchOptions.agent = agent;
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        sensorData: data,
        siteInfo
      };
    } catch (error) {
      logger.error('Error fetching sensor data for site', {
        siteName,
        error: error.message,
        status: error.status
      });
      return null;
    }
  };

  const fetchData = async () => {
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

  return { fetch: fetchData };
};

export default createDataFetcher;
