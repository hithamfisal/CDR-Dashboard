CREATE DATABASE IF NOT EXISTS cdr_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cdr_dashboard;

CREATE TABLE IF NOT EXISTS cdr_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('admin','customerAdmin','customer') NOT NULL,
  username VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cdr_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cdr_app_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  company_name VARCHAR(180) NOT NULL,
  admin_portal_title VARCHAR(220) NOT NULL,
  admin_portal_description TEXT NOT NULL,
  customer_portal_title VARCHAR(220) NOT NULL,
  customer_portal_description TEXT NOT NULL,
  dashboard_header_title VARCHAR(220) NOT NULL,
  dashboard_header_description VARCHAR(300) NOT NULL,
  left_logo_name VARCHAR(255) NOT NULL,
  left_logo_data_url LONGTEXT NULL,
  right_logo_name VARCHAR(255) NOT NULL,
  right_logo_data_url LONGTEXT NULL,
  upload_hero_image_name VARCHAR(255) NOT NULL,
  upload_hero_image_data_url LONGTEXT NULL,
  radio_showcase_image_name VARCHAR(255) NOT NULL DEFAULT 'Radio Showcase Picture',
  radio_showcase_image_data_url LONGTEXT NULL,
  default_theme VARCHAR(32) NOT NULL DEFAULT 'proposal3',
  show_sample_data_button TINYINT(1) NOT NULL DEFAULT 1,
  header_logo_size SMALLINT UNSIGNED NOT NULL DEFAULT 66,
  header_title_scale DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  compact_dashboard_layout TINYINT(1) NOT NULL DEFAULT 0,
  support_email VARCHAR(180) NOT NULL,
  support_phone VARCHAR(80) NOT NULL,
  primary_color VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_cdr_app_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cdr_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL,
  action VARCHAR(120) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cdr_audit_logs_created_at (created_at),
  KEY idx_cdr_audit_logs_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
