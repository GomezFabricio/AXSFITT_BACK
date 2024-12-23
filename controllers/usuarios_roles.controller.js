import { pool } from '../db.js';

/* -------------------------------------------------------------------------- */
/*          ASIGNAR UN ROL AUTOMATICAMENTE AL DAR DE ALTA UN USUARIO          */
/* -------------------------------------------------------------------------- */
export const asignarRolUsuario = async (usuarioId, rolNombre) => {
    // Obtener el ID del rol utilizando el nombre del rol
    const [rolResult] = await pool.query(
        "SELECT rol_id FROM roles WHERE rol_tipo_rol = ?",
        [rolNombre]
    );

    if (rolResult.length > 0) {
        const rolId = rolResult[0].rol_id;

        // Insertar la asignación del rol al usuario
        await pool.query(
            "INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)",
            [usuarioId, rolId]
        );
    } else {
        throw new Error('Rol no encontrado.');
    }
};

/* -------------------------------------------------------------------------- */
/*          OBTENER TODOS LOS ROLES DE LA BASE DE DATOS                       */
/* -------------------------------------------------------------------------- */
export const getAllRoles = async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT * FROM roles');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*          OBTENER ROLES POR ID DE USUARIO                                   */
/* -------------------------------------------------------------------------- */
export const getRolesByUserId = async (req, res) => {
    const { userId } = req.params;

    try {
        const [roles] = await pool.query(
            `SELECT r.rol_id, r.rol_tipo_rol
            FROM usuarios_roles ur
            JOIN roles r ON ur.rol_id = r.rol_id
            WHERE ur.usuario_id = ?`,
            [userId]
        );

        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};