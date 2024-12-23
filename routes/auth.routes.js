import { Router } from 'express';
import { requestPasswordReset, resetPassword } from '../controllers/auth.controller.js';

const router = Router();

// Ruta para solicitar la recuperación de contraseña
router.post('/request-password-reset', requestPasswordReset);

// Ruta para restablecer la contraseña
router.post('/reset-password/:token', resetPassword);

export default router;