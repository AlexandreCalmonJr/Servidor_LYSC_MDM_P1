const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

const { modifyApiLimiter, getApiLimiter, enrollLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const requestLogger = require('../middleware/logging');
const errorHandler = require('../middleware/error'); // CORRECTED: Removed the extra ' = require'

// Import the route modules
const deviceRoutes = require('../routes/deviceRoutes');
const provisioningRoutes = require('../routes/provisioningRoutes');
const configProfileRoutes = require('../routes/configProfileRoutes');
const bssidRoutes = require('../routes/bssidRoutes');
const unitRoutes = require('../routes/unitRoutes');
const serverRoutes = require('../routes/serverRoutes');
const authRoutes = require('../routes/authRoutes');
const publicRoutes = require('../routes/publicRoutes');

const expressConfig = (app, logger) => {
  // Middleware de compressão
  app.use(compression());

  // Middleware CORS
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  }));

  // Middleware para parsing de JSON
  app.use(express.json());

  // Configurar EJS e arquivos estáticos
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(publicRoutes(logger, getApiLimiter));

  // MUITO IMPORTANTE: SIRVA ARQUIVOS ESTÁTICOS PRIMEIRO
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));

  // Middleware de log de requisições (após o static, para não logar arquivos estáticos)
  app.use(requestLogger(logger));

  // As rotas de autenticação NÃO USAM o middleware de auth
  app.use('/api/auth', authRoutes());

  // Rotas da API (estas devem vir depois dos arquivos estáticos)
  app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
  app.use('/api/devices', deviceRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
  app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));
  
  // Rotas de visualização (se você tiver páginas EJS renderizadas pelo servidor)
  app.get('/dashboard', auth, authorize('admin'), require('../routes/serverRoutes').renderDashboard(logger));
  app.get('/provision/:token', require('../routes/provisioningRoutes').renderProvisioningPage(logger));
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Middleware global de tratamento de erros (sempre por último)
  app.use(errorHandler(logger)); // CORRECTED: Call errorHandler with logger
};

module.exports = expressConfig;
