# Assured Rewards Backend API Testing (Postman)

This document is based on the current backend route files in `src/routes`.

## 1. Postman Setup

- Create a Postman environment with:
- `baseUrl` = `http://localhost:5000` (local) or `https://assuredrewards.in` (production through Nginx)
- `adminToken` = (set after admin login)
- `vendorToken` = (set after vendor login)
- `customerToken` = (set after customer login)
- `brandId`, `campaignId`, `productId`, `vendorId`, `orderId`, `couponId`, `ticketId`, `notificationId`, `qrHash`

Use header for protected routes:

```http
Authorization: Bearer {{adminToken}}
```

or

```http
Authorization: Bearer {{vendorToken}}
```

or

```http
Authorization: Bearer {{customerToken}}
```

## 2. Recommended Test Order

1. Health check: `GET /`
2. Auth: register/login/me
3. Public routes
4. Customer (`/api/user`)
5. Vendor (`/api/vendor`) open routes
6. Vendor feature routes
7. Admin routes (`/api/admin`)
8. Payments (`/api/payments`)
9. Upload (`/api/upload`)

## 3. Auth APIs (`/api/auth`)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | No | `{ "name", "email", "password", "role?", "username?" }` |
| POST | `/api/auth/login` | No | `{ "emailOrUsername" or "email"/"username", "password" }` |
| GET | `/api/auth/me` | Yes | - |
| POST | `/api/auth/send-otp` | No | `{ "phoneNumber" }` |
| POST | `/api/auth/verify-otp` | No | `{ "phoneNumber", "otp" }` |
| POST | `/api/auth/send-email-otp` | No | `{ "email" }` |
| POST | `/api/auth/reset-password-otp` | No | `{ "email", "otp", "password" }` |
| POST | `/api/auth/forgot-password` | No | `{ "email" }` |
| POST | `/api/auth/reset-password` | No | `{ "token", "password" }` |
| POST | `/api/auth/set-password` | Yes | `{ "password" }` |
| POST | `/api/auth/vendor/register` | No | `{ "ownerName", "brandName", "category?", "mobile?", "email", "password", "city?", "state?", "website?" }` |

## 4. Public APIs (`/api/public`)

| Method | Endpoint | Auth | Query/Body |
|---|---|---|---|
| GET | `/api/public/home` | No | - |
| GET | `/api/public/products` | No | `search?`, `brandId?`, `category?` |
| GET | `/api/public/products/:id` | No | - |
| GET | `/api/public/categories` | No | - |
| GET | `/api/public/brands` | No | - |
| GET | `/api/public/brands/:id` | No | - |
| POST | `/api/public/brands/:id/inquiry` | No | `{ "name", "email", "phone?", "message" }` |
| GET | `/api/public/qrs/:hash` | No | - |
| GET | `/api/public/giftcards` | No | `categoryId?`, `search?` |
| GET | `/api/public/giftcards/categories` | No | - |
| GET | `/api/public/giftcards/:id` | No | - |
| GET | `/api/public/store` | No | - |
| GET | `/api/public/faqs` | No | - |
| GET | `/api/public/content/:slug` | No | - |
| GET | `/api/public/coupons` | No | `platform?`, `category?` |
| GET | `/api/public/coupons/:id` | No | - |

## 5. Customer APIs (`/api/user`) [Protected]

| Method | Endpoint | Body/Query |
|---|---|---|
| GET | `/api/user/dashboard` | - |
| POST | `/api/user/scan-qr/:hash` | - |
| POST | `/api/user/payout` | `{ "amount", "payoutMethodId" }` |
| GET | `/api/user/payout-methods` | - |
| POST | `/api/user/payout-methods` | `{ "type", "value" }` |
| DELETE | `/api/user/payout-methods/:id` | - |
| GET | `/api/user/withdrawals` | - |
| GET | `/api/user/redemptions` | - |
| GET | `/api/user/transactions` | - |
| PUT | `/api/user/profile` | `{ "name?", "email?", "username?", "phoneNumber?" }` |
| POST | `/api/user/avatar` | `form-data: image(file)` |
| PUT | `/api/user/change-password` | `{ "oldPassword", "newPassword" }` |
| DELETE | `/api/user/account` | - |
| GET | `/api/user/offers` | `search?`, `brandId?` |
| POST | `/api/user/support` | `{ "subject", "message" }` |
| GET | `/api/user/support` | - |
| GET | `/api/user/notifications` | - |
| PUT | `/api/user/notifications/:id/read` | - |

## 6. Payment APIs (`/api/payments`) [Protected]

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/payments/methods` | `{ "type", "value" }` |
| GET | `/api/payments/methods` | - |
| POST | `/api/payments/withdraw` | `{ "amount", "payoutMethodId" }` |
| GET | `/api/payments/withdrawals` | - |
| POST | `/api/payments/order` | `{ "amount", "currency?", "receipt?", "notes?" }` |
| POST | `/api/payments/verify` | `{ "razorpay_order_id", "razorpay_payment_id", "razorpay_signature" }` |

## 7. Upload API (`/api/upload`) [Protected]

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/upload` | `form-data: image(file)` |

Returns:

```json
{
  "message": "File uploaded successfully",
  "url": "/uploads/<filename>"
}
```

## 8. Vendor APIs (`/api/vendor`) [Protected + `role=vendor`]

### 8.1 Vendor Open Routes

| Method | Endpoint | Body/Query |
|---|---|---|
| GET | `/api/vendor/wallet` | - |
| POST | `/api/vendor/wallet/recharge` | `{ "amount" }` |
| GET | `/api/vendor/profile` | - |
| PUT | `/api/vendor/profile` | `{ "businessName?", "contactPhone?", "contactEmail?", "gstin?", "address?" }` |
| POST | `/api/vendor/credentials/request` | `{ "username?" , "password?" }` |
| GET | `/api/vendor/brands` | - |
| GET | `/api/vendor/brand` | - |
| POST | `/api/vendor/brand` | (internal upsert; usually admin-managed flow) |
| POST | `/api/vendor/brands` | `{ "name", "website?", "logoUrl?" }` |
| PUT | `/api/vendor/brands/:id` | (currently blocked in controller) |
| DELETE | `/api/vendor/brands/:id` | - |
| GET | `/api/vendor/dashboard` | - |
| GET | `/api/vendor/transactions` | - |
| GET | `/api/vendor/support` | `status?` |
| POST | `/api/vendor/support` | `{ "subject", "message", "priority?" }` |
| GET | `/api/vendor/brand-inquiries` | - |

### 8.2 Vendor Feature Routes

| Method | Endpoint | Body/Query |
|---|---|---|
| POST | `/api/vendor/qrs/order` | `{ "campaignId", "quantity", "cashbackAmount" }` |
| GET | `/api/vendor/qrs` | - |
| DELETE | `/api/vendor/qrs/batch` | body or query: `campaignId`, `cashbackAmount` |
| GET | `/api/vendor/orders` | - |
| POST | `/api/vendor/orders` | `{ "campaignId", "quantity", "cashbackAmount" }` |
| POST | `/api/vendor/orders/:orderId/pay` | - |
| GET | `/api/vendor/orders/:orderId/download` | - |
| GET | `/api/vendor/redemptions` | `campaignId?`, `startDate?`, `endDate?` |
| GET | `/api/vendor/campaigns` | - |
| POST | `/api/vendor/campaigns` | `{ "brandId", "productId?", "title", "description?", "cashbackAmount", "startDate", "endDate", "totalBudget?", "subtotal?", "allocations?" }` |
| PUT | `/api/vendor/campaigns/:id` | `{ "title?", "description?", "cashbackAmount?", "startDate?", "endDate?", "totalBudget?" }` |
| PUT | `/api/vendor/campaigns/:id/status` | `{ "status" }` |
| DELETE | `/api/vendor/campaigns/:id` | - |
| GET | `/api/vendor/campaigns/stats` | - |
| GET | `/api/vendor/campaigns/:id/download` | - |
| POST | `/api/vendor/campaigns/:id/pay` | - |
| POST | `/api/vendor/products` | `{ "brandId", "name", "variant?", "description?", "category?", "imageUrl?" }` |
| POST | `/api/vendor/products/import` | `{ "brandId", "products": [] }` |
| GET | `/api/vendor/products` | - |
| PUT | `/api/vendor/products/:id` | `{ "name?", "variant?", "description?", "category?", "imageUrl?", "status?" }` |
| DELETE | `/api/vendor/products/:id` | - |

## 9. Admin APIs (`/api/admin`) [Protected + `role=admin`]

### 9.1 Dashboard / System

| Method | Endpoint | Body/Query |
|---|---|---|
| GET | `/api/admin/dashboard` | - |
| GET | `/api/admin/settings` | - |
| PUT | `/api/admin/settings` | system settings payload |
| GET | `/api/admin/activity-logs` | `action?`, `actorRole?`, `vendorId?`, `brandId?`, `campaignId?`, `startDate?`, `endDate?` |

### 9.2 Brand

| Method | Endpoint | Body/Query |
|---|---|---|
| POST | `/api/admin/brands` | `{ "name", "logoUrl?", "website?", "vendorEmail?", "vendorPhone?", "vendorId?", "qrPricePerUnit?" }` |
| GET | `/api/admin/brands` | `status?`, `vendorId?` |
| GET | `/api/admin/brands/:id` | - |
| PUT | `/api/admin/brands/:id` | `{ "name?", "logoUrl?", "website?", "qrPricePerUnit?" }` |
| PUT | `/api/admin/brands/:id/verify` | `{ "status", "reason?" }` |

### 9.3 Product (admin-managed)

| Method | Endpoint | Body/Query |
|---|---|---|
| POST | `/api/admin/products` | `{ "brandId", "name", "variant?", "category?", "description?", "packSize?", "warranty?", "imageUrl?", "bannerUrl?" }` |
| GET | `/api/admin/products` | `brandId?`, `type?`, `page?`, `limit?` |
| GET | `/api/admin/products/:id` | - |
| PUT | `/api/admin/products/:id` | update fields |
| DELETE | `/api/admin/products/:id` | - |

### 9.4 Campaign

| Method | Endpoint | Body/Query |
|---|---|---|
| POST | `/api/admin/campaigns` | `{ "brandId", "title", "description?", "cashbackAmount", "startDate", "endDate", "totalBudget?", "status?" }` |
| GET | `/api/admin/campaigns` | `type?`, `brandId?`, `vendorId?`, `status?` |
| GET | `/api/admin/campaigns/:id/analytics` | - |
| PUT | `/api/admin/campaigns/:id` | update fields |
| PUT | `/api/admin/campaigns/:id/verify` | `{ "status", "reason?" }` |
| PUT | `/api/admin/campaigns/:id/status` | `{ "status" }` |
| DELETE | `/api/admin/campaigns/:id` | - |

### 9.5 Coupon

| Method | Endpoint | Body/Query |
|---|---|---|
| POST | `/api/admin/coupons` | `{ "code", "description?", "discountType", "discountValue", "minPurchaseAmount?", "maxDiscountAmount?", "expiryDate", "platform", "url?", "imageUrl?" }` |
| GET | `/api/admin/coupons` | `page?`, `limit?`, `platform?` |
| GET | `/api/admin/coupons/:id` | - |
| PUT | `/api/admin/coupons/:id` | update fields |
| DELETE | `/api/admin/coupons/:id` | - |

### 9.6 Vendor

| Method | Endpoint | Body/Query |
|---|---|---|
| GET | `/api/admin/vendors` | - |
| POST | `/api/admin/vendors` | `{ "name", "email", "password", "businessName", "contactPhone?", "gstin?" }` |
| PUT | `/api/admin/vendors/:id/verify` | `{ "status", "reason?" }` |
| GET | `/api/admin/vendors/:id/overview` | - |
| GET | `/api/admin/vendors/:id` | - |
| PUT | `/api/admin/vendors/:id` | `{ "businessName?", "contactPhone?", "contactEmail?", "gstin?", "address?" }` |
| PUT | `/api/admin/vendors/:id/credentials` | `{ "username?", "password?", "autoGeneratePassword?" }` |
| GET | `/api/admin/vendors/:id/credential-requests` | `status?` |
| PUT | `/api/admin/credential-requests/:id/approve` | `{ "username?", "password?" }` |
| PUT | `/api/admin/credential-requests/:id/reject` | `{ "reason?" }` |

### 9.7 Wallet / User / Audit / Support / Orders / Withdrawals

| Method | Endpoint | Body/Query |
|---|---|---|
| POST | `/api/admin/wallets/credit` | same as `/wallets/adjust` |
| POST | `/api/admin/wallets/adjust` | `{ "vendorId", "amount", "description?", "type" }` |
| GET | `/api/admin/users` | - |
| PUT | `/api/admin/users/:id/status` | `{ "status" }` |
| GET | `/api/admin/transactions` | `vendorId?`, `brandId?`, `walletId?`, `type?`, `category?`, `status?`, `from?`, `to?` |
| GET | `/api/admin/qrs` | `campaignId?`, `vendorId?`, `brandId?`, `status?`, `from?`, `to?`, `search?` |
| GET | `/api/admin/qrs/batch` | `campaignId?`, `cashbackAmount?`, `limit?`, `orderId?` |
| GET | `/api/admin/withdrawals` | - |
| PUT | `/api/admin/withdrawals/:id/process` | `{ "status", "referenceId?", "adminNote?", "reason?" }` |
| GET | `/api/admin/support` | - |
| PUT | `/api/admin/support/:id` | `{ "response", "status" }` |
| POST | `/api/admin/notifications` | `{ "userId", "title", "message", "type?", "metadata?" }` |
| GET | `/api/admin/notifications` | - |
| GET | `/api/admin/orders` | `vendorId?`, `campaignId?`, `status?`, `brandId?` |
| PUT | `/api/admin/orders/:id/status` | `{ "status" }` |

## 10. Quick Postman Examples

### Login (Vendor/Admin/Customer)

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json
```

```json
{
  "emailOrUsername": "aniket331@gmail.com",
  "password": "Aniket@123"
}
```

### Vendor Self Registration

```http
POST {{baseUrl}}/api/auth/vendor/register
Content-Type: application/json
```

```json
{
  "ownerName": "Aniket",
  "brandName": "T-Rex Tea",
  "email": "vendor@example.com",
  "password": "Vendor@123",
  "mobile": "9999999999",
  "city": "Mumbai",
  "state": "Maharashtra",
  "website": "https://example.com"
}
```

### Admin Create Brand (with vendor assignment)

```http
POST {{baseUrl}}/api/admin/brands
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

```json
{
  "name": "My Brand",
  "vendorEmail": "vendor@example.com",
  "qrPricePerUnit": 1.0
}
```

### Upload File

```http
POST {{baseUrl}}/api/upload
Authorization: Bearer {{vendorToken}}
Content-Type: multipart/form-data
```

Body (form-data):

- `image`: `<file>`

## 11. Common Failure Cases

- `401 Invalid credentials`: wrong email/username/password.
- `401 Not authorized, token failed`: expired or invalid JWT.
- `500 Server Error` with Prisma details: payload shape mismatch or invalid relation data.

## 12. Notes

- Vendor onboarding creates pending vendor/brand by default in self-registration flow.
- Some endpoints exist in both `/api/user` and `/api/payments` for payout workflows.
