const mongoose = require('mongoose');

const connectDB = (logger) => {
  const dbUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/mdm';

  mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    maxPoolSize: 50,
  }).then(() => {
    logger.info('Conectado ao MongoDB');
  }).catch((err) => {
    logger.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    process.exit(1);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Desconectado do MongoDB, tentando reconectar...');
  });
};

module.exports = connectDB;
