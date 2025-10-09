const mongoose = require('mongoose');
const winston = require('winston');
const Device = require('../models/Device');
const connectDB = require('../config/db');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/updateStatus.log' })
  ],
});

// Thresholds
const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutos
const UNMONITORED_THRESHOLD = 5 * 24 * 60 * 60 * 1000; // 5 dias

async function updateDeviceStatus(logger, userRole = 'admin', userSector = 'Global') {
  try {
    await connectDB(logger);
    logger.info('Iniciando atualização de status dos dispositivos...');

    const devices = await Device.find({}).lean();
    let updatedCount = 0;
    let offlineCount = 0;
    let unmonitoredCount = 0;

    for (const device of devices) {
      const lastSeenDate = new Date(device.last_seen);
      const now = new Date();
      const timeDiff = now - lastSeenDate;

      let newStatus = 'online';
      if (timeDiff > OFFLINE_THRESHOLD) {
        newStatus = 'offline';
        offlineCount++;
        if (timeDiff > UNMONITORED_THRESHOLD) {
          newStatus = 'sem monitorar';
          unmonitoredCount++;
        }
      }

      // Filtrar por setor se user (não admin)
      if (userRole === 'user' && userSector !== 'Global') {
        const prefixes = userSector.split(',').map(p => p.trim().toLowerCase());
        const deviceName = (device.device_name || '').toLowerCase();
        if (!prefixes.some(prefix => deviceName.startsWith(prefix))) {
          continue;
        }
      }

      // Atualiza se o status mudou
      if (device.status !== newStatus) {
        await Device.findByIdAndUpdate(device._id, { status: newStatus });
        logger.info(`Status atualizado para ${device.serial_number}: ${device.status || 'undefined'} -> ${newStatus}`);
        updatedCount++;
      }
    }

    logger.info(`Atualização concluída: ${updatedCount} status alterados, ${offlineCount} offline, ${unmonitoredCount} sem monitorar.`);
  } catch (err) {
    logger.error(`Erro ao atualizar status: ${err.message}`);
  }
}

module.exports = updateDeviceStatus;

if (require.main === module) {
  connectDB(logger).then(() => updateDeviceStatus(logger)).catch(err => logger.error(err));
}