import { pool } from '../db.js';

// Listar inventario con detalles
export const inventarioList = async (req, res) => {
    console.log('Entrando a inventarioList');
    try {
        const [result] = await pool.query(`
            SELECT 
                ip.inventario_id AS idInventario,
                p.producto_id AS idProducto,
                p.producto_codigo_barras AS CodigoBarras,
                p.producto_descripcion AS Producto,
                tp.tipo_producto_nombre AS Tipo,
                mp.marca_producto_nombre AS Marca,
                ip.inventario_cantidad AS Cantidad,
                ip.inventario_precio_costo AS PrecioCosto,
                ip.inventario_precio_venta AS PrecioVenta,
                ip.inventario_precio_afiliado AS PrecioAfiliados
            FROM productos p
            JOIN tipos_productos tp ON p.tipo_producto_id = tp.tipo_producto_id
            JOIN marca_productos mp ON p.marca_producto_id = mp.marca_producto_id
            JOIN inventario_principal ip ON p.producto_id = ip.producto_id
            WHERE ip.activo = TRUE
        `);
        console.log('Resultado de la consulta de inventario:', result);
        res.json(result);
    } catch (error) {
        console.error('Error en inventarioList:', error);
        res.status(500).json({ message: error.message });
    }
};

// Listar todas las marcas
export const marcasList = async (req, res) => {
    console.log('Entrando a marcasList');
    try {
        const [result] = await pool.query(`
            SELECT 
                marca_producto_id AS idMarcaProducto,
                marca_producto_nombre AS nombreMarcaProducto
            FROM marca_productos
            WHERE activo = TRUE
        `);
        console.log('Resultado de la consulta de marcas:', result);
        res.json(result);
    } catch (error) {
        console.error('Error en marcasList:', error);
        res.status(500).json({ message: error.message });
    }
};

// Listar todos los tipos de productos
export const tiposProductosList = async (req, res) => {
    console.log('Entrando a tiposProductosList');
    try {
        const [result] = await pool.query(`
            SELECT 
                tipo_producto_id AS idTipoProducto,
                tipo_producto_nombre AS nombreTipoProducto
            FROM tipos_productos
            WHERE activo = TRUE
        `);
        console.log('Resultado de la consulta de tipos de productos:', result);
        res.json(result);
    } catch (error) {
        console.error('Error en tiposProductosList:', error);
        res.status(500).json({ message: error.message });
    }
};

// Listar todos los productos con datos relevantes para el usuario
export const productosList = async (req, res) => {
    console.log('Entrando a productosList');
    try {
        const [result] = await pool.query(`
            SELECT 
                p.producto_id AS idProducto,
                p.producto_codigo_barras AS CodigoBarras,
                p.producto_descripcion AS Producto,
                tp.tipo_producto_nombre AS TipoProducto,
                mp.marca_producto_nombre AS MarcaProducto
            FROM productos p
            JOIN tipos_productos tp ON p.tipo_producto_id = tp.tipo_producto_id
            JOIN marca_productos mp ON p.marca_producto_id = mp.marca_producto_id
            WHERE p.activo = TRUE
        `);
        console.log('Resultado de la consulta de productos:', result);
        res.json(result);
    } catch (error) {
        console.error('Error en productosList:', error);
        res.status(500).json({ message: error.message });
    }
};

// Agregar un tipo de producto
export const agregarTipoProducto = async (req, res) => {
    console.log('Entrando a agregarTipoProducto');
    const { nombreTipoProducto } = req.body;
    try {
        const [result] = await pool.query(`
            INSERT INTO tipos_productos (tipo_producto_nombre)
            VALUES (?)
        `, [nombreTipoProducto]);
        console.log('Resultado de la inserción de tipo de producto:', result);
        res.json({ message: 'Tipo de producto agregado exitosamente', id: result.insertId });
    } catch (error) {
        console.error('Error en agregarTipoProducto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Agregar una marca
export const agregarMarca = async (req, res) => {
    console.log('Entrando a agregarMarca');
    const { nombreMarcaProducto } = req.body;
    try {
        const [result] = await pool.query(`
            INSERT INTO marca_productos (marca_producto_nombre)
            VALUES (?)
        `, [nombreMarcaProducto]);
        console.log('Resultado de la inserción de marca:', result);
        res.json({ message: 'Marca agregada exitosamente', id: result.insertId });
    } catch (error) {
        console.error('Error en agregarMarca:', error);
        res.status(500).json({ message: error.message });
    }
};

// Agregar un producto
export const agregarProducto = async (req, res) => {
    console.log('Entrando a agregarProducto');
    const { codigoBarrasProducto, nombreProducto, idTipoProducto, idMarcaProducto } = req.body;

    try {
        // Insertar el producto en la tabla productos
        const [productoResult] = await pool.query(`
            INSERT INTO productos (producto_codigo_barras, producto_descripcion, tipo_producto_id, marca_producto_id)
            VALUES (?, ?, ?, ?)
        `, [codigoBarrasProducto, nombreProducto, idTipoProducto, idMarcaProducto]);

        console.log('Resultado de la inserción de producto:', productoResult);
        res.json({ message: 'Producto agregado exitosamente', id: productoResult.insertId });
    } catch (error) {
        console.error('Error en agregarProducto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Agregar inventario
export const agregarInventario = async (req, res) => {
    console.log('Entrando a agregarInventario');
    const { productoId, cantidad, precioCosto, precioVenta, incremento, reingreso } = req.body;

    console.log('Valores recibidos:', { productoId, cantidad, precioCosto, precioVenta, incremento, reingreso });

    try {
        // Convertir valores a números
        const precioCostoNum = parseFloat(precioCosto);
        const precioVentaNum = precioVenta ? parseFloat(precioVenta) : null;
        const incrementoNum = incremento ? parseFloat(incremento) : null;

        // Verificar si el producto ya está en el inventario
        const [existingProduct] = await pool.query(`
            SELECT * FROM inventario_principal WHERE producto_id = ?
        `, [productoId]);

        if (existingProduct.length > 0 && !reingreso) {
            return res.status(200).json({ message: 'El producto ya se encuentra en el inventario. ¿Desea realizar un reingreso?', reingreso: true });
        }

        let calculatedPrecioVenta = precioVentaNum;
        let calculatedIncremento = incrementoNum;

        // Si el precio de venta no se proporciona, calcularlo usando el incremento porcentual
        if (!precioVentaNum && incrementoNum) {
            calculatedPrecioVenta = precioCostoNum + (precioCostoNum * (incrementoNum / 100));
            console.log('Calculando precio de venta usando incremento:', { precioCostoNum, incrementoNum, calculatedPrecioVenta });
        }

        // Si el precio de venta se proporciona pero no el incremento, calcular el incremento porcentual
        if (precioVentaNum && !incrementoNum) {
            calculatedIncremento = ((precioVentaNum - precioCostoNum) / precioCostoNum) * 100;
            console.log('Calculando incremento usando precio de venta:', { precioCostoNum, precioVentaNum, calculatedIncremento });
        }

        // Calcular el precio de afiliado restando un 10% al precio de venta
        const precioAfiliado = calculatedPrecioVenta * 0.9;
        console.log('Calculando precio de afiliado:', { calculatedPrecioVenta, precioAfiliado });

        // Obtener la fecha actual
        const fechaActualizacion = new Date();

        if (reingreso) {
            // Sumar la cantidad ingresada a la cantidad existente
            const nuevaCantidad = existingProduct[0].inventario_cantidad + cantidad;

            // Actualizar el inventario existente
            const [updateResult] = await pool.query(`
                UPDATE inventario_principal
                SET inventario_cantidad = ?, inventario_precio_costo = ?, inventario_precio_venta = ?, inventario_precio_afiliado = ?, inventario_incremento = ?, inventario_fecha_actualizacion = ?
                WHERE producto_id = ?
            `, [nuevaCantidad, precioCostoNum, calculatedPrecioVenta, precioAfiliado, calculatedIncremento, fechaActualizacion, productoId]);

            console.log('Resultado de la actualización de inventario:', updateResult);
            return res.json({ message: 'Inventario actualizado exitosamente', id: existingProduct[0].id });
        } else {
            // Insertar el inventario en la tabla inventario_principal
            const [inventarioResult] = await pool.query(`
                INSERT INTO inventario_principal (producto_id, inventario_cantidad, inventario_precio_costo, inventario_precio_venta, inventario_precio_afiliado, inventario_incremento, inventario_fecha_actualizacion)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [productoId, cantidad, precioCostoNum, calculatedPrecioVenta, precioAfiliado, calculatedIncremento, fechaActualizacion]);

            console.log('Resultado de la inserción de inventario:', inventarioResult);
            res.json({ message: 'Inventario agregado exitosamente', id: inventarioResult.insertId });
        }
    } catch (error) {
        console.error('Error en agregarInventario:', error);
        res.status(500).json({ message: error.message });
    }
};

// Obtener inventario por ID
export const obtenerInventarioPorId = async (req, res) => {
    console.log('Entrando a obtenerInventarioPorId');
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            SELECT 
                ip.inventario_id AS idInventario,
                p.producto_id AS idProducto,
                p.producto_codigo_barras AS CodigoBarras,
                p.producto_descripcion AS Producto,
                tp.tipo_producto_nombre AS TipoProducto,
                mp.marca_producto_nombre AS MarcaProducto,
                ip.inventario_cantidad AS Cantidad,
                ip.inventario_precio_costo AS PrecioCosto,
                ip.inventario_precio_venta AS PrecioVenta,
                ip.inventario_precio_afiliado AS PrecioAfiliados
            FROM productos p
            JOIN tipos_productos tp ON p.tipo_producto_id = tp.tipo_producto_id
            JOIN marca_productos mp ON p.marca_producto_id = mp.marca_producto_id
            JOIN inventario_principal ip ON p.producto_id = ip.producto_id
            WHERE p.producto_id = ?
        `, [id]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Inventario no encontrado' });
        }

        console.log('Resultado de la consulta de inventario por ID:', result[0]);
        res.json(result[0]);
    } catch (error) {
        console.error('Error en obtenerInventarioPorId:', error);
        res.status(500).json({ message: error.message });
    }
};

// Eliminar inventario (marcar como inactivo)
export const eliminarInventario = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE inventario_principal SET activo = FALSE WHERE producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto marcado como inactivo exitosamente' });
    } catch (error) {
        console.error('Error eliminando producto del inventario:', error);
        res.status(500).json({ message: error.message });
    }
};

// Eliminar marca (marcar como inactiva)
export const eliminarMarca = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE marca_productos SET activo = FALSE WHERE marca_producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Marca no encontrada' });
        }

        res.json({ message: 'Marca marcada como inactiva exitosamente' });
    } catch (error) {
        console.error('Error eliminando marca:', error);
        res.status(500).json({ message: error.message });
    }
};

// Eliminar tipo de producto (marcar como inactivo)
export const eliminarTipoProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE tipos_productos SET activo = FALSE WHERE tipo_producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tipo de producto no encontrado' });
        }

        res.json({ message: 'Tipo de producto marcado como inactivo exitosamente' });
    } catch (error) {
        console.error('Error eliminando tipo de producto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Eliminar producto (marcar como inactivo)
export const eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE productos SET activo = FALSE WHERE producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto marcado como inactivo exitosamente' });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Editar inventario
export const editarInventario = async (req, res) => {
    const { id } = req.params;
    const { cantidad, precioCosto, precioVenta, incremento } = req.body;

    try {
        // Convertir valores a números
        const precioCostoNum = parseFloat(precioCosto);
        const precioVentaNum = precioVenta ? parseFloat(precioVenta) : null;
        const incrementoNum = incremento ? parseFloat(incremento) : null;

        let calculatedPrecioVenta = precioVentaNum;
        let calculatedIncremento = incrementoNum;

        // Si el precio de venta no se proporciona, calcularlo usando el incremento porcentual
        if (!precioVentaNum && incrementoNum) {
            calculatedPrecioVenta = precioCostoNum + (precioCostoNum * (incrementoNum / 100));
        }

        // Si el precio de venta se proporciona pero no el incremento, calcular el incremento porcentual
        if (precioVentaNum && !incrementoNum) {
            calculatedIncremento = ((precioVentaNum - precioCostoNum) / precioCostoNum) * 100;
        }

        // Calcular el precio de afiliado restando un 10% al precio de venta
        const precioAfiliado = calculatedPrecioVenta * 0.9;

        // Obtener la fecha actual
        const fechaActualizacion = new Date();

        // Actualizar el inventario existente
        const [updateResult] = await pool.query(`
            UPDATE inventario_principal
            SET inventario_cantidad = ?, inventario_precio_costo = ?, inventario_precio_venta = ?, inventario_precio_afiliado = ?, inventario_incremento = ?, inventario_fecha_actualizacion = ?
            WHERE producto_id = ?
        `, [cantidad, precioCostoNum, calculatedPrecioVenta, precioAfiliado, calculatedIncremento, fechaActualizacion, id]);

        res.json({ message: 'Inventario actualizado exitosamente', id });
    } catch (error) {
        console.error('Error en editarInventario:', error);
        res.status(500).json({ message: error.message });
    }
};

// Editar producto
export const editarProducto = async (req, res) => {
    const { id } = req.params;
    const { codigoBarrasProducto, nombreProducto, idTipoProducto, idMarcaProducto } = req.body;

    try {
        const [result] = await pool.query(`
            UPDATE productos
            SET producto_codigo_barras = ?, producto_descripcion = ?, tipo_producto_id = ?, marca_producto_id = ?
            WHERE producto_id = ?
        `, [codigoBarrasProducto, nombreProducto, idTipoProducto, idMarcaProducto, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) {
        console.error('Error editando producto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Editar marca
export const editarMarca = async (req, res) => {
    const { id } = req.params;
    const { nombreMarcaProducto } = req.body;

    console.log('Editar Marca - ID:', id);
    console.log('Editar Marca - Body:', req.body);

    try {
        const [result] = await pool.query(`
            UPDATE marca_productos
            SET marca_producto_nombre = ?
            WHERE marca_producto_id = ?
        `, [nombreMarcaProducto, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Marca no encontrada' });
        }

        res.json({ message: 'Marca actualizada exitosamente' });
    } catch (error) {
        console.error('Error editando marca:', error);
        res.status(500).json({ message: error.message });
    }
};

// Editar tipo de producto
export const editarTipoProducto = async (req, res) => {
    const { id } = req.params;
    const { nombreTipoProducto } = req.body;

    console.log('Editar Tipo de Producto - ID:', id);
    console.log('Editar Tipo de Producto - Body:', req.body);

    try {
        const [result] = await pool.query(`
            UPDATE tipos_productos
            SET tipo_producto_nombre = ?
            WHERE tipo_producto_id = ?
        `, [nombreTipoProducto, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tipo de producto no encontrado' });
        }

        res.json({ message: 'Tipo de producto actualizado exitosamente' });
    } catch (error) {
        console.error('Error editando tipo de producto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Ver inventarios inactivos
export const verInventariosInactivos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ip.*, p.producto_codigo_barras, p.producto_descripcion, tp.tipo_producto_nombre, mp.marca_producto_nombre
            FROM inventario_principal ip
            JOIN productos p ON ip.producto_id = p.producto_id
            JOIN tipos_productos tp ON p.tipo_producto_id = tp.tipo_producto_id
            JOIN marca_productos mp ON p.marca_producto_id = mp.marca_producto_id
            WHERE ip.activo = FALSE
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo inventarios inactivos:', error);
        res.status(500).json({ message: error.message });
    }
};
// Ver productos inactivos
export const verProductosInactivos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, tp.tipo_producto_nombre, mp.marca_producto_nombre
            FROM productos p
            JOIN tipos_productos tp ON p.tipo_producto_id = tp.tipo_producto_id
            JOIN marca_productos mp ON p.marca_producto_id = mp.marca_producto_id
            WHERE p.activo = FALSE
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo productos inactivos:', error);
        res.status(500).json({ message: error.message });
    }
};

// Ver marcas inactivas
export const verMarcasInactivas = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM marca_productos WHERE activo = FALSE
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo marcas inactivas:', error);
        res.status(500).json({ message: error.message });
    }
};

// Ver tipos de productos inactivos
export const verTiposProductosInactivos = async (req, res) => {
    console.log('Entrando a verTiposProductosInactivos');
    try {
        const [rows] = await pool.query(`
            SELECT * FROM tipos_productos WHERE activo = FALSE
        `);
        console.log('Resultado de la consulta de tipos de productos inactivos:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo tipos de productos inactivos:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reactivar inventario
export const reactivarInventario = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE inventario_principal SET activo = TRUE WHERE inventario_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Inventario no encontrado' });
        }

        res.json({ message: 'Inventario reactivado exitosamente' });
    } catch (error) {
        console.error('Error reactivando inventario:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reactivar producto
export const reactivarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE productos SET activo = TRUE WHERE producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto reactivado exitosamente' });
    } catch (error) {
        console.error('Error reactivando producto:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reactivar marca
export const reactivarMarca = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE marca_productos SET activo = TRUE WHERE marca_producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Marca no encontrada' });
        }

        res.json({ message: 'Marca reactivada exitosamente' });
    } catch (error) {
        console.error('Error reactivando marca:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reactivar tipo de producto
export const reactivarTipoProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE tipos_productos SET activo = TRUE WHERE tipo_producto_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tipo de producto no encontrado' });
        }

        res.json({ message: 'Tipo de producto reactivado exitosamente' });
    } catch (error) {
        console.error('Error reactivando tipo de producto:', error);
        res.status(500).json({ message: error.message });
    }
};

