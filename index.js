import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import vendedoresRoutes from './routes/vendedores.routes.js';
import loginRoutes from './routes/login.routes.js';
import menuRoutes from './routes/menu.routes.js';
import usuariosRolesRoutes from './routes/usuarios_roles.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import inventarioRoutes from './routes/inventario.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import mercadopagoRoutes from './routes/mercadopago.routes.js';
import personasRoutes from './routes/personas.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Configuración de CORS
app.use(cors({
    origin: "https://axsfitt-front.vercel.app",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-selected-role-id'],
    credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());

// Rutas públicas (sin autenticación)
app.use(webhookRoutes);
app.use(authRoutes);
app.use(loginRoutes);

// Middleware de autenticación
app.use(authRoutes);

// Rutas protegidas
app.use(menuRoutes);
app.use(vendedoresRoutes);
app.use(usuariosRolesRoutes);
app.use(usuariosRoutes);
app.use(clientesRoutes);
app.use(ventasRoutes);
app.use(inventarioRoutes);
app.use(mercadopagoRoutes);
app.use(personasRoutes);

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente');
});

// Iniciar el servidor HTTP
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});