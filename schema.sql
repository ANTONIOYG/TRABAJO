-- ==============================================================================
-- WORKLOG PRO - ESQUEMA DE BASE DE DATOS MYSQL EXTERNA / LOCAL
-- Generado para: WorkLog Pro Soluciones S.L.
-- Compatible con: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, phpMyAdmin, AWS RDS, Cloud
-- ==============================================================================
-- 1. Crear Base de Datos (opcional si ya existe en el hosting externo)
CREATE DATABASE IF NOT EXISTS `worklog_pro` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `worklog_pro`;
-- Desactivar temporalmente verificación de claves foráneas para recreación segura
SET FOREIGN_KEY_CHECKS = 0;
-- ==============================================================================
-- 2. TABLA DE EMPLEADOS (`employees`)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `employees` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'ID único (ej: emp-1787779495510)',
  `name` VARCHAR(150) NOT NULL COMMENT 'Nombre y apellidos completos',
  `dni` VARCHAR(30) NOT NULL COMMENT 'DNI / NIE / CIF del empleado',
  `email` VARCHAR(150) NULL COMMENT 'Correo electrónico del empleado',
  `phone` VARCHAR(40) NULL COMMENT 'Teléfono de contacto con prefijo',
  `role` VARCHAR(100) NOT NULL DEFAULT 'OPERARIO' COMMENT 'Puesto o especialidad laboral',
  `department` VARCHAR(100) NULL DEFAULT 'General' COMMENT 'Departamento o sección de trabajo',
  `hourly_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tarifa horaria base en euros',
  `overtime_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tarifa horaria extra en euros',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Activo, 0 = Inactivo / Baja',
  `avatar_color` VARCHAR(100) NULL DEFAULT 'from-blue-500 to-indigo-600' COMMENT 'Gradiente de color avatar',
  `created_at` VARCHAR(50) NOT NULL COMMENT 'Fecha y hora de alta en formato local (YYYY-MM-DD HH:mm:ss)',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_employees_dni` (`dni`),
  INDEX `idx_employees_active` (`active`),
  INDEX `idx_employees_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ==============================================================================
-- 3. TABLA DE REGISTROS DE JORNADA (`work_logs`)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `work_logs` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'ID único de fichaje (ej: log-1788364712815)',
  `employee_id` VARCHAR(50) NOT NULL COMMENT 'ID del empleado asociado',
  `date` VARCHAR(20) NOT NULL COMMENT 'Fecha del registro YYYY-MM-DD',
  `entry_time` VARCHAR(10) NOT NULL COMMENT 'Hora de entrada HH:mm',
  `exit_time` VARCHAR(10) NOT NULL COMMENT 'Hora de salida HH:mm',
  `break_hours` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Horas de descanso descontadas',
  `total_hours` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Horas totales computadas (brutas - descanso)',
  `regular_hours` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Horas ordinarias (máx. 8h según jornada)',
  `overtime_hours` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Horas extras (a partir de 8h)',
  `notes` TEXT NULL COMMENT 'Observaciones del fichaje (ej: TALLER, OBRA)',
  `status` VARCHAR(30) NOT NULL DEFAULT 'completed' COMMENT 'Estado: completed | in-progress',
  `created_at` VARCHAR(50) NOT NULL COMMENT 'Fecha de registro en formato local (YYYY-MM-DD HH:mm:ss)',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_logs_date` (`date`),
  INDEX `idx_logs_employee` (`employee_id`),
  INDEX `idx_logs_status` (`status`),
  CONSTRAINT `fk_work_logs_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ==============================================================================
-- 4. TABLA DE AJUSTES DEL SISTEMA (`app_settings`)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT NOT NULL PRIMARY KEY DEFAULT 1,
  `company_name` VARCHAR(200) NOT NULL DEFAULT 'WorkLog Pro Soluciones S.L.',
  `default_break_hours` DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
  `standard_work_day_hours` DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
  `default_recipient_email` VARCHAR(150) NOT NULL DEFAULT 'antonioyg@gmail.com',
  `smtp_host` VARCHAR(150) NULL DEFAULT 'smtp.gmail.com',
  `smtp_port` INT NOT NULL DEFAULT 587,
  `smtp_user` VARCHAR(150) NULL DEFAULT 'antonioyg@gmail.com',
  `smtp_configured` TINYINT(1) NOT NULL DEFAULT 1,
  `twilio_configured` TINYINT(1) NOT NULL DEFAULT 0,
  `version` VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  `last_updated` VARCHAR(50) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ==============================================================================
-- 5. DATOS INICIALES / SEED (INSERT IGNORE)
-- ==============================================================================
-- Empleado Inicial
INSERT IGNORE INTO `employees` (
    `id`,
    `name`,
    `dni`,
    `email`,
    `phone`,
    `role`,
    `department`,
    `hourly_rate`,
    `overtime_rate`,
    `active`,
    `avatar_color`,
    `created_at`
  )
VALUES (
    'emp-1787779495510',
    'ANTONIO YAGÜE GAÑAN',
    '07502126D',
    'antonioyg@gmail.com',
    '+34640848913',
    'CARPINTERO',
    'Tecnología',
    0.00,
    0.00,
    1,
    'from-amber-500 to-orange-600',
    '2026-08-26T21:24:55.510Z'
  );
-- Registros de Jornada Iniciales
INSERT IGNORE INTO `work_logs` (
    `id`,
    `employee_id`,
    `date`,
    `entry_time`,
    `exit_time`,
    `break_hours`,
    `total_hours`,
    `regular_hours`,
    `overtime_hours`,
    `notes`,
    `status`,
    `created_at`
  )
VALUES (
    'log-1788364712815',
    'emp-1787779495510',
    '2026-09-02',
    '07:00',
    '14:00',
    0.00,
    7.00,
    7.00,
    0.00,
    'TALLER',
    'completed',
    '2026-09-02 15:58'
  ),
  (
    'log-1788286657107',
    'emp-1787779495510',
    '2026-09-01',
    '07:00',
    '14:00',
    0.00,
    7.00,
    7.00,
    0.00,
    'TALLER',
    'completed',
    '2026-09-01 18:17'
  );
-- Configuración por defecto
INSERT IGNORE INTO `app_settings` (
    `id`,
    `company_name`,
    `default_break_hours`,
    `standard_work_day_hours`,
    `default_recipient_email`,
    `smtp_host`,
    `smtp_port`,
    `smtp_user`,
    `smtp_configured`,
    `twilio_configured`,
    `version`,
    `last_updated`
  )
VALUES (
    1,
    'WorkLog Pro Soluciones S.L.',
    1.00,
    8.00,
    'antonioyg@gmail.com',
    'smtp.gmail.com',
    587,
    'antonioyg@gmail.com',
    1,
    0,
    '1.0.0',
    '2026-09-02 15:59:11'
  );
SET FOREIGN_KEY_CHECKS = 1;