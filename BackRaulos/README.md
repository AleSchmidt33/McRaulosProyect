# 🍔 API de Autoservicio de Hamburguesas

Una API RESTful completa para un sistema de autoservicio de hamburguesas, construida con Node.js, Express y PostgreSQL.

## 📋 Tabla de Contenidos

* [Características](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-caracter%C3%ADsticas)
* [Tecnologías Utilizadas](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-tecnolog%C3%ADas-utilizadas)
* [Instalación](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-instalaci%C3%B3n)
* [Configuración](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-configuraci%C3%B3n)
* [Uso](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-uso)
* [Endpoints de la API](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-endpoints-de-la-api)
* [Estructura de la Base de Datos](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-estructura-de-la-base-de-datos)
* [Ejemplos de Uso](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-ejemplos-de-uso)
* [Despliegue](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-despliegue)
* [Contribución](https://claude.ai/chat/58ba3e3c-a0ce-4ec2-95eb-6580ba3f8904#-contribuci%C3%B3n)

## ✨ Características

* **Gestión completa de pedidos** - Crear, consultar, modificar y eliminar pedidos
* **Personalización de productos** - Agregar ingredientes extras y personalizar hamburguesas
* **Sistema de inventario** - Control de productos e ingredientes disponibles
* **Estados de pedido** - Seguimiento desde pendiente hasta entregado
* **Estadísticas y reportes** - Análisis de ventas y productos más populares
* **Transacciones seguras** - Operaciones atómicas en base de datos
* **API RESTful** - Endpoints bien estructurados siguiendo estándares REST

## 🛠 Tecnologías Utilizadas

* **Backend** : Node.js con Express.js
* **Base de Datos** : PostgreSQL
* **ORM** : Postgres.js
* **Autenticación** : Variables de entorno con dotenv
* **Deployment** : Render.com

## 📦 Instalación

1. **Clona el repositorio**

```bash
git clone <url-del-repositorio>
cd autoservicio-hamburguesas-api
```

2. **Instala las dependencias**

```bash
npm install
```

3. **Configura las variables de entorno**

```bash
cp .env.example .env
```

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Puerto del servidor
PORT=3000

# Cadena de conexión a PostgreSQL
DATABASE_URL=postgresql://usuario:password@host:puerto/nombre_bd

# Entorno de desarrollo
NODE_ENV=development
```

### Estructura de la Base de Datos

La API requiere las siguientes tablas:

* `productos` - Catálogo de hamburguesas y productos
* `ingredientes` - Ingredientes disponibles
* `productos_ingredientes_base` - Ingredientes base de cada producto
* `pedidos` - Información principal de pedidos
* `pedidos_productos` - Productos incluidos en cada pedido
* `pedidos_productos_ingredientes` - Personalizaciones de ingredientes

## 🚀 Uso

1. **Inicia el servidor en desarrollo**

```bash
npm run dev
```

2. **Inicia el servidor en producción**

```bash
npm start
```

3. **Verifica que funciona**

```bash
curl http://localhost:3000/
```

## 📚 Endpoints de la API

### 🏠 Generales

| Método | Endpoint     | Descripción             |
| ------- | ------------ | ------------------------ |
| GET     | `/`        | Estado de la API         |
| GET     | `/db-test` | Verificar conexión a BD |

### 📋 Pedidos

| Método | Endpoint                                   | Descripción                            |
| ------- | ------------------------------------------ | --------------------------------------- |
| GET     | `/api/pedidos`                           | Obtener todos los pedidos               |
| GET     | `/api/pedidos/:id`                       | Obtener pedido específico con detalles |
| POST    | `/api/pedidos`                           | Crear nuevo pedido                      |
| PATCH   | `/api/pedidos/:id/estado`                | Actualizar estado del pedido            |
| DELETE  | `/api/pedidos/:id`                       | Eliminar pedido                         |
| GET     | `/api/pedidos/estado/:estado`            | Filtrar pedidos por estado              |
| GET     | `/api/pedidos/:id/resumen`               | Resumen de productos en pedido          |
| POST    | `/api/pedidos/:id/productos`             | Agregar productos a pedido existente    |
| DELETE  | `/api/pedidos/:id/productos/:idProducto` | Eliminar producto del pedido            |
| GET     | `/api/pedidos/filtro/fecha`              | Filtrar pedidos por rango de fechas     |
| GET     | `/api/pedidos/estadisticas/resumen`      | Estadísticas generales                 |
| GET     | `/api/pedidos/metodo-pago/:metodo`       | Pedidos por método de pago             |

### 🍔 Productos

| Método | Endpoint                                | Descripción                                  |
| ------- | --------------------------------------- | --------------------------------------------- |
| GET     | `/api/productos`                      | Obtener todos los productos disponibles       |
| GET     | `/api/productos/:id`                  | Obtener producto específico con ingredientes |
| GET     | `/api/productos/categoria/:categoria` | Productos por categoría                      |
| POST    | `/api/productos/:id/calcular-precio`  | Calcular precio con personalizaciones         |

### 🥬 Ingredientes

| Método | Endpoint                  | Descripción                               |
| ------- | ------------------------- | ------------------------------------------ |
| GET     | `/api/ingredientes`     | Obtener todos los ingredientes disponibles |
| GET     | `/api/ingredientes/:id` | Obtener ingrediente específico            |

### 📊 Utilidades

| Método | Endpoint            | Descripción                               |
| ------- | ------------------- | ------------------------------------------ |
| GET     | `/api/categorias` | Obtener todas las categorías de productos |

## 💡 Ejemplos de Uso

### Crear un pedido nuevo

```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "productos": [
      {
        "id_producto": 1,
        "notas": "Sin cebolla",
        "ingredientes_personalizados": [
          {
            "id_ingrediente": 5,
            "cantidad": 2,
            "es_extra": true
          }
        ]
      }
    ],
    "metodo_pago": "tarjeta"
  }'
```

### Obtener estadísticas

```bash
curl http://localhost:3000/api/pedidos/estadisticas/resumen
```

### Actualizar estado de pedido

```bash
curl -X PATCH http://localhost:3000/api/pedidos/1/estado \
  -H "Content-Type: application/json" \
  -d '{"estado": "en_preparacion"}'
```

## 🏗 Estructura del Proyecto

```
proyecto/
├── index.js              # Servidor principal y rutas
├── db.js                 # Configuración de base de datos
├── .env                  # Variables de entorno
├── package.json          # Dependencias y scripts
└── README.md            # Documentación
```

## 📊 Estados de Pedidos

Los pedidos pueden tener los siguientes estados:

* `pendiente` - Pedido recién creado
* `en_preparacion` - Pedido siendo preparado
* `listo` - Pedido listo para entrega
* `entregado` - Pedido entregado al cliente
* `cancelado` - Pedido cancelado

## 🔒 Características de Seguridad

* **Transacciones de BD** : Operaciones críticas usan transacciones
* **Validación de datos** : Validación de entrada en todos los endpoints
* **Manejo de errores** : Respuestas de error consistentes y seguras
* **Conexión SSL** : Conexiones seguras a la base de datos

## 🚀 Despliegue

### Render.com

1. Conecta tu repositorio a Render
2. Configura las variables de entorno
3. El servicio se desplegará automáticamente

### Variables de entorno requeridas:

* `DATABASE_URL`: Cadena de conexión a PostgreSQL
* `NODE_ENV`: production
* `PORT`: Se configura automáticamente en Render

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Respuestas de la API

Todas las respuestas siguen este formato estándar:

### Respuesta exitosa

```json
{
  "status": "OK",
  "data": { ... },
  "message": "Mensaje descriptivo (opcional)"
}
```

### Respuesta de error

```json
{
  "status": "ERROR",
  "message": "Descripción del error",
  "error": "Detalles técnicos (opcional)"
}
```

## 📋 Códigos de Estado HTTP

* `200` - OK: Operación exitosa
* `201` - Created: Recurso creado exitosamente
* `400` - Bad Request: Datos de entrada inválidos
* `404` - Not Found: Recurso no encontrado
* `500` - Internal Server Error: Error del servidor

## 🔧 Scripts Disponibles

```bash
# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start

# Verificar sintaxis
npm run lint

# Ejecutar tests (si están configurados)
npm test
```

---
