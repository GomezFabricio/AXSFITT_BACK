import express from 'express';
import axios from 'axios';

const router = express.Router();

let paymentStatus = null; // Variable global para almacenar el estado del pago

router.post('/webhook', express.json(), async (req, res) => {
    console.log('Webhook recibido');
    console.log('URL de notificación:', req.originalUrl);

    const { topic, id } = req.query;

    if (topic === 'merchant_order' && id) {
        try {
            const response = await axios.get(`https://api.mercadolibre.com/merchant_orders/${id}`, {
                headers: { Authorization: `Bearer TEST-1273741858627121-110320-a07c982b52b13f4ba280d44e47b5fbe9-250056888` }
            });
            const orderDetails = response.data;

            // Verificar si el pedido está cerrado antes de procesarlo
            if (orderDetails.status === 'closed') {
                console.log('Detalles del pedido:', orderDetails);
                paymentStatus = orderDetails; // Almacenar los detalles del pedido
                res.sendStatus(200);
            } else {
                console.log(`El pedido aún no está cerrado, estado actual: ${orderDetails.status}`);
                res.sendStatus(200); // Confirmamos recepción, pero no procesamos
            }
        } catch (error) {
            console.error('Error obteniendo detalles del pedido:', error);
            res.sendStatus(500);
        }
    } else {
        console.log(`Tipo de notificación no procesada: ${topic}`);
        res.sendStatus(200);
    }
});

// Ruta para consultar el estado del pago
router.get('/payment-status', (req, res) => {
    res.json(paymentStatus);
});

export default router;