// index.js
import express from 'express';
import dotenv from 'dotenv';
import sql, { testConnection } from './db.js';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.json({
    message: 'API de Autoservicio de Hamburguesas',
    status: 'OK',
    timestamp: new Date()
  });
});

// Verificar la conexión a la base de datos
app.get('/db-test', async (req, res) => {
  try {
    // Testear la conexión
    const isConnected = await testConnection();
    
    if (isConnected) {
      // Si la conexión es exitosa, obtener información de las tablas
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `;
      
      res.json({
        status: 'OK',
        message: 'Conexión exitosa a la base de datos',
        tables: tables.map(t => t.table_name)
      });
    } else {
      res.status(500).json({
        status: 'ERROR',
        message: 'No se pudo conectar a la base de datos'
      });
    }
  } catch (error) {
    console.error('Error al verificar la conexión:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al verificar la conexión a la base de datos',
      error: error.message
    });
  }
});

// --- ENDPOINTS DE PEDIDOS ---

// 1. Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      ORDER BY fecha_hora DESC;
    `;
    
    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener pedidos',
      error: error.message
    });
  }
});

// 2. Obtener un pedido específico con detalles completos
app.get('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Obtener la información del pedido
    const pedido = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;
    
    if (pedido.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }
    
    // Obtener los productos del pedido con sus detalles
    const productos = await sql`
      SELECT pp.*, p.nombre, p.descripcion, tp.nombre
      FROM detalle_pedido pp
      JOIN productos p ON pp.id_producto = p.id_producto
	    JOIN tipo_producto tp ON p.id_tipo_producto = tp.id_tipo_producto
      WHERE pp.id_pedido = ${id};
    `;
    
    // Para cada producto, obtener los ingredientes personalizados
    const productosConIngredientes = await Promise.all(
      productos.map(async (producto) => {
        const ingredientes = await sql`
          SELECT ppi.*, i.nombre, i.descripcion, i.unidad_medida
          FROM extras ppi
          JOIN ingredientes i ON ppi.id_ingrediente = i.id_ingrediente
          WHERE ppi.id_detalle_pedido = ${producto.id_detalle_pedido};
        `;
        
        return {
          ...producto,
          ingredientes_personalizados: ingredientes
        };
      })
    );
    
    res.json({
      status: 'OK',
      data: {
        ...pedido[0],
        productos: productosConIngredientes
      }
    });
  } catch (error) {
    console.error(`Error al obtener detalle del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener detalle del pedido ${id}`,
      error: error.message
    });
  }
});

// 3. Crear un nuevo pedido (MODIFICADO)
app.post('/api/pedidos', async (req, res) => {
  const { productos, metodo_pago } = req.body;
  
  // Validaciones básicas
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe incluir al menos un producto en el pedido'
    });
  }
  
  if (!metodo_pago) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe especificar el método de pago'
    });
  }
  
  // Usar transacción para garantizar la integridad
  try {
    return await sql.begin(async (sql) => {
      let total = 0;
      
      // Calcular subtotales por cada producto individual
      for (const producto of productos) {
        // Verificar que el producto existe y está disponible
        const productoInfo = await sql`
          SELECT * FROM productos 
          WHERE id_producto = ${producto.id_producto} 
          AND disponible = TRUE;
        `;
        
        if (productoInfo.length === 0) {
          throw new Error(`El producto con ID ${producto.id_producto} no existe o no está disponible`);
        }
        
        // Calcular precio base (siempre 1 unidad por fila)
        let subtotal = productoInfo[0].precio_base;
        
        // Calcular precios de ingredientes extras
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            // Solo calcular para ingredientes extras
            if (ingrediente.es_extra) {
              const ingredienteInfo = await sql`
                SELECT * FROM ingredientes
                WHERE id_ingrediente = ${ingrediente.id_ingrediente};
              `;
              
              if (ingredienteInfo.length === 0) {
                throw new Error(`El ingrediente con ID ${ingrediente.id_ingrediente} no existe`);
              }
              
              // Agregar costo de ingrediente extra
              subtotal += ingredienteInfo[0].precio * ingrediente.cantidad;
            }
          }
        }
        
        // Actualizar subtotal del producto
        producto.subtotal = subtotal;
        total += subtotal;
      }
      
      // Crear nuevo pedido
      const fechaHora = Math.floor(Date.now() / 1000);
      
      const nuevoPedido = await sql`
        INSERT INTO pedidos (fecha_hora, idestadopedido, total, metodo_pago)
        VALUES (${fechaHora}, '1', ${total}, ${metodo_pago})
        RETURNING *;
      `;
      
      // Insertar productos del pedido (cada producto como fila individual)
      const productosCreados = [];
      for (const producto of productos) {
        const nuevoPedidoProducto = await sql`
          INSERT INTO pedidos_productos (id_pedido, id_producto, subtotal, notas)
          VALUES (
            ${nuevoPedido[0].id_pedido}, 
            ${producto.id_producto}, 
            ${producto.subtotal}, 
            ${producto.notas || null}
          )
          RETURNING *;
        `;
        
        productosCreados.push(nuevoPedidoProducto[0]);
        
        // Insertar ingredientes personalizados
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            await sql`
              INSERT INTO pedidos_productos_ingredientes (
                id_pedido_producto, 
                id_ingrediente, 
                cantidad, 
                es_extra
              )
              VALUES (
                ${nuevoPedidoProducto[0].id_pedido_producto}, 
                ${ingrediente.id_ingrediente}, 
                ${ingrediente.cantidad}, 
                ${ingrediente.es_extra}
              );
            `;
          }
        }
      }
      
      return res.status(201).json({
        status: 'OK',
        message: 'Pedido creado correctamente',
        data: {
          id_pedido: nuevoPedido[0].id_pedido,
          fecha_hora: nuevoPedido[0].fecha_hora,
          estado: nuevoPedido[0].estado,
          total: nuevoPedido[0].total,
          metodo_pago: nuevoPedido[0].metodo_pago,
          productos_creados: productosCreados.length
        }
      });
    });
  } catch (error) {
    console.error('Error al crear el pedido:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al crear el pedido',
      error: error.message
    });
  }
});

// 4. Actualizar el estado de un pedido
app.patch('/api/pedidos/:id/:idestadopedido', async (req, res) => {
  const { id } = req.params;
  const { idestadopedido } = req.params;
  
  // Validar estados válidos
  // const estadosValidos = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'];
  const estadosValidos = await sql `
  Select idestadopedido 
  from estado_pedido`
  console.log(estadosValidos)
  const idestadosValidos = estadosValidos.map(e => e.idestadopedido);
  console.log(idestadosValidos)

  const nombreEstadosValidos = await sql `
  Select nombre 
  from estado_pedido`
  const nombresValidos = nombreEstadosValidos.map(e => e.nombre);

  
  if (!idestadopedido || !estadosValidos.includes(idestadopedido)) {
    return res.status(400).json({
      status: 'ERROR',
      message: `Estado inválido. Debe ser uno de: ${nombresValidos.join(', ')}`
    });
  }
  
  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;
    
    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }
    
    // Actualizar el estado
    const pedidoActualizado = await sql`
      UPDATE pedidos
      SET idestadopedido = ${idestadopedido}
      WHERE id_pedido = ${id}
      RETURNING *;
    `;
    const nombreEstado = sql`
    select nombre
    from estado_pedido
    where idestadopedido = ${idestadopedido}`
    res.json({
      status: 'OK',
      message: `Estado del pedido actualizado a "${nombreEstado}"`,
      data: pedidoActualizado[0]
    });
  } catch (error) {
    console.error(`Error al actualizar estado del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al actualizar estado del pedido ${id}`,
      error: error.message
    });
  }
});

// 5. Eliminar un pedido
app.delete('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;
    
    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }
    
    // Usar transacción para eliminar en cascada
    return await sql.begin(async (sql) => {
      // 1. Primero, obtener todos los pedidos_productos
      const pedidosProductos = await sql`
        SELECT id_pedido_producto FROM pedidos_productos
        WHERE id_pedido = ${id};
      `;
      
      // 2. Eliminar ingredientes personalizados
      for (const pedidoProducto of pedidosProductos) {
        await sql`
          DELETE FROM pedidos_productos_ingredientes
          WHERE id_pedido_producto = ${pedidoProducto.id_pedido_producto};
        `;
      }
      
      // 3. Eliminar productos del pedido
      await sql`
        DELETE FROM pedidos_productos
        WHERE id_pedido = ${id};
      `;
      
      // 4. Eliminar el pedido
      await sql`
        DELETE FROM pedidos
        WHERE id_pedido = ${id};
      `;
      
      return res.json({
        status: 'OK',
        message: `Pedido con ID ${id} eliminado correctamente`
      });
    });
  } catch (error) {
    console.error(`Error al eliminar el pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al eliminar el pedido ${id}`,
      error: error.message
    });
  }
});

// 6. Obtener pedidos por estado
app.get('/api/pedidos/estado/:idestado', async (req, res) => {
  const { idestado } = req.params;
  console.log(idestado)
  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      WHERE idestadopedido = ${idestado}
      ORDER BY fecha_hora DESC;
    `;
    
    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    const nombreEstado = await sql`
    select nombre 
    from estado_pedido
    where idestadopedido = ${idestado}`
    console.error(`Error al obtener pedidos con id estado ${idestado}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener pedidos con id estado ${idestado}`,
      error: error.message
    });
  }
});

// 7. Obtener detalle de un producto específico en un pedido
app.get('/api/pedidos/:idPedido/productos/:idPedidoProducto', async (req, res) => {
  const { idPedido, idPedidoProducto } = req.params;
  
  try {
    // Verificar que el pedido y el producto existen
    const productoEnPedido = await sql`
      SELECT pp.*, p.nombre, p.descripcion, p.categoria
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      WHERE pp.id_pedido = ${idPedido} AND pp.id_pedido_producto = ${idPedidoProducto};
    `;
    
    if (productoEnPedido.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto ${idPedidoProducto} en el pedido ${idPedido}`
      });
    }
    
    // Obtener ingredientes personalizados del producto
    const ingredientes = await sql`
      SELECT ppi.*, i.nombre, i.descripcion, i.unidad_medida
      FROM pedidos_productos_ingredientes ppi
      JOIN ingredientes i ON ppi.id_ingrediente = i.id_ingrediente
      WHERE ppi.id_pedido_producto = ${idPedidoProducto};
    `;
    
    // Separar ingredientes extra y removidos
    const ingredientesExtra = ingredientes.filter(ing => ing.es_extra);
    const ingredientesRemovidos = ingredientes.filter(ing => !ing.es_extra);
    
    res.json({
      status: 'OK',
      data: {
        ...productoEnPedido[0],
        ingredientes_extra: ingredientesExtra,
        ingredientes_removidos: ingredientesRemovidos
      }
    });
  } catch (error) {
    console.error(`Error al obtener detalle del producto ${idPedidoProducto} en pedido ${idPedido}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener detalle del producto en el pedido`,
      error: error.message
    });
  }
});

// 8. Obtener estadísticas de pedidos (MODIFICADO)
app.get('/api/pedidos/estadisticas/resumen', async (req, res) => {
  try {
    // Total de pedidos
    const totalPedidos = await sql`
      SELECT COUNT(*) as total FROM pedidos;
    `;
    
    // Pedidos por estado
    const pedidosPorEstado = await sql`
      SELECT estado, COUNT(*) as cantidad 
      FROM pedidos 
      GROUP BY estado;
    `;
    
    // Productos más vendidos (MODIFICADO - contar filas en lugar de sumar cantidad)
    const productosMasVendidos = await sql`
      SELECT p.id_producto, p.nombre, p.categoria, 
             COUNT(pp.id_pedido_producto) as unidades_vendidas,
             SUM(pp.subtotal) as ventas_totales
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      GROUP BY p.id_producto, p.nombre, p.categoria
      ORDER BY unidades_vendidas DESC
      LIMIT 5;
    `;
    
    // Ingredientes extras más solicitados
    const ingredientesMasSolicitados = await sql`
      SELECT i.id_ingrediente, i.nombre, i.unidad_medida,
             SUM(ppi.cantidad) as veces_solicitado
      FROM pedidos_productos_ingredientes ppi
      JOIN ingredientes i ON ppi.id_ingrediente = i.id_ingrediente
      WHERE ppi.es_extra = TRUE
      GROUP BY i.id_ingrediente, i.nombre, i.unidad_medida
      ORDER BY veces_solicitado DESC
      LIMIT 5;
    `;
    
    // Ventas por método de pago
    const ventasPorMetodoPago = await sql`
      SELECT metodo_pago, COUNT(*) as cantidad_pedidos, SUM(total) as total_ventas
      FROM pedidos
      GROUP BY metodo_pago;
    `;

    // Nueva estadística: Productos con más personalizaciones
    const productosConMasPersonalizaciones = await sql`
      SELECT p.id_producto, p.nombre, p.categoria,
             COUNT(ppi.id_pedido_producto) as total_personalizaciones,
             COUNT(DISTINCT pp.id_pedido_producto) as productos_personalizados
      FROM productos p
      JOIN pedidos_productos pp ON p.id_producto = pp.id_producto
      JOIN pedidos_productos_ingredientes ppi ON pp.id_pedido_producto = ppi.id_pedido_producto
      GROUP BY p.id_producto, p.nombre, p.categoria
      ORDER BY total_personalizaciones DESC
      LIMIT 5;
    `;
    
    res.json({
      status: 'OK',
      data: {
        total_pedidos: totalPedidos[0].total,
        pedidos_por_estado: pedidosPorEstado,
        productos_mas_vendidos: productosMasVendidos,
        ingredientes_extras_mas_solicitados: ingredientesMasSolicitados,
        ventas_por_metodo_pago: ventasPorMetodoPago,
        productos_con_mas_personalizaciones: productosConMasPersonalizaciones
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de pedidos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener estadísticas de pedidos',
      error: error.message
    });
  }
});

// 9. Agregar productos a un pedido existente (MODIFICADO)
app.post('/api/pedidos/:id/productos', async (req, res) => {
  const { id } = req.params;
  const { productos } = req.body;
  
  // Validaciones básicas
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe incluir al menos un producto para agregar al pedido'
    });
  }
  
  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;
    
    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }
    
    // Verificar que el pedido no esté en estado "entregado" o "cancelado"
    if ([2,7].includes(pedidoExistente[0].idestadopedido)) {
        const nombreEstado = sql`
        select nombre from estado_pedido where idestadopedido = ${pedidoExistente[0].idestadopedido}`
      return res.status(400).json({
        status: 'ERROR',
        message: `No se pueden agregar productos a un pedido en estado "${nombreEstado}"`
      });
    }
    
    // Usar transacción
    return await sql.begin(async (sql) => {
      let totalAdicional = 0;
      const productosAgregados = [];
      
      // Calcular subtotales por cada producto individual
      for (const producto of productos) {
        // Verificar que el producto existe y está disponible
        const productoInfo = await sql`
          SELECT * FROM productos 
          WHERE id_producto = ${producto.id_producto} 
          AND disponible = TRUE;
        `;
        
        if (productoInfo.length === 0) {
          throw new Error(`El producto con ID ${producto.id_producto} no existe o no está disponible`);
        }
        
        // Calcular precio base (1 unidad por fila)
        let subtotal = productoInfo[0].precio_base;
        
        // Calcular precios de ingredientes extras
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            // Solo calcular para ingredientes extras
            if (ingrediente.es_extra) {
              const ingredienteInfo = await sql`
                SELECT * FROM ingredientes
                WHERE id_ingrediente = ${ingrediente.id_ingrediente};
              `;
              
              if (ingredienteInfo.length === 0) {
                throw new Error(`El ingrediente con ID ${ingrediente.id_ingrediente} no existe`);
              }
              
              // Agregar costo de ingrediente extra
              subtotal += ingredienteInfo[0].precio * ingrediente.cantidad;
            }
          }
        }
        
        totalAdicional += subtotal;
        
        // Insertar producto individual
        const nuevoPedidoProducto = await sql`
          INSERT INTO pedidos_productos (id_pedido, id_producto, subtotal, notas)
          VALUES (
            ${id}, 
            ${producto.id_producto}, 
            ${subtotal}, 
            ${producto.notas || null}
          )
          RETURNING *;
        `;
        
        productosAgregados.push(nuevoPedidoProducto[0]);
        
        // Insertar ingredientes personalizados
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            await sql`
              INSERT INTO pedidos_productos_ingredientes (
                id_pedido_producto, 
                id_ingrediente, 
                cantidad, 
                es_extra
              )
              VALUES (
                ${nuevoPedidoProducto[0].id_pedido_producto}, 
                ${ingrediente.id_ingrediente}, 
                ${ingrediente.cantidad}, 
                ${ingrediente.es_extra}
              );
            `;
          }
        }
      }
      
      // Actualizar el total del pedido
      const nuevoTotal = pedidoExistente[0].total + totalAdicional;
      
      const pedidoActualizado = await sql`
        UPDATE pedidos
        SET total = ${nuevoTotal}
        WHERE id_pedido = ${id}
        RETURNING *;
      `;
      
      return res.json({
        status: 'OK',
        message: 'Productos agregados correctamente al pedido',
        data: {
          pedido: pedidoActualizado[0],
          productos_agregados: productosAgregados,
          total_adicional: totalAdicional
        }
      });
    });
  } catch (error) {
    console.error(`Error al agregar productos al pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al agregar productos al pedido ${id}`,
      error: error.message
    });
  }
});

// 10. Filtrar pedidos por rango de fechas
app.get('/api/pedidos/filtro/fecha', async (req, res) => {
  const { desde, hasta } = req.query;
  
  // Validar fechas
  if (!desde || !hasta) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe proporcionar fechas de inicio y fin (desde, hasta) en formato timestamp'
    });
  }
  
  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      WHERE fecha_hora >= ${desde} AND fecha_hora <= ${hasta}
      ORDER BY fecha_hora DESC;
    `;
    
    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    console.error('Error al filtrar pedidos por fecha:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al filtrar pedidos por fecha',
      error: error.message
    });
  }
});

// 11. NUEVO ENDPOINT: Obtener resumen de productos en un pedido
app.get('/api/pedidos/:id/resumen', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;
    
    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }
    
    // Obtener resumen agrupado por producto
    const resumenProductos = await sql`
      SELECT p.id_producto, p.nombre, p.categoria, p.precio_base,
             COUNT(pp.id_pedido_producto) as cantidad_total,
             SUM(pp.subtotal) as subtotal_total,
             AVG(pp.subtotal) as precio_promedio_personalizado
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      WHERE pp.id_pedido = ${id}
      GROUP BY p.id_producto, p.nombre, p.categoria, p.precio_base
      ORDER BY cantidad_total DESC, p.nombre;
    `;
    
    // Obtener detalles individuales de cada producto
    const productosDetallados = await sql`
      SELECT pp.id_pedido_producto, pp.id_producto, p.nombre, 
             pp.subtotal, pp.notas,
             CASE 
               WHEN COUNT(ppi.id_ingrediente) > 0 THEN true 
               ELSE false 
             END as tiene_personalizaciones
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      LEFT JOIN pedidos_productos_ingredientes ppi ON pp.id_pedido_producto = ppi.id_pedido_producto
      WHERE pp.id_pedido = ${id}
      GROUP BY pp.id_pedido_producto, pp.id_producto, p.nombre, pp.subtotal, pp.notas
      ORDER BY p.nombre, pp.id_pedido_producto;
    `;
    
    res.json({
      status: 'OK',
      data: {
        pedido: pedidoExistente[0],
        resumen_por_producto: resumenProductos,
        productos_detallados: productosDetallados
      }
    });
  } catch (error) {
    console.error(`Error al obtener resumen del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener resumen del pedido ${id}`,
      error: error.message
    });
  }
});

// 12. NUEVO ENDPOINT: Eliminar un producto específico de un pedido
app.delete('/api/pedidos/:id/productos/:idProducto', async (req, res) => {
  const { id, idProducto } = req.params;
  
  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;
    
    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }
    
    // Verificar que el producto existe en el pedido
    const productoEnPedido = await sql`
      SELECT * FROM pedidos_productos
      WHERE id_pedido = ${id} AND id_pedido_producto = ${idProducto};
    `;
    
    if (productoEnPedido.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto ${idProducto} en el pedido ${id}`
      });
    }
    
    // Verificar que el pedido no esté entregado o cancelado
    if ([2,7].includes(pedidoExistente[0].idestadopedidp)) {
      return res.status(400).json({
        status: 'ERROR',
        message: `No se pueden eliminar productos de un pedido en estado "${pedidoExistente[0].idestadopedido}"`
      });
    }
    
    // Usar transacción para eliminar
    return await sql.begin(async (sql) => {
      const subtotalEliminado = productoEnPedido[0].subtotal;
      
      // Eliminar ingredientes personalizados del producto
      await sql`
        DELETE FROM pedidos_productos_ingredientes
        WHERE id_pedido_producto = ${idProducto};
      `;
      
      // Eliminar el producto del pedido
      await sql`
        DELETE FROM pedidos_productos
        WHERE id_pedido_producto = ${idProducto};
      `;
      
      // Actualizar el total del pedido
      const nuevoTotal = pedidoExistente[0].total - subtotalEliminado;
      
      const pedidoActualizado = await sql`
        UPDATE pedidos
        SET total = ${nuevoTotal}
        WHERE id_pedido = ${id}
        RETURNING *;
      `;
      
      return res.json({
        status: 'OK',
        message: 'Producto eliminado correctamente del pedido',
        data: {
          pedido: pedidoActualizado[0],
          subtotal_eliminado: subtotalEliminado
        }
      });
    });
  } catch (error) {
    console.error(`Error al eliminar producto ${idProducto} del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al eliminar producto del pedido`,
      error: error.message
    });
  }
});

// --- ENDPOINTS DE PRODUCTOS ---

// 13. Obtener todos los productos disponibles
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await sql`
      SELECT * FROM productos
      WHERE disponible = TRUE
      ORDER BY categoria, nombre;
    `;
    
    res.json({
      status: 'OK',
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

// 14. Obtener un producto específico con sus ingredientes base
app.get('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Obtener información del producto
    const producto = await sql`
      SELECT * FROM productos
      WHERE id_producto = ${id};
    `;
    
    if (producto.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto con ID ${id}`
      });
    }
    
    // Obtener ingredientes base del producto
    const ingredientesBase = await sql`
      SELECT pib.cantidad, i.id_ingrediente, i.nombre, i.descripcion, i.precio, i.unidad_medida
      FROM producto_predef pib
      JOIN ingredientes i ON pib.id_ingrediente = i.id_ingrediente
      WHERE pib.id_producto = ${id}
      ORDER BY i.nombre;
    `;
    
    res.json({
      status: 'OK',
      data: {
        ...producto[0],
        ingredientes_base: ingredientesBase
      }
    });
  } catch (error) {
    console.error(`Error al obtener producto ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener producto ${id}`,
      error: error.message
    });
  }
});

// 15. Obtener productos por categoría
app.get('/api/productos/categoria/:categoria', async (req, res) => {
  const { categoria } = req.params;
  
  try {
    const productos = await sql`
      SELECT * FROM productos
      WHERE categoria = ${categoria} AND disponible = TRUE
      ORDER BY nombre;
    `;
    
    res.json({
      status: 'OK',
      data: productos
    });
  } catch (error) {
    console.error(`Error al obtener productos de categoría ${categoria}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener productos de categoría ${categoria}`,
      error: error.message
    });
  }
});

// --- ENDPOINTS DE INGREDIENTES ---

// 16. Obtener todos los ingredientes disponibles
app.get('/api/ingredientes', async (req, res) => {
  try {
    const ingredientes = await sql`
      SELECT * FROM ingredientes
      WHERE stock > 0
      ORDER BY nombre;
    `;
    
    res.json({
      status: 'OK',
      data: ingredientes
    });
  } catch (error) {
    console.error('Error al obtener ingredientes:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener ingredientes',
      error: error.message
    });
  }
});

// 17. Obtener un ingrediente específico
app.get('/api/ingredientes/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const ingrediente = await sql`
      SELECT * FROM ingredientes
      WHERE id_ingrediente = ${id};
    `;
    
    if (ingrediente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el ingrediente con ID ${id}`
      });
    }
    
    res.json({
      status: 'OK',
      data: ingrediente[0]
    });
  } catch (error) {
    console.error(`Error al obtener ingrediente ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener ingrediente ${id}`,
      error: error.message
    });
  }
});

// --- ENDPOINTS ADICIONALES ---

// 18. Obtener todas las categorías de productos
app.get('/api/categorias', async (req, res) => {
  try {
    const categorias = await sql`
      SELECT DISTINCT categoria 
      FROM productos 
      WHERE disponible = TRUE
      ORDER BY categoria;
    `;
    
    res.json({
      status: 'OK',
      data: categorias.map(c => c.categoria)
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
});

// 19. Calcular precio estimado de un producto personalizado
app.post('/api/productos/:id/calcular-precio', async (req, res) => {
  const { id } = req.params;
  const { ingredientes_personalizados } = req.body;
  
  try {
    // Obtener información del producto base
    const producto = await sql`
      SELECT * FROM productos
      WHERE id_producto = ${id} AND disponible = TRUE;
    `;
    
    if (producto.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto con ID ${id}`
      });
    }
    
    let precioTotal = producto[0].precio_base;
    const detallePrecios = [{
      concepto: 'Precio base',
      precio: producto[0].precio_base
    }];
    
    // Calcular precios de ingredientes extras
    if (ingredientes_personalizados && ingredientes_personalizados.length > 0) {
      for (const ingrediente of ingredientes_personalizados) {
        if (ingrediente.es_extra) {
          const ingredienteInfo = await sql`
            SELECT * FROM ingredientes
            WHERE id_ingrediente = ${ingrediente.id_ingrediente};
          `;
          
          if (ingredienteInfo.length > 0) {
            const costoExtra = ingredienteInfo[0].precio * ingrediente.cantidad;
            precioTotal += costoExtra;
            detallePrecios.push({
              concepto: `Extra ${ingredienteInfo[0].nombre} (${ingrediente.cantidad} ${ingredienteInfo[0].unidad_medida})`,
              precio: costoExtra
            });
          }
        }
      }
    }
    
    res.json({
      status: 'OK',
      data: {
        producto: producto[0].nombre,
        precio_total: precioTotal,
        detalle_precios: detallePrecios
      }
    });
  } catch (error) {
    console.error(`Error al calcular precio del producto ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al calcular precio del producto`,
      error: error.message
    });
  }
});

// 20. Obtener historial de pedidos de un método de pago específico
app.get('/api/pedidos/metodo-pago/:metodo', async (req, res) => {
  const { metodo } = req.params;
  
  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      WHERE metodo_pago = ${metodo}
      ORDER BY fecha_hora DESC;
    `;
    
    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    console.error(`Error al obtener pedidos con método de pago ${metodo}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener pedidos con método de pago ${metodo}`,
      error: error.message
    });
  }
});

// ---ENDPOINTS DE CLIENTES ---
//21. Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const cliente = await sql`
    SELECT 
      c.idCliente,
      c.nombre,
      c.usuario,
      c.contrasena,
      c.email,
      c.telefono,
      c.puntos,
      t.nombre_tipocontribuyente AS tipo_contribuyente
    FROM 
      CLIENTE c
    JOIN 
      Tipo_Contribuyente t ON c.id_tipocontribuyente = t.id_tipocontribuyente
    `;
    
    res.json({
      status: 'OK',
      data: cliente
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
});
//22. Obtener todos los pedidos por cliente
app.get('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Obtener información del cliente
    const cliente = await sql`
      SELECT * FROM cliente
      WHERE idcliente = ${id};
    `;
    
    if (cliente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el cliente con ID: ${id}`
      });
    }
    
    // Obtener pedidos relacionado a cliente
    const pedidos = await sql`
      select * from pedidos 
      where idcliente = ${id}
    `;
    
    res.json({
      status: 'OK',
      data: {
        pedidos
      }
    });
  } catch (error) {
    console.error(`Error al obtener los pedidos de cliente: ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener los pedidos de cliente: ${id}`,
      error: error.message
    });
  }
});
// --- ENDPOINTS PERSONALIZADOS ---
//1. Traer los tipos de prodcutos
app.get('/productos/tipo_productos', async (req, res) => {
  try {
    const tipo_prodcuto = await sql`
      SELECT * FROM tipo_producto;
    `;
    
    res.json({
      status: 'OK',
      data: tipo_prodcuto
    });
  } catch (error) {
    console.error('Error al obtener tipo_prodcuto:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener tipo_prodcuto',
      error: error.message
    });
  }
});

//Traer los productos y sus ingredientes por su tipo

app.get('/productos/tipo_productos/:id_tipo_producto', async (req, res) => {
  try {
    const { id_tipo_producto } = req.params;
    const tipoProducto= await sql`
      SELECT * FROM tipo_producto
      WHERE id_tipo_producto = ${id_tipo_producto};
    `;
    if(tipoProducto.length===0){
      
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró tipo producto con id: ${id_tipo_producto}`
      });
    }else{

      const productos = await sql `
      SELECT * from productos
      WHERE id_tipo_producto = ${id_tipo_producto}
      `
      res.json({
      status: 'OK',
      data: productos
    });
    }
    
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});



// Iniciar el servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
  
  // Verificar la conexión a la base de datos al iniciar
  await testConnection();
  
  // Cerrar el proceso si no se puede conectar a la base de datos
  process.on('SIGINT', async () => {
    console.log('Cerrando conexiones a la base de datos...');
    await sql.end();
    process.exit(0);
  });
});

export default app;