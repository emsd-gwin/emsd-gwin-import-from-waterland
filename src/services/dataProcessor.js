import logger from '../utils/logger.js';

const stringToFloat = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const validate = (record) => {
  if (!record.device_name) {
    logger.debug('Missing device_name');
    return false;
  }

  if (!record.timestamp) {
    logger.debug('Missing timestamp');
    return false;
  }

  if (!record.project_site_id) {
    logger.debug('Missing project_site_id');
    return false;
  }

  return true;
};

const transform = (record) => {
  const stationID = record.device_name || record.project_site_id;
  const siteName = record.siteInfo?.site_name || stationID;

  const waterLevel = record.water_depth !== null && record.water_depth !== undefined
    ? stringToFloat(record.water_depth)
    : stringToFloat(record.water_level);

  const transformed = {
    stationID,
    deviceName: stationID,
    devEUI: stationID,
    tags: {
      StationID: stationID,
      Latitude: record.siteInfo?.position_latitude && record.siteInfo.position_latitude.length > 0
        ? stringToFloat(record.siteInfo.position_latitude)
        : 0,
      Longitude: record.siteInfo?.position_longitude && record.siteInfo.position_longitude.length > 0
        ? stringToFloat(record.siteInfo.position_longitude)
        : 0,
      Location: siteName,
      isCameraOnly: false
    },
    objectJSON: JSON.stringify({
      waterLevel,
      batteryVoltage: stringToFloat(record.voltage),
      version: 2,
      rainGaugeDrop: stringToFloat(record.hko_rain_data),
      flowmeterLevel: 0,
      flowmeterFlow: 0,
      flowmeterVelocity: 0,
      pressure: 0,
      tide: 0,
      ac: record.voltage ? Math.floor(stringToFloat(record.voltage) / 100) : 0,
      rssi: stringToFloat(record.signal_value),
      ultrasonic: waterLevel,
      moisture: 0,
      timestamp: record.timestamp,
      deviceType: record.device_type,
      projectSiteId: record.project_site_id
    })
  };

  logger.debug('Record transformed to SmartDrainage format', {
    stationID: transformed.stationID,
    location: transformed.tags.Location,
    waterLevel
  });

  return transformed;
};

const processRecord = (record) => {
  try {
    if (!validate(record)) {
      logger.warn('Record validation failed', {
        deviceName: record.device_name,
        projectSiteId: record.project_site_id
      });
      return null;
    }

    return transform(record);
  } catch (error) {
    logger.error('Error processing individual record', {
      error: error.message,
      deviceName: record.device_name
    });
    return null;
  }
};

const process = async (data) => {
  try {
    logger.info('Processing data with validation and transformation', { recordCount: data.length });

    const processedData = data.map(record => processRecord(record));
    const validData = processedData.filter(record => record !== null);

    logger.info('Data processed successfully', {
      total: data.length,
      valid: validData.length,
      invalid: data.length - validData.length
    });

    return validData;
  } catch (error) {
    logger.error('Error processing data', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export default process;
