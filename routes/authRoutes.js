const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser, listUsers, updateUser, deleteUser } = require('../controllers/authController');
const { modifyApiLimiter, getApiLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

const authRoutes = () => {
    const router = express.Router();

    // Rota pública para login
    router.post('/login', modifyApiLimiter, [
        body('username').notEmpty().withMessage('Username é obrigatório'),
        body('password').notEmpty().withMessage('Senha é obrigatória')
    ], loginUser);

    // Rotas protegidas (apenas admin)
    router.post('/register', auth, authorize('admin'), modifyApiLimiter, [
        body('username').notEmpty().withMessage('Username é obrigatório'),
        body('email').isEmail().withMessage('Email inválido'),
        body('password').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres')
    ], registerUser);

    router.get('/users', auth, authorize('admin'), getApiLimiter, listUsers);
    
    router.put('/users/:id', auth, authorize('admin'), modifyApiLimiter, [
        body('username').optional().notEmpty().withMessage('Username não pode ser vazio'),
        body('email').optional().isEmail().withMessage('Email inválido')
    ], updateUser);
    
    router.delete('/users/:id', auth, authorize('admin'), modifyApiLimiter, deleteUser);

    return router;
};

module.exports = authRoutes;