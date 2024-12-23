import { Router } from 'express';
import { getVendedores, getVendedor, createVendedor, updateVendedor, deactivateVendedor, activateVendedor, getVendedoresInactivos, getEstadoVendedor, liquidarComisiones } from '../controllers/vendedores.controller.js';
const router = Router();

/* Obtener el estado de un vendedor por su ID */
router.get('/vendedores/estado', getEstadoVendedor);

/* Solicitar todos los vendedores */
router.get('/vendedores', getVendedores);

/* Obtener vendedores inactivos */
router.get('/vendedores/inactivos', getVendedoresInactivos);

/* Obtener un vendedor por su ID */
router.get('/vendedores/:id', getVendedor);

/* Crear un vendedor */
router.post('/vendedores', createVendedor);

/* Modificar un vendedor (actualizar información) */
router.put('/vendedores/:id', updateVendedor);

/* Dar de baja un vendedor (cambiar a inactivo) */
router.put('/vendedores/:id/baja', deactivateVendedor);

/* Reactivar un vendedor (cambiar a activo) */
router.put('/vendedores/:id/activar', activateVendedor);

/* Liquidar comisiones de un vendedor */
router.put('/vendedores/:id/liquidar', liquidarComisiones);

export default router;