import { pool } from '../db.js';
import jwt from 'jsonwebtoken';
import { SECRET_KEY } from '../config.js';
import bcrypt from 'bcrypt';

/* -------------------------------------------------------------------------- */
/*                          LOGIN DEL USUARIO                                 */
/* -------------------------------------------------------------------------- */
export const login = async (req, res) => {
    const { email, password } = req.body; // Obtener email y contraseña del cuerpo de la solicitud

    try {
        // Verificar si el usuario existe con el email y que esté activo (estado_usuario_id = 1)
        const [usuario] = await pool.query(
            `SELECT u.usuario_id, u.persona_id, p.persona_nombre, p.persona_apellido, p.persona_dni, u.usuario_email, u.usuario_pass, u.estado_usuario_id
            FROM usuarios u
            JOIN personas p ON u.persona_id = p.persona_id
            WHERE u.usuario_email = ? 
              AND u.estado_usuario_id = 1`, 
            [email]
        );

        if (usuario.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo' });
        }

        const user = usuario[0];

        // Comparar la contraseña proporcionada con la contraseña cifrada almacenada
        const isMatch = await bcrypt.compare(password, user.usuario_pass);

        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        const userId = user.usuario_id;

        // Obtener los roles asociados al usuario
        const [roles] = await pool.query(
            `SELECT r.rol_tipo_rol, r.rol_id
            FROM usuarios_roles ur
            JOIN roles r ON ur.rol_id = r.rol_id
            WHERE ur.usuario_id = ?`,
            [userId]
        );

        if (roles.length === 0) {
            return res.status(403).json({ message: 'No tiene roles asignados' });
        }

        // Generar un token JWT con el userId, nombre, apellido y personaId
        const token = jwt.sign({
            userId: user.usuario_id,
            firstName: user.persona_nombre,
            lastName: user.persona_apellido,
            personaId: user.persona_id
        }, SECRET_KEY, { expiresIn: '2h' });

        // Devolver solo el token y los roles
        res.json({
            message: 'Login exitoso',
            token,
            roles: roles.map(role => ({
                rolId: role.rol_id,
                rolNombre: role.rol_tipo_rol
            }))
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Función para obtener el personaId del token JWT
export const obtenerPersonaIdDesdeToken = (req) => {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    return decodedToken.personaId;
};