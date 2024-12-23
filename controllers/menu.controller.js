import { pool } from '../db.js';

export const getMenuByRole = async (req, res) => {
    try {
        const rolId = req.body.rolId || req.params.rolId; // Obtener rolId desde el cuerpo o parámetros

        // Comprobar si el rolId fue proporcionado
        if (!rolId) {
            return res.status(400).json({ message: 'El rol ID es requerido.' });
        }

        // Obtener las opciones del menú basadas en el rol
        const [menuOptions] = await pool.query(
            `SELECT mo.menu_opcion_nombre 
            FROM menu_opciones mo
            JOIN menu_roles mr ON mo.menu_opcion_id = mr.menu_opcion_id
            WHERE mr.rol_id = ?`,
            [rolId]
        );

        res.json({ menu: menuOptions.map(option => option.menu_opcion_nombre) });
    } catch (error) {
        console.error('Error en getMenuByRole:', error);
        return res.status(500).json({ message: error.message });
    }
};