import { pool } from '../db.js';
import { createPersona, updatePersona } from './personas.controller.js';
import { createUser } from './usuarios.controller.js';

/* -------------------------------------------------------------------------- */
/*                          DAR DE ALTA A UN CLIENTE                          */
/* -------------------------------------------------------------------------- */
export const createCliente = async (req, res) => {
    console.log("Datos recibidos en createCliente:", req.body);
    try {
        const { personaData, usuarioData } = req.body;

        if (!personaData || !usuarioData) {
            return res.status(400).json({ message: 'Datos incompletos' });
        }

        const personaResponse = await createPersona(personaData);
        if (!personaResponse || !personaResponse.id) {
            return res.status(500).json({ message: 'Error al crear la persona' });
        }

        const usuarioRequestData = {
            persona: { persona_id: personaResponse.id },
            usuario: usuarioData,
            roles: []
        };

        const usuarioResponse = await createUser({ body: usuarioRequestData });
        if (!usuarioResponse || !usuarioResponse.id) {
            return res.status(500).json({ message: 'Error al crear el usuario' });
        }

        const estado_afiliacion_id = 1;
        const cliente_fecha_afiliacion = new Date();

        const [clienteResult] = await pool.query(
            "INSERT INTO `clientes` (`persona_id`, `estado_afiliacion_id`, `cliente_fecha_afiliacion`) VALUES (?, ?, ?)",
            [personaResponse.id, estado_afiliacion_id, cliente_fecha_afiliacion]
        );

        res.json({
            id: clienteResult.insertId,
            persona_id: personaResponse.id,
            estado_afiliacion_id,
            cliente_fecha_afiliacion
        });
    } catch (error) {
        console.error('Error en createCliente:', error);
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           ACTUALIZAR UN CLIENTE                            */
/* -------------------------------------------------------------------------- */
export const updateCliente = async (req, res) => {
    const { id } = req.params;
    const { personaData, cliente_fecha_afiliacion } = req.body;

    try {
        // Consulta SQL para obtener el ID de la persona asociado al cliente
        const [cliente] = await pool.query(
            `SELECT persona_id FROM clientes WHERE cliente_id = ?`, [id]
        );

        // Verificar si el cliente existe
        if (cliente.length === 0) {
            return res.status(404).json({ message: 'Cliente a actualizar no encontrado' });
        }

        const personaId = cliente[0].persona_id;

        // Actualizar la información de la persona
        await updatePersona({ params: { id: personaId }, body: personaData });

        // Actualizar la información del cliente
        const [result] = await pool.query(
            `UPDATE clientes 
            SET 
                cliente_fecha_afiliacion = ?
            WHERE cliente_id = ?`,
            [cliente_fecha_afiliacion, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                          OBTENER TODOS LOS CLIENTES                        */
/* -------------------------------------------------------------------------- */
export const getClientes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                c.cliente_id, 
                c.estado_afiliacion_id, 
                c.cliente_fecha_afiliacion, 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento, 
                p.persona_domicilio, 
                p.persona_telefono 
            FROM 
                clientes c 
            INNER JOIN 
                personas p 
            ON 
                c.persona_id = p.persona_id
            WHERE 
                c.estado_afiliacion_id = 1`
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                   OBTENER TODOS LOS CLIENTES INACTIVOS                     */
/* -------------------------------------------------------------------------- */
export const getClientesInactivos = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                c.cliente_id, 
                c.estado_afiliacion_id, 
                c.cliente_fecha_afiliacion, 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento, 
                p.persona_domicilio, 
                p.persona_telefono 
            FROM 
                clientes c 
            INNER JOIN 
                personas p 
            ON 
                c.persona_id = p.persona_id 
            WHERE 
                c.estado_afiliacion_id = 2`  // Solo inactivos
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           OBTENER CLIENTE POR ID                           */
/* -------------------------------------------------------------------------- */
export const getCliente = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT 
                c.cliente_id, 
                c.estado_afiliacion_id, 
                c.cliente_fecha_afiliacion, 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento, 
                p.persona_domicilio, 
                p.persona_telefono 
            FROM 
                clientes c 
            INNER JOIN 
                personas p 
            ON 
                c.persona_id = p.persona_id
            WHERE 
                c.cliente_id = ?`, [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                 CAMBIAR EL ESTADO DE UN CLIENTE A INACTIVO                 */
/* -------------------------------------------------------------------------- */
export const deactivateCliente = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("UPDATE clientes SET estado_afiliacion_id = 2 WHERE cliente_id = ?", [id]);

        res.json({ message: 'Cliente dado de baja exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                  CAMBIAR EL ESTADO DE UN CLIENTE A ACTIVO                  */
/* -------------------------------------------------------------------------- */
export const activateCliente = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("UPDATE clientes SET estado_afiliacion_id = 1 WHERE cliente_id = ?", [id]);

        res.json({ message: 'Cliente reactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*   DESACTIVAR AUTOMÁTICAMENTE CLIENTES SIN COMPRAS EN LOS ÚLTIMOS 45 DÍAS   */
/* -------------------------------------------------------------------------- */
export const deactivateClientesAutomatically = async () => {
    try {
        const [clientes] = await pool.query(
            `SELECT c.cliente_id 
            FROM clientes c
            LEFT JOIN ventas v ON c.cliente_id = v.cliente_id
            WHERE v.venta_fecha IS NULL OR v.venta_fecha < DATE_SUB(NOW(), INTERVAL 45 DAY)`
        );

        for (const cliente of clientes) {
            await pool.query("UPDATE clientes SET estado_afiliacion_id = 2 WHERE cliente_id = ?", [cliente.cliente_id]);
        }

        console.log('Clientes desactivados automáticamente');
    } catch (error) {
        console.error('Error desactivando clientes automáticamente:', error);
    }
};

// Función para validar si el correo ya está registrado como cliente
export const checkEmailExistsAsCliente = async (req, res) => {
    const { email } = req.params;

    try {
        // Verificar si el correo está registrado en la tabla de usuarios
        const [usuarios] = await pool.query(
            `SELECT u.usuario_id, u.persona_id, u.usuario_email 
             FROM usuarios u 
             WHERE u.usuario_email = ?`, [email]
        );

        if (usuarios.length === 0) {
            return res.json({ exists: false });
        }

        // Verificar si alguno de los usuarios con ese correo está registrado como cliente
        for (const usuario of usuarios) {
            const [clientes] = await pool.query(
                `SELECT c.cliente_id 
                 FROM clientes c 
                 WHERE c.persona_id = ?`, [usuario.persona_id]
            );

            if (clientes.length > 0) {
                return res.json({ exists: true, message: 'El correo ya está registrado como cliente' });
            }
        }

        res.json({ exists: false });
    } catch (error) {
        console.error('Error verificando el correo:', error);
        res.status(500).json({ message: error.message });
    }
};