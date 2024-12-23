import { pool } from '../db.js';

/* -------------------------------------------------------------------------- */
/*                          DAR DE ALTA A UNA PERSONA                         */
/* -------------------------------------------------------------------------- */
export const createPersona = async (personaData) => {

    const { persona_nombre, persona_apellido, persona_dni, persona_fecha_nacimiento, persona_domicilio, persona_telefono } = personaData;
    const persona_fecha_alta = new Date();

    try {
        const [result] = await pool.query(
            "INSERT INTO `personas` (`persona_nombre`, `persona_apellido`, `persona_dni`, `persona_fecha_nacimiento`, `persona_domicilio`, `persona_telefono`, `persona_fecha_alta`) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [persona_nombre, persona_apellido, persona_dni, persona_fecha_nacimiento, persona_domicilio, persona_telefono, persona_fecha_alta]
        );

        return {
            id: result.insertId,
            persona_nombre,
            persona_apellido,
            persona_dni,
            persona_fecha_nacimiento,
            persona_domicilio,
            persona_telefono,
            persona_fecha_alta
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/* -------------------------------------------------------------------------- */
/*                           ACTUALIZAR UNA PERSONA                           */
/* -------------------------------------------------------------------------- */
export const updatePersona = async (req) => {
    const { id } = req.params; // Extraer el ID de la persona de los parámetros de la solicitud

    // Consulta SQL para actualizar la información de la persona
    const [result] = await pool.query(
        `UPDATE personas 
        SET ?
        WHERE persona_id = ?`,
        [
            req.body,
            id
        ]
    );

    return result; // Devuelve el resultado en lugar de enviar una respuesta
};

/* -------------------------------------------------------------------------- */
/*                          VERIFICAR SI UN DNI EXISTE                        */
/* -------------------------------------------------------------------------- */
export const checkDniExists = async (req, res) => {
    const { dni } = req.params;
    console.log('Verificando DNI:', dni);
    try {
        const [rows] = await pool.query('SELECT * FROM personas WHERE persona_dni = ?', [dni]);
        console.log('Resultado de la consulta:', rows);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'El DNI ya está registrado' });
        }
        res.json({ message: 'El DNI está disponible' });
    } catch (error) {
        console.error('Error en checkDniExists:', error);
        res.status(500).json({ message: error.message });
    }
};