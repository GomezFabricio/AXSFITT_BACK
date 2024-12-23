import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/mercadopago/crear-orden-qr', async (req, res) => {
    const { data, userId, externalPosId } = req.body;
    const accessToken = 'TEST-1273741858627121-110320-a07c982b52b13f4ba280d44e47b5fbe9-250056888';

    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
    };

    const url = `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${userId}/pos/${externalPosId.toString()}/qrs`;

    console.log('URL:', url);
    console.log('Data:', data);
    console.log('userId:', userId);
    console.log('externalPosId:', externalPosId);

    try {
        const response = await axios.post(url, data, config);
        res.json(response.data);
    } catch (error) {
        console.error('Error al crear el QR dinámico:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error al crear el QR dinámico', details: error.response ? error.response.data : error.message });
    }
});

export default router;