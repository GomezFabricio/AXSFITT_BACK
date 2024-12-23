import { Router } from 'express';
import { 
    inventarioList, 
    marcasList, 
    tiposProductosList, 
    productosList, 
    agregarTipoProducto, 
    agregarMarca, 
    agregarProducto,
    agregarInventario,
    obtenerInventarioPorId,
    eliminarInventario,
    eliminarMarca,
    eliminarTipoProducto,
    eliminarProducto,
    editarInventario,
    editarProducto,
    editarMarca,
    editarTipoProducto,
    verInventariosInactivos,
    verProductosInactivos,
    verMarcasInactivas,
    verTiposProductosInactivos,
    reactivarInventario,
    reactivarProducto,
    reactivarMarca,
    reactivarTipoProducto
} from '../controllers/inventario.controller.js';

const router = Router();

router.get('/inventario/inventario-list', inventarioList);
router.get('/inventario/marcas-list', marcasList);
router.get('/inventario/tipos-productos-list', tiposProductosList);
router.get('/inventario/productos-list', productosList);

router.post('/inventario/agregar-tipo-producto', agregarTipoProducto); 
router.post('/inventario/agregar-marca', agregarMarca); 
router.post('/inventario/agregar-producto', agregarProducto); 
router.post('/inventario/agregar-inventario', agregarInventario);
router.get('/inventario/obtener-inventario/:id', obtenerInventarioPorId);

router.delete('/inventario/eliminar-inventario/:id', eliminarInventario); 
router.delete('/inventario/eliminar-marca/:id', eliminarMarca);
router.delete('/inventario/eliminar-tipo-producto/:id', eliminarTipoProducto);
router.delete('/inventario/eliminar-producto/:id', eliminarProducto);

router.put('/inventario/editar-inventario/:id', editarInventario);
router.put('/inventario/editar-producto/:id', editarProducto);
router.put('/inventario/editar-marca/:id', editarMarca);
router.put('/inventario/editar-tipo-producto/:id', editarTipoProducto);

// Nuevas rutas para ver inactivos
router.get('/inventario/inventarios-inactivos', verInventariosInactivos);
router.get('/inventario/productos-inactivos', verProductosInactivos);
router.get('/inventario/marcas-inactivas', verMarcasInactivas);
router.get('/inventario/tipos-productos-inactivos', verTiposProductosInactivos);

// Nuevas rutas para reactivar
router.put('/inventario/reactivar-inventario/:id', reactivarInventario);
router.put('/inventario/reactivar-producto/:id', reactivarProducto);
router.put('/inventario/reactivar-marca/:id', reactivarMarca);
router.put('/inventario/reactivar-tipo-producto/:id', reactivarTipoProducto);

export default router;