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


//--ENDPOINTS NESESARIOS PARA LA FUNCIONALIDAD DE PANTALLA DE PEDIDOS--

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

//2. Traer los productos por su tipo

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

// 3. Obtener un producto específico con sus ingredientes base
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
      SELECT pd.cantidad, i.id_ingrediente, i.nombre, i.descripcion, i.precio, i.unidad_medida
      FROM producto_predef pd
      JOIN ingredientes i ON pd.id_ingrediente = i.id_ingrediente
      WHERE pd.id_producto = ${id}
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



//4: API para crear pedido 

// Crear un nuevo pedido con la nueva estructura de BD
/*
Estructura del JSON de entrada:
{
  "id_cliente": 5, // Opcional - si no se proporciona, se usa cliente 1 (consumidor final)
  "id_tipo_pedido": 1, // Required
  "id_cupon": 3, // Opcional - si existe se aplica el descuento
  "productos": [
    {
      "id_producto": 1,
      "notas": "Sin cebolla",
      "ingredientes_personalizados": [
        {
          "id_ingrediente": 10,
          "cantidad": 2,
          "es_extra": true
        },
        {
          "id_ingrediente": 5,
          "cantidad": 1,
          "es_extra": false
        }
      ]
    },
    {
      "id_producto": 2,
      "ingredientes_personalizados": []
    }
  ],
  "pago": {
    "id_tipo_pago": 1,
    "descripcion": "Pago con tarjeta de crédito" // Opcional

  }
}
*/

app.post('/api/pedidos', async (req, res) => {
  const { 
    id_cliente, 
    id_tipo_pedido, 
    id_cupon, 
    productos, 
    pago 
  } = req.body;
  
  // Validaciones básicas
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe incluir al menos un producto en el pedido'
    });
  }
  
  if (!pago || !pago.id_tipo_pago) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe incluir información de pago válida'
    });
  }
  
  try {
    return await sql.begin(async (sql) => {
      let total = 0;
      let descuento = 0;
      const clienteId = id_cliente || 1; // Cliente por defecto: consumidor final
      const tipoPedidoId = id_tipo_pedido || 1; // Tipo de pedido por defecto
      
      // Validar que el cliente existe
      const clienteInfo = await sql`
        SELECT * FROM cliente WHERE id_cliente = ${clienteId};
      `;
      
      if (clienteInfo.length === 0) {
        throw new Error(`El cliente con ID ${clienteId} no existe`);
      }
      
      // Validar tipo de pedido
      const tipoPedidoInfo = await sql`
        SELECT * FROM tipo_pedido WHERE id_tipo_pedido = ${tipoPedidoId};
      `;
      
      if (tipoPedidoInfo.length === 0) {
        throw new Error(`El tipo de pedido con ID ${tipoPedidoId} no existe`);
      }
      
      // Validar tipo de pago
      const tipoPagoInfo = await sql`
        SELECT * FROM tipo_pago WHERE id_tipo_pago = ${pago.id_tipo_pago};
      `;
      
      if (tipoPagoInfo.length === 0) {
        throw new Error(`El tipo de pago con ID ${pago.id_tipo_pago} no existe`);
      }
      
      // Validar cupón si existe
      let cuponInfo = null;
      if (id_cupon) {
        const cuponResult = await sql`
          SELECT c.*, cp.porcentaje_Descuento 
          FROM cupon c
          JOIN cupon_Predef cp ON c.id_Cupon_Predef = cp.id_Cupon_Predefinido
          WHERE c.id_Cupon = ${id_cupon} 
          AND c.fecha_Vencimiento > ${Math.floor(Date.now() / 1000)};
        `;
        
        
        if (cuponResult.length === 0) {
          throw new Error(`El cupón con ID ${id_cupon} no existe o está vencido`);
        }
        
        cuponInfo = cuponResult[0];
      }
      
      // Paso 1: Calcular demanda total de ingredientes
      const demandaIngredientes = new Map(); // Map<id_ingrediente, cantidad_total_necesaria>
      
      // Paso 2: Procesar cada producto para calcular demanda
      const productosDetalle = [];
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
        
        // Calcular precio base
        let subtotal = parseFloat(productoInfo[0].precio_base);
        
        // Obtener ingredientes base del producto
        const ingredientesBase = await sql`
          SELECT pp.*, i.nombre, i.stock, i.precio
          FROM producto_predef pp
          JOIN ingredientes i ON pp.id_ingrediente = i.id_ingrediente
          WHERE pp.id_producto = ${producto.id_producto};
        `;
        
        // Acumular demanda de ingredientes base
        for (const ingredienteBase of ingredientesBase) {
          const cantidadActual = demandaIngredientes.get(ingredienteBase.id_ingrediente) || 0;
          demandaIngredientes.set(
            ingredienteBase.id_ingrediente, 
            cantidadActual + parseFloat(ingredienteBase.cantidad)
          );
        }
        
        // Procesar ingredientes personalizados/extras
        const ingredientesExtras = [];
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            // Validar que el ingrediente existe
            const ingredienteInfo = await sql`
              SELECT * FROM ingredientes
              WHERE id_ingrediente = ${ingrediente.id_ingrediente};
            `;
            
            if (ingredienteInfo.length === 0) {
              throw new Error(`El ingrediente con ID ${ingrediente.id_ingrediente} no existe`);
            }
            
            // Acumular demanda de ingredientes extras/personalizados
            const cantidadActual = demandaIngredientes.get(ingrediente.id_ingrediente) || 0;
            if(ingrediente.es_extra){
                demandaIngredientes.set(
                ingrediente.id_ingrediente, 
                cantidadActual + parseFloat(ingrediente.cantidad)
            );
            }else{
                demandaIngredientes.set(
                ingrediente.id_ingrediente, 
                cantidadActual - parseFloat(ingrediente.cantidad)
            );
            }
            
            
            // Solo calcular costo para ingredientes extras
            if (ingrediente.es_extra) {
              subtotal += parseFloat(ingredienteInfo[0].precio) * parseFloat(ingrediente.cantidad);
            }
            
            ingredientesExtras.push({
              ...ingrediente,
              precio: parseFloat(ingredienteInfo[0].precio),
              nombre: ingredienteInfo[0].nombre
            });
          }
        }
        
        productosDetalle.push({
          ...producto,
          subtotal: subtotal,
          ingredientes_extras: ingredientesExtras,
          ingredientes_base: ingredientesBase,
          producto_info: productoInfo[0]
        });
        
        total += subtotal;
      }
      
      // Paso 3: Validar stock total antes de proceder
      for (const [idIngrediente, cantidadNecesaria] of demandaIngredientes) {
        const stockActual = await sql`
          SELECT nombre, stock, unidad_medida
          FROM ingredientes 
          WHERE id_ingrediente = ${idIngrediente};
        `;
        
        if (stockActual.length === 0) {
          throw new Error(`Error interno: Ingrediente con ID ${idIngrediente} no encontrado`);
        }
        
        if (stockActual[0].stock < cantidadNecesaria) {
          throw new Error(
            `Stock insuficiente para ${stockActual[0].nombre}. ` +
            `Necesario: ${cantidadNecesaria} ${stockActual[0].unidad_medida}, ` +
            `Disponible: ${stockActual[0].stock} ${stockActual[0].unidad_medida}`
          )
        }
        
        console.log(`✓ Stock OK para ${stockActual[0].nombre}: ${cantidadNecesaria}/${stockActual[0].stock} ${stockActual[0].unidad_medida}`);
      }
      // Aplicar descuento del cupón si existe
      if (cuponInfo) {
        descuento = total * (parseFloat(cuponInfo.porcentaje_descuento) / 100);
        total = total - descuento;
      }
      
      // Crear el pedido
      const fechaHora = Math.floor(Date.now() / 1000);
      
      const nuevoPedido = await sql`
        INSERT INTO pedidos (
          fecha_hora, 
          total, 
          id_cliente, 
          id_estado_pedido, 
          id_tipo_pedido,
          id_Cupon
        )
        VALUES (
          ${fechaHora}, 
          ${total}, 
          ${clienteId}, 
          1, 
          ${tipoPedidoId},
          ${id_cupon || null}
        )
        RETURNING *;
      `;
      
      const idPedido = nuevoPedido[0].id_pedido;
      
      // Crear el pago asociado al pedido
      const nuevoPago = await sql`
        INSERT INTO pago (
          id_pedido,
          id_tipo_pago,
          monto,
          descripcion
        )
        VALUES (
          ${idPedido},
          ${pago.id_tipo_pago},
          ${total},
          ${pago.descripcion || null}
        )
        RETURNING *;
      `;
      
      // Insertar detalles del pedido
      const detallesCreados = [];
      for (const producto of productosDetalle) {
        const nuevoDetalle = await sql`
          INSERT INTO detalle_pedido (
            id_pedido, 
            id_producto, 
            subtotal, 
            notas
          )
          VALUES (
            ${idPedido}, 
            ${producto.id_producto}, 
            ${producto.subtotal}, 
            ${producto.notas || null}
          )
          RETURNING *;
        `;
        
        const idDetalle = nuevoDetalle[0].id_detalle_pedido;
        detallesCreados.push(nuevoDetalle[0]);
        
        // Actualizar stock de ingredientes base del producto
        for (const ingredienteBase of producto.ingredientes_base) {
          console.log(ingredienteBase)
          console.log(ingredienteBase.cantidad)
          await sql`
            UPDATE ingredientes 
            SET stock = stock - ${ingredienteBase.cantidad}
            WHERE id_ingrediente = ${ingredienteBase.id_ingrediente};
          `;
        }
        
        // Insertar ingredientes personalizados/extras
        if (producto.ingredientes_extras && producto.ingredientes_extras.length > 0) {
          for (const ingrediente of producto.ingredientes_extras) {
            await sql`
              INSERT INTO extras (
                id_detalle_pedido, 
                id_ingrediente, 
                cantidad, 
                es_extra
              )
              VALUES (
                ${idDetalle}, 
                ${ingrediente.id_ingrediente}, 
                ${ingrediente.cantidad}, 
                ${ingrediente.es_extra}
              );
            `;
            
            // Actualizar stock del ingrediente
            await sql`
              UPDATE ingredientes 
              SET stock = stock - ${ingrediente.cantidad}
              WHERE id_ingrediente = ${ingrediente.id_ingrediente};
            `;
          }
        }
      }
      
      // Eliminar cupón si se usó (un solo uso)
      if (id_cupon) {
        await sql`
          DELETE FROM cupon WHERE id_Cupon = ${id_cupon};
        `;
      }
      
      // Otorgar puntos al cliente (10% del total, solo si no se usó cupón)
      if (!id_cupon && clienteId !== 1) { // No otorgar puntos al consumidor final
        const puntosGanados = Math.floor(total * 0.1);
        await sql`
          UPDATE cliente 
          SET puntos = puntos + ${puntosGanados}
          WHERE id_cliente = ${clienteId};
        `;
      }
      
      return res.status(201).json({
        status: 'OK',
        message: 'Pedido creado correctamente',
        data: {
          pedido: {
            id_pedido: idPedido,
            fecha_hora: fechaHora,
            total: total,
            descuento_aplicado: descuento,
            id_cliente: clienteId,
            id_tipo_pedido: tipoPedidoId,
            cupon_usado: id_cupon || null,
            puntos_otorgados: (!id_cupon && clienteId !== 1) ? Math.floor(total * 0.1) : 0
          },
          pago: {
            id_pago: nuevoPago[0].id_pago,
            monto: total,
            tipo_pago: pago.id_tipo_pago
          },
          productos_procesados: detallesCreados.length,
          detalles: detallesCreados
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

//MERCADO PAGO ENDPONITS

app.post('/mp/link', async (req, res) => {


})

app.post('/mp/hook', async (req, res) => {


})

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