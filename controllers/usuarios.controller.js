import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import { updatePersona, createPersona } from './personas.controller.js';
import { createVendedor, deactivateVendedor, activateVendedor } from './vendedores.controller.js';
import { obtenerPersonaIdDesdeToken } from './login.controller.js';
import transporter from '../emailConfig.js';

export const createUser = async (req, res = null) => {
    try {
        const { persona, usuario, roles } = req.body || req;
        console.log('Datos recibidos en el servidor:', { persona, usuario, roles });

        let personaId = persona.persona_id;

        // Verificar si el usuario tiene rol y si es administrador o vendedor
        if (roles && roles.includes(2)) { // Solo crear vendedor si el rol es 2 (Vendedor)
            const vendedorResponse = await createVendedor({ body: { personaData: persona, usuarioData: usuario } });
            if (!vendedorResponse || !vendedorResponse.persona_id) {
                throw new Error('Error al crear el vendedor');
            }
            personaId = vendedorResponse.persona_id;
        } else {
            if (!personaId) {
                const personaResponse = await createPersona(persona);
                if (!personaResponse || !personaResponse.id) {
                    throw new Error('Error al crear la persona');
                }
                personaId = personaResponse.id;
            }
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(usuario.usuario_pass, saltRounds);

        const [usuarioResult] = await pool.query(
            "INSERT INTO `usuarios` (`persona_id`, `usuario_email`, `usuario_pass`, `estado_usuario_id`) VALUES (?, ?, ?, ?)",
            [personaId, usuario.usuario_email, hashedPassword, usuario.estado_usuario_id || 1]
        );

        const usuarioId = usuarioResult.insertId;

        if (roles && roles.length > 0) {
            for (const rolId of roles) {
                await pool.query(
                    "INSERT INTO `usuarios_roles` (`usuario_id`, `rol_id`) VALUES (?, ?)",
                    [usuarioId, rolId]
                );
            }
        }

        // Enviar correo electrónico al usuario
        const mailOptions = {
          from: 'cp15414621@gmail.com', 
          to: usuario.usuario_email,
          subject: 'Bienvenido a AXSFitt Suplements',
          text: `Hola ${persona.persona_nombre},\n\nBienvenido a AXSFitt Suplements. Tus credenciales de ingreso son:\n\nCorreo electrónico: ${usuario.usuario_email}\nContraseña: ${usuario.usuario_pass}\n\nSaludos,\nEl equipo de AXSFitt Suplements`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error al enviar el correo electrónico:', error);
          } else {
            console.log('Correo electrónico enviado:', info.response);
          }
        });

        const response = { id: usuarioId };

        if (res) {
            res.json(response);
        } else {
            return response;
        }
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        if (res) {
            res.status(500).json({ message: 'Error al crear el usuario', error: error.message });
        } else {
            throw error;
        }
    }
};

// Función para obtener todos los usuarios, excluyendo al usuario logueado
export const getAllUsers = async (req, res) => {
    try {

        const [rows] = await pool.query(
            `SELECT u.usuario_id, u.persona_id, p.persona_nombre, p.persona_apellido, p.persona_dni, u.usuario_email, u.estado_usuario_id, r.rol_tipo_rol
            FROM usuarios u
            JOIN personas p ON u.persona_id = p.persona_id
            JOIN usuarios_roles ur ON u.usuario_id = ur.usuario_id
            JOIN roles r ON ur.rol_id = r.rol_id
            WHERE u.estado_usuario_id = 1`
        );
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getInactiveUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.usuario_id, u.persona_id, p.persona_nombre, p.persona_apellido, p.persona_dni, u.usuario_email, u.estado_usuario_id, r.rol_tipo_rol
            FROM usuarios u
            JOIN personas p ON u.persona_id = p.persona_id
            JOIN usuarios_roles ur ON u.usuario_id = ur.usuario_id
            JOIN roles r ON ur.rol_id = r.rol_id
            WHERE u.estado_usuario_id = 2`
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para obtener un usuario por su id, incluyendo los datos de la persona asociada y sus roles
export const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT u.usuario_id, u.persona_id, p.persona_nombre, p.persona_apellido, p.persona_fecha_nacimiento, p.persona_telefono, p.persona_domicilio, p.persona_dni, u.usuario_email, u.estado_usuario_id, r.rol_tipo_rol
            FROM usuarios u
            JOIN personas p ON u.persona_id = p.persona_id
            JOIN usuarios_roles ur ON u.usuario_id = ur.usuario_id
            JOIN roles r ON ur.rol_id = r.rol_id
            WHERE u.usuario_id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Agrupar los roles en un solo objeto de usuario
        const user = rows.reduce((acc, row) => {
            if (!acc.usuario_id) {
                acc = {
                    usuario_id: row.usuario_id,
                    persona_id: row.persona_id,
                    persona_nombre: row.persona_nombre,
                    persona_apellido: row.persona_apellido,
                    persona_fecha_nacimiento: row.persona_fecha_nacimiento,
                    persona_telefono: row.persona_telefono,
                    persona_domicilio: row.persona_domicilio,
                    persona_dni: row.persona_dni,
                    usuario_email: row.usuario_email,
                    estado_usuario_id: row.estado_usuario_id,
                    roles: []
                };
            }
            acc.roles.push(row.rol_tipo_rol);
            return acc;
        }, {});

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para actualizar un usuario
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { persona, usuario, roles } = req.body;

    try {
        // Consulta SQL para obtener el ID de la persona asociado al usuario
        const [user] = await pool.query(
            `SELECT persona_id FROM usuarios WHERE usuario_id = ?`, [id]
        );

        // Verificar si el usuario existe
        if (user.length === 0) {
            return res.status(404).json({ message: 'Usuario a actualizar no encontrado' });
        }

        const personaId = user[0].persona_id;

        // Actualizar la información de la persona
        req.params.id = personaId;
        req.body = persona;
        await updatePersona(req);

        // Actualizar la información del usuario
        const { usuario_email, estado_usuario_id } = usuario;

        const updateUserQuery = `
            UPDATE usuarios 
            SET 
                usuario_email = ?, 
                estado_usuario_id = ?
            WHERE usuario_id = ?
        `;

        const updateUserParams = [
            usuario_email,
            estado_usuario_id || 1, // Asegúrate de enviar un estado válido
            id
        ];

        await pool.query(updateUserQuery, updateUserParams);

        // Obtener los roles actuales del usuario
        const [currentRoles] = await pool.query(
            "SELECT rol_id FROM usuarios_roles WHERE usuario_id = ?", [id]
        );

        const currentRoleIds = currentRoles.map(role => role.rol_id);

        // Manejar el rol de vendedor
        const isVendedor = roles.includes(2);
        const wasVendedor = currentRoleIds.includes(2);

        if (isVendedor && !wasVendedor) {
            // Si el usuario ahora es vendedor pero no lo era antes, verificar si ya existe como vendedor
            const [vendedor] = await pool.query(
                "SELECT vendedor_id, estado_vendedor_id FROM vendedores WHERE persona_id = ?", [personaId]
            );

            if (vendedor.length > 0) {
                // Si el vendedor ya existe, activar el vendedor si está inactivo
                if (vendedor[0].estado_vendedor_id === 2) {
                    await activateVendedor({ params: { id: vendedor[0].vendedor_id } });
                }
            } else {
                // Si el vendedor no existe, crear la instancia en vendedores
                const vendedorResponse = await createVendedor({ body: { personaData: persona, usuarioData: usuario } });
                if (!vendedorResponse || !vendedorResponse.id) {
                    throw new Error('Error al crear el vendedor');
                }
            }
        } else if (!isVendedor && wasVendedor) {
            // Si el usuario ya no es vendedor pero lo era antes, obtener el ID del vendedor y actualizar el estado del vendedor a inactivo
            const [vendedor] = await pool.query(
                "SELECT vendedor_id FROM vendedores WHERE persona_id = ?", [personaId]
            );
            if (vendedor.length > 0) {
                await deactivateVendedor({ params: { id: vendedor[0].vendedor_id } });
            }
        } else if (isVendedor && wasVendedor) {
            // Si el usuario sigue siendo vendedor, obtener el ID del vendedor y activar el vendedor si está inactivo
            const [vendedor] = await pool.query(
                "SELECT vendedor_id FROM vendedores WHERE persona_id = ?", [personaId]
            );
            if (vendedor.length > 0 && vendedor[0].estado_vendedor_id === 2) {
                await activateVendedor({ params: { id: vendedor[0].vendedor_id } });
            }
        }

        // Actualizar los roles del usuario
        await pool.query("DELETE FROM usuarios_roles WHERE usuario_id = ?", [id]);
        for (const rolId of roles) {
            await pool.query(
                "INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)",
                [id, rolId]
            );
        }

        res.status(200).json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ message: 'Error al actualizar el usuario', error: error.message });
    }
};

// Función para cambiar el estado de un usuario a inactivo
export const deactivateUser = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("UPDATE usuarios SET estado_usuario_id = 2 WHERE usuario_id = ?", [id]);

        res.json({ message: 'Usuario dado de baja exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para cambiar el estado de un usuario a activo
export const activateUser = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("UPDATE usuarios SET estado_usuario_id = 1 WHERE usuario_id = ?", [id]);

        res.json({ message: 'Usuario dado de alta exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                    OBTENER EL PERFIL DEL USUARIO                           */
/* -------------------------------------------------------------------------- */
export const getUserProfile = async (req, res) => {
    try {
        const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT

        const [rows] = await pool.query(
            `SELECT 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento, 
                p.persona_domicilio, 
                p.persona_telefono, 
                u.usuario_email 
            FROM 
                personas p 
            INNER JOIN 
                usuarios u 
            ON 
                p.persona_id = u.persona_id 
            WHERE 
                p.persona_id = ?`, [personaId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                    ACTUALIZAR EL PERFIL DEL USUARIO                        */
/* -------------------------------------------------------------------------- */
export const updateUserProfile = async (req, res) => {
    try {
        const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT
        const { persona_nombre, persona_apellido, persona_dni, persona_fecha_nacimiento, persona_domicilio, persona_telefono, usuario_email } = req.body;

        // Obtener los datos actuales del usuario
        const [currentData] = await pool.query(
            `SELECT 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento, 
                p.persona_domicilio, 
                p.persona_telefono, 
                u.usuario_email 
            FROM 
                personas p 
            INNER JOIN 
                usuarios u 
            ON 
                p.persona_id = u.persona_id 
            WHERE 
                p.persona_id = ?`, [personaId]
        );

        if (currentData.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const updatedData = {
            persona_nombre: persona_nombre || currentData[0].persona_nombre,
            persona_apellido: persona_apellido || currentData[0].persona_apellido,
            persona_dni: persona_dni || currentData[0].persona_dni,
            persona_fecha_nacimiento: persona_fecha_nacimiento || currentData[0].persona_fecha_nacimiento,
            persona_domicilio: persona_domicilio || currentData[0].persona_domicilio,
            persona_telefono: persona_telefono || currentData[0].persona_telefono,
            usuario_email: usuario_email || currentData[0].usuario_email,
        };

        await pool.query(
            `UPDATE personas 
            SET persona_nombre = ?, persona_apellido = ?, persona_dni = ?, persona_fecha_nacimiento = ?, persona_domicilio = ?, persona_telefono = ? 
            WHERE persona_id = ?`,
            [updatedData.persona_nombre, updatedData.persona_apellido, updatedData.persona_dni, updatedData.persona_fecha_nacimiento, updatedData.persona_domicilio, updatedData.persona_telefono, personaId]
        );

        await pool.query(
            `UPDATE usuarios 
            SET usuario_email = ? 
            WHERE persona_id = ?`,
            [updatedData.usuario_email, personaId]
        );

        res.json({ message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                    ACTUALIZAR LA CONTRASEÑA DEL USUARIO                    */
/* -------------------------------------------------------------------------- */
export const updateUserPassword = async (req, res) => {
    try {
        const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT
        const { currentPassword, newPassword } = req.body;

        const [rows] = await pool.query(
            `SELECT usuario_pass 
            FROM usuarios 
            WHERE persona_id = ?`, [personaId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const validPassword = await bcrypt.compare(currentPassword, rows[0].usuario_pass);
        if (!validPassword) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.query(
            `UPDATE usuarios 
            SET usuario_pass = ? 
            WHERE persona_id = ?`,
            [hashedPassword, personaId]
        );

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const checkEmailExists = async (req, res) => {
    const { email } = req.params;
    console.log('Verificando correo electrónico:', email); 
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE usuario_email = ?', [email]);
        console.log('Resultado de la consulta:', rows); 
        if (rows.length > 0) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }
        res.json({ message: 'El correo electrónico está disponible' });
    } catch (error) {
        console.error('Error en checkEmailExists:', error); 
        res.status(500).json({ message: error.message });
    }
};