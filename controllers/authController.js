const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Dados inválidos',
            errors: errors.array() 
        });
    }

    try {
        const { username, email, password, role, sector } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ 
                success: false,
                message: 'Usuário ou email já existe' 
            });
        }
        
        // Inclui 'sector' no novo usuário
        const user = new User({ username, email, password, role, sector });
        await user.save();
        
        req.logger.info(`Novo usuário registrado: ${username} (${role}) - Setor: ${sector}`);
        
        res.status(201).json({ 
            success: true,
            message: 'Usuário registrado com sucesso',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                sector: user.sector,
                created_at: user.created_at
            }
        });
    } catch (err) {
        req.logger.error(`Erro ao registrar usuário: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro no servidor', 
            details: err.message 
        });
    }
};

const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Dados inválidos',
            errors: errors.array() 
        });
    }

    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await user.comparePassword(password))) {
            req.logger.warn(`Tentativa de login inválida para usuário: ${username} - IP: ${req.ip}`);
            return res.status(401).json({ 
                success: false,
                message: 'Credenciais inválidas' 
            });
        }
        
        // Inclui 'sector' no payload do JWT
        const tokenPayload = {
            id: user._id,
            role: user.role,
            username: user.username,
            sector: user.sector
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        req.logger.info(`Login bem-sucedido: ${username} (${user.role}) - Setor: ${user.sector} - IP: ${req.ip}`);
        
        res.status(200).json({ 
            success: true,
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                sector: user.sector
            }
        });
    } catch (err) {
        req.logger.error(`Erro no login: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro no servidor', 
            details: err.message 
        });
    }
};

const listUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').lean(); // Exclui a senha
        
        req.logger.info(`Lista de usuários solicitada por: ${req.user.username}`);
        
        res.status(200).json({
            success: true,
            message: 'Usuários listados com sucesso',
            users,
            total: users.length
        });
    } catch (err) {
        req.logger.error(`Erro ao listar usuários: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao listar usuários', 
            details: err.message 
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove campos que não devem ser atualizados diretamente
        delete updates.password; // Senha deve ser atualizada em endpoint específico
        delete updates._id;
        delete updates.created_at;

        const user = await User.findByIdAndUpdate(id, updates, { 
            new: true, 
            runValidators: true 
        }).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuário não encontrado' 
            });
        }
        
        req.logger.info(`Usuário atualizado: ${user.username} por ${req.user.username}`);
        
        res.status(200).json({
            success: true,
            message: 'Usuário atualizado com sucesso',
            user
        });
    } catch (err) {
        req.logger.error(`Erro ao atualizar usuário: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao atualizar usuário', 
            details: err.message 
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Impedir que o usuário delete a si mesmo
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Você não pode deletar sua própria conta'
            });
        }
        
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuário não encontrado' 
            });
        }
        
        req.logger.info(`Usuário deletado: ${user.username} por ${req.user.username}`);
        
        res.status(200).json({ 
            success: true,
            message: 'Usuário excluído com sucesso' 
        });
    } catch (err) {
        req.logger.error(`Erro ao excluir usuário: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao excluir usuário', 
            details: err.message 
        });
    }
};

// Novo endpoint para verificar token
const verifyToken = async (req, res) => {
    try {
        // Se chegou até aqui, o token é válido (middleware auth já validou)
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Token válido',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                sector: user.sector
            }
        });
    } catch (err) {
        req.logger.error(`Erro ao verificar token: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Erro no servidor',
            details: err.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    listUsers,
    updateUser,
    deleteUser,
    verifyToken
};

// Endpoint para alterar senha
const changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Dados inválidos',
            errors: errors.array() 
        });
    }

    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Buscar o usuário
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar senha atual
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            req.logger.warn(`Tentativa de alteração de senha com senha atual incorreta: ${user.username} - IP: ${req.ip}`);
            return res.status(401).json({
                success: false,
                message: 'Senha atual incorreta'
            });
        }

        // Atualizar senha
        user.password = newPassword;
        await user.save();

        req.logger.info(`Senha alterada com sucesso: ${user.username} - IP: ${req.ip}`);

        res.status(200).json({
            success: true,
            message: 'Senha alterada com sucesso'
        });
    } catch (err) {
        req.logger.error(`Erro ao alterar senha: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Erro no servidor',
            details: err.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    listUsers,
    updateUser,
    deleteUser,
    verifyToken,
    changePassword
};

