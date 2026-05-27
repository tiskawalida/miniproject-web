# Database Schema

## 1. Tabel utama

### users
- id
- username
- password
- full_name
- email
- role
- warehouse_id
- is_active
- last_login
- created_at
- updated_at

### categories
- id
- code
- name
- description
- is_active
- created_at
- updated_at

### suppliers
- id
- code
- name
- city
- address
- phone
- is_active
- created_at
- updated_at

### warehouses
- id
- code
- name
- city
- address
- capacity
- is_active
- created_at
- updated_at

### products
- id
- code
- name
- description
- category_id
- supplier_id
- unit
- price
- min_stock
- image_url
- is_active
- created_at
- updated_at

### stock
- id
- product_id
- warehouse_id
- quantity
- updated_at

### transactions
- id
- code
- type (in/out)
- product_id
- warehouse_id
- quantity
- note
- reference_no
- user_id
- created_at

### transfers
- id
- code
- product_id
- from_warehouse_id
- to_warehouse_id
- quantity
- note
- requested_by
- approved_by
- status
- completed_at
- created_at
- updated_at

### job_queue
- id
- type
- payload
- status
- result
- error
- created_at
- updated_at

### audit_logs
- id
- user_id
- username
- action
- entity
- entity_id
- details
- severity
- created_at

### notifications
- id
- type
- title
- message
- severity
- target_role
- related_id
- is_read
- created_at

## 2. Relational overview
- `products.category_id` → `categories.id`
- `products.supplier_id` → `suppliers.id`
- `users.warehouse_id` → `warehouses.id`
- `stock.product_id` → `products.id`
- `stock.warehouse_id` → `warehouses.id`
- `transactions.product_id` → `products.id`
- `transactions.warehouse_id` → `warehouses.id`
- `transactions.user_id` → `users.id`
- `transfers.product_id` → `products.id`
- `transfers.from_warehouse_id`, `transfers.to_warehouse_id` → `warehouses.id`

## 3. Design notes
- Semua tabel utama memiliki field `created_at` dan `updated_at` untuk auditing.
- Soft delete menggunakan `is_active` pada entitas master.
- Transfer memanfaatkan transaksi SQLite untuk update stok atomik.
