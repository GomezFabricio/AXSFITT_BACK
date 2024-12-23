import { Router } from 'express';
import { 
    obtenerVentas, 
    obtenerVentaPorId, 
    generarReporteVentas,
    procesarPagoEfectivo, 
    procesarPagoMercadoPago,
} from '../controllers/ventas.controller.js';

const router = Router();

/* Generar reporte de ventas */
router.get('/ventas/reporte', generarReporteVentas);

/* Obtener todas las ventas */
router.get('/ventas', obtenerVentas);

/* Obtener una venta por su ID */
router.get('/ventas/:id', obtenerVentaPorId);

/* Procesar pago en efectivo */
router.post('/ventas/pago-efectivo', procesarPagoEfectivo);

/* Procesar pago con Mercado Pago */
router.post('/ventas/pago-mercadopago', procesarPagoMercadoPago);


export default router;