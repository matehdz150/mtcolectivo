# 🚐 MT Colectivo – Sistema de Cotización y Gestión de Servicios

Plataforma interna para gestión de servicios de transporte turístico y cálculo automático de precios según destino, capacidad y duración.

Sistema diseñado para:

- Automatizar cotizaciones
- Resolver servicios dinámicamente
- Calcular precios sin intervención manual
- Gestionar tarifas por destino desde un panel administrativo

---

# 🏗 Arquitectura

## Backend
- FastAPI
- PostgreSQL
- SQLAlchemy ORM
- Pricing Engine dinámico
- Resolución automática de servicio por destino
- JWT Authentication
- Deploy en Railway

## Frontend
- React + Vite
- SCSS modular
- JWT Authentication
- Panel administrativo de servicios y precios
- Deploy en Vercel

---

# ⚙️ Funcionalidades Principales

## 🔥 Motor de Precios Inteligente

El sistema:

- Detecta automáticamente el servicio según el destino recibido desde Google Forms
- Calcula duración del viaje en horas
- Determina el periodo automáticamente:
  - `same_day`
  - `weekend`
  - `long_weekend`
- Asigna automáticamente la capacidad mínima necesaria
- Devuelve el precio correcto configurado en base de datos
- Incluye fallbacks fuertes para producción (nunca crashea)

---

## 📩 Integración con Google Forms

Los pedidos se generan automáticamente mediante:

### Endpoint público

```
POST /orders/form-submit
```

- Validación por `x-api-key`
- Resolución automática del servicio
- Cálculo dinámico del precio
- Creación automática de la orden

---

# 🗄 Modelo de Datos

## Service

```python
id: int
name: str
slug: str
active: bool
```

## ServicePrice

```python
id: int
service_id: int
capacidad: int
period: str
price_normal: float
price_discount: float
```

## Order

```python
id: int
service_id: int
nombre: str
fecha: str
duracion: float
capacidadu: int
subtotal: float
total: float
```

---

# 🚀 Instalación Local

## 🔧 Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

### Variables de entorno

Crear archivo `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost/dbname
FORM_API_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
```

---

## 🌱 Seed de Servicios

Para cargar destinos y precios iniciales:

```bash
python seed.py
```

Esto creará automáticamente servicios como:

- Mazatlán
- Puerto Vallarta
- Manzanillo
- Guanajuato
- Morelia
- Tepic
- Tapalpa
- Mazamitla
- Chapala
- Tequila

Con sus respectivos periodos:

- `same_day`
- `weekend`
- `long_weekend`

---

## 💻 Frontend

```bash
cd frontend

npm install
npm run dev
```

Variables de entorno:

```env
VITE_API_URL=http://localhost:8000
```

---

# 🔐 Seguridad

- JWT Authentication para rutas privadas
- API Key para endpoint público de Google Forms
- CORS configurado
- Rutas protegidas con `Depends(get_current_user)`
- Control de acceso en panel administrativo

---

# 🧠 Pricing Engine

Ubicado en:

```
app/services/pricing_engine.py
```

### Lógica:

1. Determinar periodo según duración
2. Obtener capacidades disponibles
3. Asignar capacidad mínima suficiente
4. Buscar precio exacto
5. Aplicar fallbacks
6. Retornar precio y capacidad asignada

Sistema preparado para producción:
- No lanza errores si falta configuración parcial
- Siempre retorna un precio válido si existe alguna configuración

---

# 🌍 Deploy

## Backend
Railway

## Frontend
Vercel

---

# 📌 Roadmap

- [ ] Panel de órdenes
- [ ] Dashboard con métricas
- [ ] Gestión de descuentos por temporada
- [ ] Edición y creación de servicios desde UI
- [ ] Generación automática de PDF
- [ ] Sistema de anticipos y liquidaciones
- [ ] Temporadas especiales (Semana Santa, Verano, etc.)

---

# 👨‍💻 Autor

Mateo Hernández Gutiérrez  
Cristian Miguel Diaz de Leon