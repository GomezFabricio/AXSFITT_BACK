// controllers/vendedores.controller.js
import { pool } from '../db.js';
import { createPersona, updatePersona } from './personas.controller.js';
import { obtenerPersonaIdDesdeToken } from './login.controller.js';

/* -------------------------------------------------------------------------- */
/*                    OBTENER TODOS LOS VENDEDORES                            */
/* -------------------------------------------------------------------------- */
export const getVendedores = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                v.vendedor_id, 
                v.estado_vendedor_id, 
                v.vendedor_fecha_ingreso, 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento,
                p.persona_domicilio,
                p.persona_telefono, 
                v.vendedor_comision_porcentaje,
                COALESCE((SELECT COUNT(*) FROM ventas WHERE ventas.persona_id = p.persona_id), 0) AS ventas_realizadas,
                COALESCE((SELECT SUM(comision_monto) FROM comisiones WHERE comisiones.vendedor_id = v.vendedor_id AND estado_comision_id = 2), 0) AS comisiones_acumuladas,
                COALESCE((SELECT SUM(comision_monto) FROM comisiones WHERE comisiones.vendedor_id = v.vendedor_id AND estado_comision_id = 1), 0) AS comisiones_pendientes
            FROM 
                vendedores v 
            INNER JOIN 
                personas p 
            ON 
                v.persona_id = p.persona_id
            WHERE v.estado_vendedor_id = 1`  // Solo activos
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                   OBTENER TODOS LOS VENDEDORES INACTIVOS                   */
/* -------------------------------------------------------------------------- */
export const getVendedoresInactivos = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                v.vendedor_id, 
                v.estado_vendedor_id, 
                v.vendedor_fecha_ingreso, 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento, 
                p.persona_domicilio, 
                p.persona_telefono 
            FROM 
                vendedores v 
            INNER JOIN 
                personas p 
            ON 
                v.persona_id = p.persona_id 
            WHERE 
                v.estado_vendedor_id = 2`  // Solo inactivos
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           OBTENER VENDEDOR POR ID                          */
/* -------------------------------------------------------------------------- */
export const getVendedor = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT 
                v.vendedor_id, 
                v.estado_vendedor_id, 
                v.vendedor_fecha_ingreso, 
                p.persona_nombre, 
                p.persona_apellido, 
                p.persona_dni, 
                p.persona_fecha_nacimiento,
                p.persona_domicilio,
                p.persona_telefono, 
                v.vendedor_comision_porcentaje,
                (SELECT COUNT(*) FROM ventas WHERE vendedor_id = v.vendedor_id) AS ventas_realizadas,
                (SELECT SUM(comision_monto) FROM comisiones WHERE vendedor_id = v.vendedor_id AND estado_comision_id = 2) AS comisiones_acumuladas,
                (SELECT SUM(comision_monto) FROM comisiones WHERE vendedor_id = v.vendedor_id AND estado_comision_id = 1) AS comisiones_pendientes
            FROM 
                vendedores v 
            INNER JOIN 
                personas p 
            ON 
                v.persona_id = p.persona_id
            WHERE 
                v.vendedor_id = ?`, [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Vendedor no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                          DAR DE ALTA A UN VENDEDOR                         */
/* -------------------------------------------------------------------------- */
export const createVendedor = async (req, res) => {
    try {
        console.log('Datos recibidos en createVendedor:', req.body);

        const { personaData, usuarioData } = req.body;

        // Validar los datos aquí
        if (!personaData || !usuarioData) {
            return res.status(400).json({ message: 'Datos incompletos' });
        }

        // Crear la persona
        const personaResponse = await createPersona(personaData);
        if (!personaResponse || !personaResponse.id) {
            return res.status(500).json({ message: 'Error al crear la persona' });
        }

        const personaId = personaResponse.id;

        // Crear el vendedor
        const estado_vendedor_id = 1;
        const fecha_ingreso = new Date();
        const comision_porcentaje = 5.00; // Porcentaje de comisión por defecto

        const [vendedorResult] = await pool.query(
            "INSERT INTO `vendedores` (`persona_id`, `estado_vendedor_id`, `vendedor_fecha_ingreso`, `vendedor_comision_porcentaje`) VALUES (?, ?, ?, ?)",
            [personaId, estado_vendedor_id, fecha_ingreso, comision_porcentaje]
        );

        const response = {
            id: vendedorResult.insertId,
            persona_id: personaId,
            estado_vendedor_id,
            fecha_ingreso,
            comision_porcentaje
        };

        if (res) {
            res.json(response);
        } else {
            return response;
        }
    } catch (error) {
        console.error('Error en createVendedor:', error);
        if (res) {
            res.status(500).json({ message: error.message });
        } else {
            throw error;
        }
    }
};

/* -------------------------------------------------------------------------- */
/*                      ACTUALIZAR UN VENDEDOR (PERSONA)                      */
/* -------------------------------------------------------------------------- */
export const updateVendedor = async (req, res) => {
    const { id } = req.params; // Extraer el ID del vendedor de los parámetros de la solicitud
    console.log("Este es el ID en la funcion de updateVendedor", id);

    try {
        // Consulta SQL para obtener el ID de la persona asociado al vendedor
        const [vendedor] = await pool.query(
            `SELECT persona_id FROM vendedores WHERE vendedor_id = ?`, [id]
        );

        // Verificar si el vendedor existe
        if (vendedor.length === 0) {
            return res.status(404).json({ message: 'Vendedor a actualizar no encontrado' });
        }

        const personaId = vendedor[0].persona_id; // Extraer el ID de la persona

        // Actualizar la información de la persona
        req.params.id = personaId; // Reemplazar el ID en los parámetros con el ID de la persona
        await updatePersona(req, res); // Llamar a la función para actualizar la persona

        // Enviar respuesta de éxito
        res.status(200).json({ message: 'Vendedor actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando vendedor:', error);
        res.status(500).json({ message: 'Error al actualizar el vendedor', error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                 CAMBIAR EL ESTADO DE UN VENDEDOR A INACTIVO                */
/* -------------------------------------------------------------------------- */
export const deactivateVendedor = async (req, res = null) => {
    const { id } = req.params;

    try {
        // Obtener el persona_id asociado al vendedor
        const [vendedor] = await pool.query("SELECT persona_id FROM vendedores WHERE vendedor_id = ?", [id]);
        if (vendedor.length === 0) {
            throw new Error('Vendedor no encontrado');
        }
        const personaId = vendedor[0].persona_id;

        // Desactivar el vendedor
        await pool.query("UPDATE vendedores SET estado_vendedor_id = 2 WHERE vendedor_id = ?", [id]);

        // Eliminar el rol de vendedor en usuarios_roles
        await pool.query("DELETE FROM usuarios_roles WHERE usuario_id = (SELECT usuario_id FROM usuarios WHERE persona_id = ?) AND rol_id = ?", [personaId, 2]);

        if (res) {
            res.json({ message: 'Vendedor dado de baja exitosamente' });
        } else {
            return { message: 'Vendedor dado de baja exitosamente' };
        }
    } catch (error) {
        if (res) {
            res.status(500).json({ message: error.message });
        } else {
            throw error;
        }
    }
};

/* -------------------------------------------------------------------------- */
/*                  CAMBIAR EL ESTADO DE UN VENDEDOR A ACTIVO                 */
/* -------------------------------------------------------------------------- */
export const activateVendedor = async (req, res = null) => {
    const { id } = req.params;

    try {
        // Obtener el persona_id asociado al vendedor
        const [vendedor] = await pool.query("SELECT persona_id FROM vendedores WHERE vendedor_id = ?", [id]);
        if (vendedor.length === 0) {
            throw new Error('Vendedor no encontrado');
        }
        const personaId = vendedor[0].persona_id;

        // Activar el vendedor
        await pool.query("UPDATE vendedores SET estado_vendedor_id = 1 WHERE vendedor_id = ?", [id]);

        // Asignar el rol de vendedor en usuarios_roles
        await pool.query("INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ((SELECT usuario_id FROM usuarios WHERE persona_id = ?), ?) ON DUPLICATE KEY UPDATE rol_id = rol_id", [personaId, 2]);

        if (res) {
            res.json({ message: 'Vendedor reactivado exitosamente' });
        } else {
            return { message: 'Vendedor reactivado exitosamente' };
        }
    } catch (error) {
        if (res) {
            res.status(500).json({ message: error.message });
        } else {
            throw error;
        }
    }
};

/* -------------------------------------------------------------------------- */
/*                    OBTENER EL ESTADO DE UN VENDEDOR                        */
/* -------------------------------------------------------------------------- */
export const getEstadoVendedor = async (req, res) => {
    try {
        const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT

        const [vendedorRows] = await pool.query(
            `SELECT vendedor_id FROM vendedores WHERE persona_id = ?`, [personaId]
        );

        if (vendedorRows.length === 0) {
            return res.status(404).json({ message: 'Vendedor no encontrado' });
        }

        const vendedorId = vendedorRows[0].vendedor_id;

        const [estadoRows] = await pool.query(
            `SELECT estado_vendedor_id FROM vendedores WHERE vendedor_id = ?`, [vendedorId]
        );

        if (estadoRows.length === 0) {
            return res.status(404).json({ message: 'Estado del vendedor no encontrado' });
        }

        res.json({ estado_vendedor_id: estadoRows[0].estado_vendedor_id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           LIQUIDAR COMISIONES                              */
/* -------------------------------------------------------------------------- */
export const liquidarComisiones = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE comisiones 
            SET estado_comision_id = 2 
            WHERE vendedor_id = ? AND estado_comision_id = 1`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No se encontraron comisiones pendientes para liquidar' });
        }

        res.json({ message: 'Comisiones liquidadas exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
