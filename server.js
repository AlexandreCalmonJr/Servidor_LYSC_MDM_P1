const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
require('dotenv').config();

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
