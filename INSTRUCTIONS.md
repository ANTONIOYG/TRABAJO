# Guía de Creación de WorkLog Pro

Esta guía detalla los pasos, tecnologías y configuraciones necesarias para replicar la aplicación **WorkLog Pro**, un sistema integral de gestión de jornadas laborales, control horario y horas extras con base de datos exclusiva en **MySQL Externa**.

## 1. Tecnologías Utilizadas

### Frontend
- **React 19** con **Vite** como empaquetador ultrarrápido.
- **Tailwind CSS** para el diseño visual y modo oscuro moderno.
- **Lucide React** para iconografía moderna.
- **Recharts** para visualización interactiva de horas ordinarias y extraordinarias.
- **XLSX (SheetJS)** para generación de reportes en formato Excel nativo (.xlsx).
- **React Router Dom** para la navegación fluida SPA.

### Backend & Base de Datos
- **Node.js** con **Express**.
- **MySQL 5.7+ / 8.0+ / MariaDB / Cloud MySQL** a través de `mysql2/promise` con pool de conexiones y soporte SSL/TLS como fuente única y exclusiva de verdad.
- **Nodemailer** para el envío de reportes mensuales en Excel por email.
- **Twilio SDK** para el envío de resúmenes por WhatsApp.

## 2. Estructura del Proyecto

```text
/
├── server/
│   ├── server.ts        # Servidor Express y endpoints API REST (MySQL exclusivo)
│   └── mysql.ts         # Módulo de conexión, pool, creación de tablas y CRUD MySQL
├── src/
│   ├── components/      # Dashboard, Logs, Employees, Settings, QuickClockIn, etc.
│   ├── DB/              # Cliente centralizado DataService (MySQL externa directa)
│   ├── types/           # Definiciones de tipos TypeScript
│   ├── utils/           # Cálculos de jornada, formatos y exportación Excel
│   ├── App.tsx          # Componente principal y navegación
│   └── main.tsx         # Punto de entrada React
├── schema.sql           # Esquema SQL completo con tablas, índices y datos iniciales
├── package.json         # Dependencias y scripts
└── .env                 # Variables de entorno del sistema
```

## 3. Configuración del Entorno (`.env`)

```env
# Servidor Express
PORT=3001

# Base de Datos MySQL (Externa o Local)
MYSQL_ENABLED=true
MYSQL_HOST=localhost          # O la IP/Dominio de tu MySQL externo
MYSQL_PORT=3306
MYSQL_USER=root               # Usuario de la base de datos
MYSQL_PASSWORD= Avance25      # Contraseña del servidor MySQL
MYSQL_DATABASE=worklog_pro    # Nombre de la base de datos
MYSQL_SSL=false               # true para AWS RDS, PlanetScale, Railway o servidores cloud con SSL

# Correo Electrónico (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=antonioyg@gmail.com
SMTP_PASS=tu_contraseña_aplicacion
DEFAULT_RECIPIENT_EMAIL=antonioyg@gmail.com

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WHATSAPP_TO_NUMBER=+34600000000
```

## 4. Estructura de la Base de Datos MySQL (`schema.sql`)

El sistema incluye el script [`schema.sql`](file:///c:/Users/PAPA/Documents/trabajo/schema.sql) listo para ejecutar o importar en phpMyAdmin, cPanel, DBeaver o consola MySQL:

1. **`employees`**:
   - `id VARCHAR(50) PRIMARY KEY`
   - `name VARCHAR(150)`
   - `dni VARCHAR(30)`
   - `email VARCHAR(150)`
   - `phone VARCHAR(40)`
   - `role VARCHAR(100)`
   - `department VARCHAR(100)`
   - `hourly_rate DECIMAL(10,2)`
   - `overtime_rate DECIMAL(10,2)`
   - `active TINYINT(1)`
   - `avatar_color VARCHAR(100)`
   - `created_at VARCHAR(50)`

2. **`work_logs`**:
   - `id VARCHAR(50) PRIMARY KEY`
   - `employee_id VARCHAR(50) FOREIGN KEY -> employees(id) ON DELETE CASCADE`
   - `date VARCHAR(20)` (YYYY-MM-DD)
   - `entry_time VARCHAR(10)`
   - `exit_time VARCHAR(10)`
   - `break_hours DECIMAL(5,2)`
   - `total_hours DECIMAL(5,2)`
   - `regular_hours DECIMAL(5,2)`
   - `overtime_hours DECIMAL(5,2)`
   - `notes TEXT`
   - `status VARCHAR(30)`
   - `created_at VARCHAR(50)`

3. **`app_settings`**:
   - `id INT PRIMARY KEY DEFAULT 1`
   - `company_name VARCHAR(200)`
   - `default_break_hours DECIMAL(4,2)`
   - `standard_work_day_hours DECIMAL(4,2)`
   - `default_recipient_email VARCHAR(150)`
   - `smtp_host VARCHAR(150)`
   - `smtp_port INT`
   - `smtp_user VARCHAR(150)`
   - `smtp_configured TINYINT(1)`
   - `twilio_configured TINYINT(1)`

## 5. Endpoints de la API Backend

- `GET /api/data`: Obtiene todos los datos directamente desde MySQL externa.
- `POST /api/data`: Sincroniza y guarda todos los datos en MySQL externa.
- `GET /api/employees`: Listado de empleados desde MySQL.
- `POST /api/employees`: Crear o actualizar empleado en MySQL (INSERT ... ON DUPLICATE KEY UPDATE).
- `DELETE /api/employees/:id`: Eliminar empleado y sus registros asociados en MySQL.
- `GET /api/logs`: Listado de jornadas desde MySQL.
- `POST /api/logs`: Crear o actualizar registro de jornada en MySQL.
- `DELETE /api/logs/:id`: Eliminar registro de jornada en MySQL.
- `GET /api/mysql/status`: Consulta el estado actual de la conexión a MySQL.
- `POST /api/mysql/test`: Prueba de conexión a cualquier servidor MySQL externo en tiempo real.
- `POST /api/mysql/connect`: Actualiza credenciales, guarda en `.env` y conecta con migración opcional.
- `POST /api/mysql/migrate`: Migra datos previos de `database.json` hacia MySQL externa.
- `GET /api/export-sql`: Genera y descarga un dump SQL completo en vivo directamente desde MySQL externa.

## 6. Lógica de Datos en Frontend (`src/DB/db.ts`)

Centraliza todas las operaciones a través de la clase `DataService`:
- **Empleados:** `getEmployees()`, `saveEmployee()`, `updateEmployee()`, `deleteEmployee()`.
- **Jornadas:** `getLogs()`, `saveLog()`, `updateLog()`, `deleteLog()`.
- **Ajustes:** `getSettings()`, `updateSettings()`.
- **MySQL:** `getMySQLStatus()`, `testMySQLConnection()`, `connectMySQL()`, `migrateToMySQL()`.
- **Exportación SQL:** `exportBackupSql()`.

## 7. Reglas Clave de Negocio
- **Cálculo Automático de Jornada:**
  - Si la jornada bruta es **menor a 8 horas**, **NO** se descuenta la hora de descanso (descanso = 0).
  - A partir de **8 horas brutas**, se resta automáticamente 1 hora de descanso por defecto.
  - Horas ordinarias: hasta 8 horas netas.
  - Horas extraordinarias: todo el tiempo que supere las 8 horas netas de jornada.
  

- **Conexión Externa a MySQL:**
  - Configurable directamente desde la pestaña **Ajustes y MySQL** en la interfaz o a través del archivo `.env`.
  - Botón de "Probar Conexión" y botón "Guardar y Conectar MySQL".
  - Opción de migrar datos históricos locales hacia la base de datos MySQL externa.
- **Copias de Seguridad:**
  - Descarga bajo demanda de volcados SQL (`.sql`) generados en vivo desde MySQL externa.

## 8. Sistema pago de Horas Extra:
  - Días de Diario (L a V): La jornada ordinaria es de 8 horas. Todo lo que exceda de esas 8 horas cuenta como hora extra pagadera a 15€/hora.
  - Fin de Semana (S y D): El 100% del tiempo fichado cuenta como hora extra directamente, pagaderas a 17€/hora.
  - Días Festivos:los dias definidos segun convenio. La aplicación asume ese día con las reglas del fin de semana (todas las horas son extras a 17€/hora) sin importar el día de la semana que sea.

## 9. Pestaña los dias festivos:
  los dias festivos por convenio de la Madera en Madrid 2026:
  - 25/09/2026 es festivo.
  - 12/10/2026 es festivo.



