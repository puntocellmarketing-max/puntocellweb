-- PuntoCell Ecommerce - esquema inicial administrable
-- Ejecutar una sola vez sobre la misma base MySQL usada por DB_NAME/MYSQLDATABASE.

CREATE TABLE IF NOT EXISTS ecommerce_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  description VARCHAR(500) NULL,
  image_url VARCHAR(1000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ecommerce_categories_slug (slug),
  KEY idx_ecommerce_categories_parent (parent_id),
  KEY idx_ecommerce_categories_active_order (active, sort_order),
  CONSTRAINT fk_ecommerce_categories_parent
    FOREIGN KEY (parent_id) REFERENCES ecommerce_categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NULL,
  sku VARCHAR(100) NULL,
  external_code VARCHAR(100) NULL,
  source ENUM('MANUAL','SISTEMA') NOT NULL DEFAULT 'MANUAL',
  name VARCHAR(220) NOT NULL,
  slug VARCHAR(240) NOT NULL,
  brand VARCHAR(120) NULL,
  short_description VARCHAR(500) NULL,
  description MEDIUMTEXT NULL,
  specs_json LONGTEXT NULL,
  cash_price DECIMAL(15,2) NULL,
  old_price DECIMAL(15,2) NULL,
  stock DECIMAL(15,3) NULL,
  availability ENUM('EN_STOCK','SIN_STOCK','CONSULTAR') NOT NULL DEFAULT 'CONSULTAR',
  main_image_url VARCHAR(1000) NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  offer TINYINT(1) NOT NULL DEFAULT 0,
  seasonal TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  last_synced_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ecommerce_products_slug (slug),
  UNIQUE KEY uq_ecommerce_products_external (source, external_code),
  KEY idx_ecommerce_products_category (category_id),
  KEY idx_ecommerce_products_public (active, featured, offer, seasonal, sort_order),
  KEY idx_ecommerce_products_name (name),
  CONSTRAINT fk_ecommerce_products_category
    FOREIGN KEY (category_id) REFERENCES ecommerce_categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  alt_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ecommerce_product_images_product (product_id, sort_order),
  CONSTRAINT fk_ecommerce_product_images_product
    FOREIGN KEY (product_id) REFERENCES ecommerce_products(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_credit_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(120) NULL,
  down_payment DECIMAL(15,2) NOT NULL DEFAULT 0,
  installments INT NOT NULL,
  installment_amount DECIMAL(15,2) NOT NULL,
  total_credit DECIMAL(15,2) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ecommerce_credit_plans_product (product_id, active, sort_order),
  CONSTRAINT fk_ecommerce_credit_plans_product
    FOREIGN KEY (product_id) REFERENCES ecommerce_products(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_collections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(140) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  collection_type ENUM('TEMPORADA','OFERTA','DESTACADOS','PERSONALIZADA') NOT NULL DEFAULT 'PERSONALIZADA',
  description VARCHAR(500) NULL,
  image_url VARCHAR(1000) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ecommerce_collections_slug (slug),
  KEY idx_ecommerce_collections_active_dates (active, starts_at, ends_at, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_collection_products (
  collection_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id),
  KEY idx_ecommerce_collection_products_product (product_id),
  CONSTRAINT fk_ecommerce_collection_products_collection
    FOREIGN KEY (collection_id) REFERENCES ecommerce_collections(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ecommerce_collection_products_product
    FOREIGN KEY (product_id) REFERENCES ecommerce_products(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_banners (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  subtitle VARCHAR(500) NULL,
  image_url VARCHAR(1000) NULL,
  mobile_image_url VARCHAR(1000) NULL,
  button_label VARCHAR(80) NULL,
  button_url VARCHAR(500) NULL,
  theme VARCHAR(100) NOT NULL DEFAULT 'blue',
  position VARCHAR(60) NOT NULL DEFAULT 'HOME_MAIN',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ecommerce_banners_public (position, active, starts_at, ends_at, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code VARCHAR(30) NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL,
  customer_city VARCHAR(120) NULL,
  customer_notes VARCHAR(1000) NULL,
  payment_mode ENUM('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  status ENUM('BORRADOR','ENVIADO_WHATSAPP','CONFIRMADO','VENDIDO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  whatsapp_sent TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ecommerce_orders_code (order_code),
  KEY idx_ecommerce_orders_status_date (status, created_at),
  KEY idx_ecommerce_orders_phone (customer_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  sku VARCHAR(100) NULL,
  product_name VARCHAR(220) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit_summary VARCHAR(500) NULL,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ecommerce_order_items_order (order_id),
  KEY idx_ecommerce_order_items_product (product_id),
  CONSTRAINT fk_ecommerce_order_items_order
    FOREIGN KEY (order_id) REFERENCES ecommerce_orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ecommerce_order_items_product
    FOREIGN KEY (product_id) REFERENCES ecommerce_products(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecommerce_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NULL,
  user_name VARCHAR(160) NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT NULL,
  detail_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ecommerce_audit_entity (entity_type, entity_id),
  KEY idx_ecommerce_audit_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ecommerce_categories (name, slug, description, sort_order) VALUES
('Celulares', 'celulares', 'Smartphones y teléfonos', 10),
('Televisores', 'televisores', 'Smart TV y entretenimiento', 20),
('Electrodomésticos', 'electrodomesticos', 'Equipos para el hogar', 30),
('Audio', 'audio', 'Parlantes, auriculares y sonido', 40),
('Informática', 'informatica', 'Notebooks y periféricos', 50),
('Accesorios', 'accesorios', 'Cables, cargadores y complementos', 60);

