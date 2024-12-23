import { Router } from 'express';
import { getAllRoles, getRolesByUserId } from '../controllers/usuarios_roles.controller.js';

const router = Router();

// Ruta para obtener todos los roles
router.get('/roles', getAllRoles);

// Ruta para obtener los roles de un usuario por ID
router.get('/roles/:userId', getRolesByUserId);

export default router;