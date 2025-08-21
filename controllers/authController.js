const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, email, password, role, sector } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ error: 'Usuário ou email já existe' });
        }
        
        // Inclui 'sector' no novo usuário
        const user = new User({ username, email, password, role, sector });
        await user.save();
        
        res.status(201).json({ message: 'Usuário registrado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor', details: err.message });
    }
};

const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        // Inclui 'sector' no payload do JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username, sector: user.sector },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor', details: err.message });
    }
};

const listUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').lean(); // Exclui a senha
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar usuários', details: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar usuário', details: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json({ message: 'Usuário excluído com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir usuário', details: err.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    listUsers,
    updateUser,
    deleteUser
};
