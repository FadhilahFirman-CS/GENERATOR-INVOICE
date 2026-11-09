-- Generator Invoice - MySQL schema
-- Import file ini melalui phpMyAdmin atau MySQL CLI.

CREATE DATABASE IF NOT EXISTS `generator_invoice`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `generator_invoice`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `remember_token` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `businesses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL DEFAULT NULL,
  `address` TEXT NULL,
  `logo` TEXT NULL,
  `owner_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `businesses_owner_id_index` (`owner_id`),
  CONSTRAINT `businesses_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_user` (
  `business_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(30) NOT NULL DEFAULT 'staff',
  PRIMARY KEY (`business_id`, `user_id`),
  KEY `business_user_user_id_index` (`user_id`),
  CONSTRAINT `business_user_business_id_foreign`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `business_user_user_id_foreign`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `number` VARCHAR(80) NOT NULL,
  `issued_at` DATE NOT NULL,
  `due_at` DATE NULL DEFAULT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_contact` VARCHAR(150) NULL DEFAULT NULL,
  `customer_address` TEXT NULL,
  `discount` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `template` VARCHAR(30) NOT NULL DEFAULT 'klasik',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_business_number_unique` (`business_id`, `number`),
  KEY `invoices_business_id_index` (`business_id`),
  CONSTRAINT `invoices_business_id_foreign`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `qty` DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_id_index` (`invoice_id`),
  CONSTRAINT `invoice_items_invoice_id_foreign`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

