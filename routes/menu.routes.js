import { Router } from 'express';
import { getMenuByRole } from '../controllers/menu.controller.js';

const router = Router();

router.post('/menu', getMenuByRole); // Ruta para obtener el menú basado en el rol del usuario

export default router;