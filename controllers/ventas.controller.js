import ExcelJS from 'exceljs';
import { pool } from '../db.js';
import { obtenerPersonaIdDesdeToken } from './login.controller.js';


/* -------------------------------------------------------------------------- */
/*                          PROCESAR PAGO EN EFECTIVO                         */
/* -------------------------------------------------------------------------- */
export const procesarPagoEfectivo = async (req, res) => {
    const { clienteId, productos, total } = req.body;
    const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT

    // Validación de datos de entrada
    if (!productos || !total) {
        return res.status(400).json({ message: 'Datos de pago incompletos.' });
    }

    try {
        // Verificar el rol de la persona
        const [roles] = await pool.query(
            `SELECT r.rol_id 
            FROM usuarios_roles ur
            JOIN roles r ON ur.rol_id = r.rol_id
            JOIN usuarios u ON ur.usuario_id = u.usuario_id
            WHERE u.persona_id = ?`,
            [personaId]
        );

        const esVendedor = roles.some(role => role.rol_id === 2);
        const esAdministrador = roles.some(role => role.rol_id === 1);

        let vendedorId = null;
        let comisionPorcentaje = null;

        if (esVendedor) {
            const [vendedor] = await pool.query(
                `SELECT vendedor_id, vendedor_comision_porcentaje FROM vendedores WHERE persona_id = ?`,
                [personaId]
            );

            vendedorId = vendedor.length > 0 ? vendedor[0].vendedor_id : null;
            comisionPorcentaje = vendedor.length > 0 ? vendedor[0].vendedor_comision_porcentaje : null;
        }

        // Registrar la venta en la tabla 'ventas'
        const [ventaResult] = await pool.query(
            `INSERT INTO ventas (cliente_id, persona_id, venta_fecha, venta_total)
            VALUES (?, ?, NOW(), ?)`,
            [clienteId || null, personaId, total]
        );

        const ventaId = ventaResult.insertId;

        // Registrar los detalles de la venta en la tabla 'detalle_venta'
        for (const producto of productos) {
            const { inventarioId, cantidad, precioUnitario, subtotal } = producto;
            await pool.query(
                `INSERT INTO detalle_venta (inventario_id, ventas_id, detalle_venta_cantidad, detalle_venta_precio_unitario, detalle_venta_subtotal)
                VALUES (?, ?, ?, ?, ?)`,
                [inventarioId, ventaId, cantidad, precioUnitario, subtotal]
            );

            // Actualizar la cantidad en el inventario
            await pool.query(
                `UPDATE inventario_principal
                SET inventario_cantidad = inventario_cantidad - ?
                WHERE inventario_id = ?`,
                [cantidad, inventarioId]
            );
        }

        // Crear el comprobante de pago en efectivo
        const comprobanteId = await crearComprobante(
            ventaId,
            1, // ID del método de pago en efectivo
            null, // No hay URL de comprobante para pagos en efectivo
            total
        );

        // Registrar la comisión solo si la persona es un vendedor
        if (esVendedor && comisionPorcentaje !== null) {
            const comisionMonto = (total * comisionPorcentaje) / 100;

            // Insertar el registro en la tabla 'comisiones'
            await pool.query(
                `INSERT INTO comisiones (vendedor_id, estado_comision_id, comision_fecha, comision_monto, comision_descripcion)
                VALUES (?, 1, NOW(), ?, 'Venta de suplemento')`,
                [vendedorId, comisionMonto]
            );
        }

        res.status(200).json({ message: 'Pago en efectivo registrado exitosamente', comprobanteId });
    } catch (error) {
        console.error('Error procesando el pago en efectivo:', error);
        res.status(500).json({ message: 'Ocurrió un error al procesar el pago en efectivo. Por favor, intenta nuevamente.' });
    }
};

/* -------------------------------------------------------------------------- */
/*                          PROCESAR PAGO CON MERCADO PAGO                    */
/* -------------------------------------------------------------------------- */
export const procesarPagoMercadoPago = async (req, res) => {
    const { clienteId, productos, total } = req.body;
    const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT

    // Validación de datos de entrada
    if (!productos || !total) {
        return res.status(400).json({ message: 'Datos de pago incompletos.' });
    }

    try {
        console.log('Datos recibidos para procesar pago con Mercado Pago:', { clienteId, productos, total, personaId });

        // Verificar el rol de la persona
        const [roles] = await pool.query(
            `SELECT r.rol_id 
            FROM usuarios_roles ur
            JOIN roles r ON ur.rol_id = r.rol_id
            JOIN usuarios u ON ur.usuario_id = u.usuario_id
            WHERE u.persona_id = ?`,
            [personaId]
        );

        const esVendedor = roles.some(role => role.rol_id === 2);
        const esAdministrador = roles.some(role => role.rol_id === 1);

        let vendedorId = null;
        let comisionPorcentaje = null;

        if (esVendedor) {
            const [vendedor] = await pool.query(
                `SELECT vendedor_id, vendedor_comision_porcentaje FROM vendedores WHERE persona_id = ?`,
                [personaId]
            );

            vendedorId = vendedor.length > 0 ? vendedor[0].vendedor_id : null;
            comisionPorcentaje = vendedor.length > 0 ? vendedor[0].vendedor_comision_porcentaje : null;
        }

        // Registrar la venta en la tabla 'ventas'
        const [ventaResult] = await pool.query(
            `INSERT INTO ventas (cliente_id, persona_id, venta_fecha, venta_total)
            VALUES (?, ?, NOW(), ?)`,
            [clienteId || null, personaId, total]
        );

        const ventaId = ventaResult.insertId;
        console.log('Venta registrada con ID:', ventaId);

        // Registrar los detalles de la venta en la tabla 'detalle_venta'
        for (const producto of productos) {
            const { inventarioId, cantidad, precioUnitario, subtotal } = producto;
            console.log('Registrando detalle de venta:', { inventarioId, ventaId, cantidad, precioUnitario, subtotal });

            await pool.query(
                `INSERT INTO detalle_venta (inventario_id, ventas_id, detalle_venta_cantidad, detalle_venta_precio_unitario, detalle_venta_subtotal)
                VALUES (?, ?, ?, ?, ?)`,
                [inventarioId, ventaId, cantidad, precioUnitario, subtotal]
            );

            // Actualizar la cantidad en el inventario
            console.log('Actualizando inventario para inventarioId:', inventarioId);
            await pool.query(
                `UPDATE inventario_principal
                SET inventario_cantidad = inventario_cantidad - ?
                WHERE inventario_id = ?`,
                [cantidad, inventarioId]
            );
        }

        // Crear el comprobante de pago con Mercado Pago
        const comprobanteId = await crearComprobante(
            ventaId,
            2, // ID del método de pago con Mercado Pago
            null, // No hay URL de comprobante para pagos en efectivo
            total
        );

        console.log('Comprobante creado con ID:', comprobanteId);

        // Registrar la comisión solo si la persona es un vendedor
        if (esVendedor && comisionPorcentaje !== null) {
            const comisionMonto = (total * comisionPorcentaje) / 100;

            // Insertar el registro en la tabla 'comisiones'
            await pool.query(
                `INSERT INTO comisiones (vendedor_id, estado_comision_id, comision_fecha, comision_monto, comision_descripcion)
                VALUES (?, 1, NOW(), ?, 'Venta de suplemento')`,
                [vendedorId, comisionMonto]
            );
        }

        res.status(200).json({ message: 'Pago con Mercado Pago registrado exitosamente', comprobanteId });
    } catch (error) {
        console.error('Error procesando el pago con Mercado Pago:', error);
        res.status(500).json({ message: 'Ocurrió un error al procesar el pago con Mercado Pago. Por favor, intenta nuevamente.' });
    }
};

/* -------------------------------------------------------------------------- */
/*                          CREAR COMPROBANTE DE PAGO                         */
/* -------------------------------------------------------------------------- */
export const crearComprobante = async (ventaId, metodoPagoId, comprobanteUrl, monto) => {
    try {
        console.log('Creando comprobante:', { ventaId, metodoPagoId, comprobanteUrl, monto });
        const [comprobanteResult] = await pool.query(
            `INSERT INTO comprobantes (ventas_id, metodo_pago_id, comprobante_url, comprobante_fecha, comprobante_monto)
            VALUES (?, ?, ?, NOW(), ?)`,
            [ventaId, metodoPagoId, comprobanteUrl, monto]
        );

        return comprobanteResult.insertId;
    } catch (error) {
        console.error('Error creando el comprobante:', error);
        throw error;
    }
};

/* -------------------------------------------------------------------------- */
/*                          OBTENER TODAS LAS VENTAS                          */
/* -------------------------------------------------------------------------- */
export const obtenerVentas = async (req, res) => {
    try {
        const personaId = obtenerPersonaIdDesdeToken(req); // Obtener personaId del token JWT

        // Obtener el ID del rol desde los encabezados de la solicitud
        const selectedRoleId = req.headers['x-selected-role-id'];

        let ventas;
        if (selectedRoleId === '1') { // Administrador
            [ventas] = await pool.query(
                `SELECT 
                    v.ventas_id, 
                    v.venta_fecha, 
                    v.venta_total, 
                    c.persona_nombre AS clienteNombre, 
                    c.persona_apellido AS clienteApellido, 
                    ven.persona_nombre AS vendedorNombre, 
                    ven.persona_apellido AS vendedorApellido 
                FROM 
                    ventas v
                LEFT JOIN clientes cl ON v.cliente_id = cl.cliente_id
                LEFT JOIN personas c ON cl.persona_id = c.persona_id
                LEFT JOIN personas ven ON v.persona_id = ven.persona_id`
            );
        } else if (selectedRoleId === '2') { // Vendedor
            [ventas] = await pool.query(
                `SELECT 
                    v.ventas_id, 
                    v.venta_fecha, 
                    v.venta_total, 
                    c.persona_nombre AS clienteNombre, 
                    c.persona_apellido AS clienteApellido, 
                    ven.persona_nombre AS vendedorNombre, 
                    ven.persona_apellido AS vendedorApellido 
                FROM 
                    ventas v
                LEFT JOIN clientes cl ON v.cliente_id = cl.cliente_id
                LEFT JOIN personas c ON cl.persona_id = c.persona_id
                LEFT JOIN personas ven ON v.persona_id = ven.persona_id
                WHERE v.persona_id = ?`,
                [personaId]
            );
        } else {
            return res.status(403).json({ message: 'No tienes permiso para ver estas ventas.' });
        }

        res.json(ventas);
    } catch (error) {
        console.error('Error en obtenerVentas:', error);
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                          OBTENER VENTA POR ID                              */
/* -------------------------------------------------------------------------- */
export const obtenerVentaPorId = async (req, res) => {
    const { id } = req.params;

    try {
        const [venta] = await pool.query(
            `SELECT 
                v.ventas_id, 
                v.venta_fecha, 
                v.venta_total, 
                c.persona_nombre AS clienteNombre, 
                c.persona_apellido AS clienteApellido, 
                ven.persona_nombre AS vendedorNombre, 
                ven.persona_apellido AS vendedorApellido 
            FROM 
                ventas v
            LEFT JOIN clientes cl ON v.cliente_id = cl.cliente_id
            LEFT JOIN personas c ON cl.persona_id = c.persona_id
            LEFT JOIN personas ven ON v.persona_id = ven.persona_id
            WHERE v.ventas_id = ?`,
            [id]
        );

        if (venta.length === 0) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        const [detalles] = await pool.query(
            `SELECT 
                dv.detalle_venta_id, 
                dv.detalle_venta_cantidad, 
                dv.detalle_venta_precio_unitario, 
                dv.detalle_venta_subtotal, 
                p.producto_descripcion AS productoDescripcion 
            FROM 
                detalle_venta dv
            JOIN inventario_principal ip ON dv.inventario_id = ip.inventario_id
            JOIN productos p ON ip.producto_id = p.producto_id
            WHERE dv.ventas_id = ?`,
            [id]
        );

        res.json({ ...venta[0], detalles });
    } catch (error) {
        console.error('Error en obtenerVentaPorId:', error);
        res.status(500).json({ message: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                          GENERAR REPORTE DE VENTAS                         */
/* -------------------------------------------------------------------------- */
export const generarReporteVentas = async (req, res) => {
    try {
        const [ventas] = await pool.query(
            `SELECT 
                v.ventas_id, 
                v.venta_fecha, 
                v.venta_total, 
                c.persona_nombre AS clienteNombre, 
                c.persona_apellido AS clienteApellido, 
                ven.persona_nombre AS vendedorNombre, 
                ven.persona_apellido AS vendedorApellido 
            FROM 
                ventas v
            LEFT JOIN clientes cl ON v.cliente_id = cl.cliente_id
            LEFT JOIN personas c ON cl.persona_id = c.persona_id
            LEFT JOIN personas ven ON v.persona_id = ven.persona_id`
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte de Ventas');

        worksheet.columns = [
            { header: 'ID Venta', key: 'ventas_id', width: 10 },
            { header: 'Fecha', key: 'venta_fecha', width: 15 },
            { header: 'Cliente', key: 'cliente', width: 25 },
            { header: 'Vendedor', key: 'vendedor', width: 25 },
            { header: 'Total', key: 'venta_total', width: 15 },
            { header: 'ID Detalle', key: 'detalle_venta_id', width: 10 },
            { header: 'Cantidad', key: 'detalle_venta_cantidad', width: 10 },
            { header: 'Precio Unitario', key: 'detalle_venta_precio_unitario', width: 15 },
            { header: 'Subtotal', key: 'detalle_venta_subtotal', width: 15 },
            { header: 'Producto', key: 'producto_descripcion', width: 25 },
        ];

        // Estilo para el encabezado
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        for (const venta of ventas) {
            const [detalles] = await pool.query(
                `SELECT 
                    dv.detalle_venta_id, 
                    dv.detalle_venta_cantidad, 
                    dv.detalle_venta_precio_unitario, 
                    dv.detalle_venta_subtotal, 
                    p.producto_descripcion 
                FROM 
                    detalle_venta dv
                JOIN inventario_principal ip ON dv.inventario_id = ip.inventario_id
                JOIN productos p ON ip.producto_id = p.producto_id
                WHERE dv.ventas_id = ?`,
                [venta.ventas_id]
            );

            if (detalles.length > 0) {
                detalles.forEach((detalle, index) => {
                    const row = worksheet.addRow({
                        ventas_id: index === 0 ? venta.ventas_id : '',
                        venta_fecha: index === 0 ? new Date(venta.venta_fecha).toLocaleDateString() : '',
                        cliente: index === 0 ? `${venta.clienteNombre} ${venta.clienteApellido}` : '',
                        vendedor: index === 0 ? (venta.vendedorNombre && venta.vendedorApellido ? `${venta.vendedorNombre} ${venta.vendedorApellido}` : '') : '',
                        venta_total: index === 0 ? venta.venta_total : '',
                        detalle_venta_id: detalle.detalle_venta_id,
                        detalle_venta_cantidad: detalle.detalle_venta_cantidad,
                        detalle_venta_precio_unitario: detalle.detalle_venta_precio_unitario,
                        detalle_venta_subtotal: detalle.detalle_venta_subtotal,
                        producto_descripcion: detalle.producto_descripcion,
                    });

                    // Estilo para las filas
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' },
                        };
                    });
                });
            } else {
                const row = worksheet.addRow({
                    ventas_id: venta.ventas_id,
                    venta_fecha: new Date(venta.venta_fecha).toLocaleDateString(),
                    cliente: `${venta.clienteNombre} ${venta.clienteApellido}`,
                    vendedor: venta.vendedorNombre && venta.vendedorApellido ? `${venta.vendedorNombre} ${venta.vendedorApellido}` : '',
                    venta_total: venta.venta_total,
                    detalle_venta_id: '',
                    detalle_venta_cantidad: '',
                    detalle_venta_precio_unitario: '',
                    detalle_venta_subtotal: '',
                    producto_descripcion: '',
                });

                // Estilo para las filas
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                });
            }
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Ventas.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error en generarReporteVentas:', error);
        res.status(500).json({ message: error.message });
    }
};