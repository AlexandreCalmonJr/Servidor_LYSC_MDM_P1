const BssidMapping = require('../models/BssidMapping');
const UnitMapping = require('../models/UnitMapping');
const { ipToInt } = require('./helpers');

// Função para mapear BSSID para setor e andar
async function mapMacAddressRadioToLocation(mac_address_radio) {
  if (!mac_address_radio || mac_address_radio === 'N/A') {
    // Use a logger passed from the caller if needed
    return { sector: 'Desconhecido', floor: 'Desconhecido' };
  }
  const mapping = await BssidMapping.findOne({ mac_address_radio: mac_address_radio });
  if (!mapping) {
    return { sector: 'Desconhecido', floor: 'Desconhecido' };
  }
  return { sector: mapping.sector, floor: mapping.floor };
}

async function mapIpToUnit(ip_address) {
  if (!ip_address || ip_address === 'N/A') {
    return 'Desconhecido';
  }
  const units = await UnitMapping.find();
  for (const unit of units) {
    const startInt = ipToInt(unit.ip_range_start);
    const endInt = ipToInt(unit.ip_range_end);
    const ipInt = ipToInt(ip_address);
    if (ipInt >= startInt && ipInt <= endInt) {
      return unit.name;
    }
  }
  return 'Desconhecido';
}

module.exports = {
  mapMacAddressRadioToLocation,
  mapIpToUnit
};