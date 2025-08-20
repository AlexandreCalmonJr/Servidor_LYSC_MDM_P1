const express = require('express');
const UnitMapping = require('../models/UnitMapping');
const { ipToInt, isValidIPv4 } = require('../utils/helpers');

const unitRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Criar mapeamento de unidade
  router.post('/', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { name, ip_range_start, ip_range_end } = req.body;
      if (!name || !ip_range_start || !ip_range_end) {
        return res.status(400).json({ error: 'name, ip_range_start e ip_range_end são obrigatórios' });
      }
      if (!isValidIPv4(ip_range_start) || !isValidIPv4(ip_range_end)) {
        return res.status(400).json({ error: 'ip_range_start e ip_range_end devem ser IPs válidos no formato xxx.xxx.xxx.xxx' });
      }
      const startInt = ipToInt(ip_range_start);
      const endInt = ipToInt(ip_range_end);
      if (startInt > endInt) {
        return res.status(400).json({ error: 'ip_range_start deve ser menor ou igual a ip_range_end' });
      }
      const unit = new UnitMapping({ name, ip_range_start, ip_range_end });
      await unit.save();
      logger.info(`Unidade criada: ${name}`);
      res.status(201).json(unit);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Unidade com este nome já existe' });
      }
      logger.error(`Erro ao criar unidade: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
  });

  // Listar unidades
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const units = await UnitMapping.find().lean();
      logger.info(`Lista de unidades retornada: ${units.length} unidades`);
      res.status(200).json(units);
    } catch (err) {
      logger.error(`Erro ao obter unidades: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Atualizar unidade
  router.put('/:name', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { name, ip_range_start, ip_range_end } = req.body;
      const unit = await UnitMapping.findOneAndUpdate(
        { name: req.params.name },
        { name, ip_range_start, ip_range_end },
        { new: true }
      );
      if (!unit) {
        return res.status(404).json({ error: 'Unidade não encontrada' });
      }
      logger.info(`Unidade atualizada: ${name}`);
      res.status(200).json(unit);
    } catch (err) {
      logger.error(`Erro ao atualizar unidade: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Excluir unidade
  router.delete('/:name', auth, modifyApiLimiter, async (req, res) => {
    try {
      const unit = await UnitMapping.findOneAndDelete({ name: req.params.name });
      if (!unit) {
        return res.status(404).json({ error: 'Unidade não encontrada' });
      }
      logger.info(`Unidade excluída: ${req.params.name}`);
      res.status(200).json({ message: `Unidade ${req.params.name} excluída com sucesso` });
    } catch (err) {
      logger.error(`Erro ao excluir unidade: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  return router;
};

module.exports = unitRoutes;