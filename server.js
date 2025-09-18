const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
require('dotenv').config();
const cron = require('node-cron');
const Device = require('./models/Device');

const expressConfig = require('./config/express');
const connectDB = require('./config/db');
const { getLocalIPAddress } = require('./utils/helpers');

// Configurar logger com winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/server.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.Console()
  ],
});

const app = express();
const port = process.env.PORT || 3000;
const ip = '0.0.0.0';

// Conectar ao banco de dados
connectDB(logger);

// Configurar o Express
expressConfig(app, logger);

// Iniciar servidor
app.listen(port, ip, () => {
  logger.info(`🚀 MDM Server rodando em http://${getLocalIPAddress()}:${port}`);
  logger.info(`📱 Provisionamento disponível em: http://${getLocalIPAddress()}:${port}/provision/{token}`);
  logger.info(`📊 Dashboard disponível em: http://${getLocalIPAddress()}:${port}/dashboard`);
});

cron.schedule('0 0 * * *', async () => {
  console.log('Executando verificação de status de dispositivos...');
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const result = await Device.updateMany(
      {
        last_sync: { $lt: fiveDaysAgo },
        status: { $ne: 'Sem Monitorar' }
      },
      {
        $set: {
          status: 'Sem Monitorar',
          is_online: false
        }
      }
    );

    if (result.nModified > 0) {
      console.log(`${result.nModified} dispositivos atualizados para "Sem Monitorar".`);
    } else {
      console.log('Nenhum dispositivo precisou ser atualizado.');
    }
  } catch (error) {
    console.error('Erro ao executar a verificação de status de dispositivos:', error);
  }
});