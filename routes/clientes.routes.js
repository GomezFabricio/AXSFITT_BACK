import { Router } from "express";
import { 
    createCliente, 
    getClientes, 
    getClientesInactivos, 
    getCliente, 
    updateCliente, 
    deactivateCliente, 
    activateCliente, 
    deactivateClientesAutomatically,
    checkEmailExistsAsCliente
} from "../controllers/clientes.controller.js";

const router = Router();

// Obtener todos los clientes activos
router.get("/clientes", getClientes);

// Obtener todos los clientes inactivos
router.get("/clientes/inactivos", getClientesInactivos);

// Obtener un cliente por su ID
router.get("/clientes/:id", getCliente);

// Crear un cliente
router.post("/clientes", createCliente);

// Modificar un cliente (actualizar información)
router.put("/clientes/:id", updateCliente);

// Dar de baja un cliente (cambiar a inactivo)
router.put("/clientes/:id/baja", deactivateCliente);

// Reactivar un cliente (cambiar a activo)
router.put("/clientes/:id/activar", activateCliente);

// Desactivar automáticamente clientes sin compras en los últimos 45 días
router.put("/clientes/desactivar-automaticamente", deactivateClientesAutomatically);

// Validar si el correo ya está registrado como cliente
router.get('/clientes/check-email/:email', checkEmailExistsAsCliente);

export default router;