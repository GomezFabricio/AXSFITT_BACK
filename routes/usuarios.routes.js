import { Router } from "express";
import { createUser, getAllUsers, getInactiveUsers, getUserById, deactivateUser, updateUser, activateUser, getUserProfile, updateUserProfile, updateUserPassword, checkEmailExists } from "../controllers/usuarios.controller.js";

const router = Router();

// Obtener el perfil del usuario
router.get("/usuarios/perfil", getUserProfile);

// Actualizar el perfil del usuario
router.put("/usuarios/perfil", updateUserProfile);

// Actualizar la contraseña del usuario
router.put("/usuarios/perfil/password", updateUserPassword);

// Obtener todos los usuarios
router.get("/usuarios", getAllUsers);

// Obtener todos los usuarios inactivos
router.get("/usuarios/inactivos", getInactiveUsers);

// Obtener un usuario por su ID
router.get("/usuarios/:id", getUserById);

// Crear un usuario
router.post("/usuarios", createUser);

// Modificar un usuario (actualizar información)
router.put("/usuarios/:id", updateUser);

// Dar de baja un usuario (cambiar a inactivo)
router.put("/usuarios/:id/baja", deactivateUser);

// Reactivar un usuario (cambiar a activo)
router.put("/usuarios/:id/activar", activateUser);

// Verificar si un correo electrónico ya existe
router.get("/usuarios/check-email/:email", checkEmailExists);

export default router;