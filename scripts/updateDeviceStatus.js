const mongoose = require('mongoose');
const path = require('path');
const Device = require('../models/Device');

const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// Alterado de DB_URI para MONGO_URI para ser consistente com seu .env
const dbURI = process.env.MONGO_URI; 

if (!dbURI) {
  console.error('Erro: A variável de ambiente MONGO_URI não foi definida. Verifique seu arquivo .env.');
  process.exit(1);
}

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conectado ao banco de dados, iniciando a verificação de status...');
    return updateDeviceStatus();
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  });

const updateDeviceStatus = async () => {
  try {
    const devices = await Device.find({});
    const now = new Date();
    let updatedCount = 0;

    for (const device of devices) {
      if (!device.last_sync) continue;

      const lastSync = new Date(device.last_sync);
      const diffTime = Math.abs(now - lastSync);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 5 && device.status !== 'Sem Monitorar') {
        device.status = 'Sem Monitorar';
        device.is_online = false;
        await device.save();
        updatedCount++;
        console.log(`Dispositivo "${device.device_name}" atualizado para "Sem Monitorar".`);
      }
    }

    console.log(`Verificação concluída. ${updatedCount} dispositivos foram atualizados.`);
  } catch (error) {
    console.error('Erro durante a atualização do status dos dispositivos:', error);
  } finally {
    mongoose.connection.close();
    console.log('Conexão com o banco de dados fechada.');
  }
};