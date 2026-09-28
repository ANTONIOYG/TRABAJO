CREATE DATABASE worklog_pro;
use worklog_pro;


CREATE TABLE IF NOT EXISTS `employees` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `dni` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150),
  `phone` VARCHAR(40),
  `role` VARCHAR(100),
  `department` VARCHAR(100),
  `hourly_rate` DECIMAL(10,2),
  `overtime_rate` DECIMAL(10,2),
  `active` TINYINT(1),
  `avatar_color` VARCHAR(100),
  `created_at` VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS `work_logs` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(50) NOT NULL,
  `date` VARCHAR(20) NOT NULL,
  `entry_time` VARCHAR(10) NOT NULL,
  `exit_time` VARCHAR(10) NOT NULL,
  `break_hours` DECIMAL(5,2),
  `total_hours` DECIMAL(5,2),
  `regular_hours` DECIMAL(5,2),
  `overtime_hours` DECIMAL(5,2),
  `notes` TEXT,
  `status` VARCHAR(30),
  `created_at` VARCHAR(20),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);

-- Inserción de Empleados
INSERT INTO `employees` (`id`, `name`, `dni`, `email`, `phone`, `role`, `department`, `hourly_rate`, `overtime_rate`, `active`, `avatar_color`, `created_at`) VALUES ('emp-1787779495510', 'ANTONIO YAGÜE GAÑAN', '07502126D', 'antonioyg@gmail.com', '+34640848913', 'CARPINTERO', 'Tecnología', 0, 0, 1, 'from-amber-500 to-orange-600', '2026-08-26 23:24:55');

-- Inserción de Registros de Jornada
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788982865052', 'emp-1787779495510', '2026-09-10', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-09 21:41:05');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788975857945', 'emp-1787779495510', '2026-09-09', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-09 19:44:17');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788975834918', 'emp-1787779495510', '2026-09-08', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-09 19:43:54');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788975805619', 'emp-1787779495510', '2026-09-07', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-09 19:43:25');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788975776639', 'emp-1787779495510', '2026-09-04', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-09 19:42:56');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788975739796', 'emp-1787779495510', '2026-09-03', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-09 19:42:19');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788364712815', 'emp-1787779495510', '2026-09-02', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-02 17:58:32');
INSERT INTO `work_logs` (`id`, `employee_id`, `date`, `entry_time`, `exit_time`, `break_hours`, `total_hours`, `regular_hours`, `overtime_hours`, `notes`, `status`, `created_at`) VALUES ('log-1788286657107', 'emp-1787779495510', '2026-09-01', '07:00', '14:00', 0, 7, 7, 0, 'TALLER', 'completed', '2026-09-01 20:17:37');
