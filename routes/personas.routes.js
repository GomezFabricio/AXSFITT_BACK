import { Router } from 'express';
import { checkDniExists } from '../controllers/personas.controller.js';

const router = Router();

// Ruta para verificar si un DNI ya existe
router.get('/personas/check-dni/:dni', checkDniExists);

export default router;