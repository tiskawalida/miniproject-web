# API Reference

## Authentication
- POST `/api/auth/login`
  - Request: `{ username, password }`
  - Response: `{ success, user, csrfToken }`

- POST `/api/auth/logout`
  - No body required.
  - Response: `{ success, message }`

- GET `/api/auth/me`
  - Response: current user + CSRF token.

- GET `/api/auth/users`
  - Admin only. Get user list.

- POST `/api/auth/users`
  - Admin only. Create new user.

## Categories
- GET `/api/categories`
- POST `/api/categories`
- PUT `/api/categories/:id`
- DELETE `/api/categories/:id`

## Suppliers
- GET `/api/suppliers`
- POST `/api/suppliers`
- PUT `/api/suppliers/:id`
- DELETE `/api/suppliers/:id`

## Warehouses
- GET `/api/warehouses`
- POST `/api/warehouses`
- PUT `/api/warehouses/:id`
- DELETE `/api/warehouses/:id`

## Products
- GET `/api/products`
  - Supports search, categoryId, supplierId, page, limit, sortBy, sortOrder.
- GET `/api/products/all`
- GET `/api/products/:id`
- POST `/api/products`
  - Admin/Manager only. Supports image upload.
- PUT `/api/products/:id`
  - Admin/Manager only.
- DELETE `/api/products/:id`
  - Admin/Manager only. Soft delete only if stock is zero.

## Transactions
- GET `/api/transactions`
- POST `/api/transactions`
- GET `/api/transactions/valuation/:productId`
  - Returns FIFO/LIFO inventory valuation for product.

## Transfers
- GET `/api/transfers`
- POST `/api/transfers`
  - Request transfer between warehouses.
- POST `/api/transfers/:id/approve`
  - Admin/Manager only. Atomically complete transfer.
- POST `/api/transfers/:id/reject`
  - Admin/Manager only.

## Dashboard
- GET `/api/dashboard/stats`
  - Returns KPI tiles, stock-by-category, trend chart, warehouse distribution, top products.

## Monitoring
- GET `/api/monitoring/events`
  - SSE stream for real-time server metrics and notifications.
- GET `/api/monitoring/logs`
  - Admin only. Audit logs with filter.
- GET `/api/monitoring/notifications`
- POST `/api/monitoring/notifications/read-all`

## Jobs
- GET `/api/jobs`
- POST `/api/jobs/report`
  - Enqueue background PDF report generation.
- POST `/api/jobs/sync`
  - Admin/Manager only. Enqueue warehouse sync job.
- POST `/api/jobs/import-csv`
  - Admin/Manager only. Parallel CSV import of products.

## Notes
- All non-GET requests require header `x-csrf-token` with a valid CSRF token.
- All endpoints require authenticated session except `/api/auth/login`.
