# Coupon Cashback Backend API Testing Guide

Use Postman to validate the Universal (Public) and User (Protected) APIs along with the vendor and admin workflows listed below. Before running requests, configure a Postman environment with:

- `base_url` (for example http://localhost:5000/api)
- `user_token`, `vendor_token`, `admin_token`
- For protected endpoints, include the header `Authorization: Bearer {{user_token}}` (or the appropriate token)

All request URLs in this guide begin with `{{base_url}}`.

## 1. Universal / Public APIs (No Authorization)
These endpoints power the Home screen, Catalog, and QR preview experiences.

### A. Home Screen Data
- **Method**: GET
- **URL**: `{{base_url}}/public/home`
- **Description**: Returns banners, featured brands, products, and platform stats for the customer-facing home screen.
- **Expected Response**:
  ```json
  {
    "banners": [...],
    "brands": [{ "id": "...", "name": "HP Adhesives", "logoUrl": "..." }],
    "featuredProducts": [...],
    "stats": { "productsOwned": 0 }
  }
  ```

### B. Product Catalog
- **Method**: GET
- **URL**: `{{base_url}}/public/products`
- **Optional Query Params**:
  - `search=adhesive`
  - `category=Paints`
  - `brandId=uuid...`
- **Description**: Mirrors the old catalog scripts and returns filtered active products.

### C. Product Details
- **Method**: GET
- **URL**: `{{base_url}}/public/products/:id`
- **Description**: Retrieves the selected product with active campaign rewards.
- **Example Response**:
  ```json
  {
    "id": "...",
    "name": "Wood Bond",
    "reward": "Up to INR 150",
    "scheme": "New Year Dhamaka"
  }
  ```

### D. Active Brands
- **Method**: GET
- **URL**: `{{base_url}}/public/brands`
- **Description**: Lists each brand that currently has an active campaign.

### E. Verify QR (Preview)
- **Method**: GET
- **URL**: `{{base_url}}/public/qrs/:hash`
- **Description**: Validates a QR code without claiming it.
- **Sample Response**:
  ```json
  {
    "valid": true,
    "amount": "50.00",
    "brand": "Coca Cola",
    "campaign": "Summer Vibes"
  }
  ```

## 2. User APIs (Protected, Login Required)
Add `Authorization: Bearer {{user_token}}` to each of these requests.

### A. Explore Offers
- **Method**: GET
- **URL**: `{{base_url}}/user/offers`
- **Query Params**: `search`, `brandId`
- **Description**: Browse campaigns that are currently available for cashback.

### B. Scan & Redeem QR
- **Method**: POST
- **URL**: `{{base_url}}/user/scan-qr/:hash`
- **Description**: Claims cashback for the authenticated user.
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Cashback of INR 50.00 sent instantly to user@upi",
    "amount": 50
  }
  ```

### C. Support System
- **Create Ticket**
  - **Method**: POST
  - **URL**: `{{base_url}}/user/support`
  - **Body**:
    ```json
    {
      "subject": "Payout Pending",
      "message": "I scanned a QR but money is not in my wallet."
    }
    ```
- **Ticket History**
  - **Method**: GET
  - **URL**: `{{base_url}}/user/support`
  - **Description**: Returns the support tickets for the logged-in user.

### D. Notifications
- **List Notifications**
  - **Method**: GET
  - **URL**: `{{base_url}}/user/notifications`
  - **Description**: Pulls unread and system alerts for the user.
- **Mark as Read**
  - **Method**: PUT
  - **URL**: `{{base_url}}/user/notifications/:id/read`
  - **Description**: Marks a specific notification as read.

## 3. Vendor API Reference
Base URL: `{{base_url}}` (same `/api` prefix). Include `Authorization: Bearer {{vendor_token}}`.

### 3.1 Authentication
- `POST /auth/login` with `{ "email": "vendor@test.com", "password": "password123" }` to receive a vendor token.

### 3.2 Brand & Campaign Management
- `POST /brands` - create a brand with `{ "name": "...", "logoUrl": "..." }`.
- `PUT /brands/:id` - update brand metadata.
- `POST /campaigns` - create a campaign with `{ "brandId": "...", "title": "...", "budget": ... }`.
- `PUT /campaigns/:id` - patch campaign details.
- `PUT /vendor/profile` - update profile with `{ "businessName": "...", "contactPhone": "...", "gstin": "...", "address": "..." }`.

### 3.3 Product Management
- `POST /products` - add a product `{ "brandId": "...", "name": "...", "category": "Food", "imageUrl": "..." }`.
- `GET /products` - list products owned by the vendor.
- `PUT /products/:id` - update product fields such as `status`.
- `DELETE /products/:id` - remove a product.

### 3.4 Analytics & Wallet
- `GET /campaigns/stats` - view QR/order redemption counts per campaign.
- `GET /dashboard` - vendor dashboard metrics.
- `GET /vendor/campaigns` - list active campaigns that can order QR codes.
- `POST /vendor/qrs/order` - order QRs for a campaign. Body: `{ "campaignId": "...", "quantity": 10 }`.
- `GET /vendor/qrs` - view generated QR codes (`?campaignId=...` optional).
- `GET /vendor/wallet` - view wallet balance and locked balance.
- `POST /vendor/wallet/recharge` - mock recharge a wallet (body `{ "amount": 5000 }`).
- `GET /vendor/transactions` - wallet transaction history.
- `GET /vendor/dashboard` - wallet and campaign statistics.

## 4. Admin API Reference
Include `Authorization: Bearer {{admin_token}}`.

### 4.1 Dashboard & Analytics
- `GET /dashboard` - system statistics such as total users, vendors, campaigns, and transactions.

### 4.2 User Management
- `GET /users` - list all registered customers.
- `PUT /users/:id/status` - block or unblock a user by sending `{ "status": "blocked" }` or `{ "status": "active" }`.

### 4.3 Brands & Campaigns
- `GET /brands`, `PUT /brands/:id/verify` - approve or reject brands.
- `GET /campaigns`, `PUT /campaigns/:id/verify` - approve or reject campaigns.

### 4.4 System Audit
- `GET /transactions` - full ledger of system transactions.
- `GET /qrs` - search across all generated QR codes.

### 4.5 Vendor Oversight
- `GET /vendors`, `POST /vendors` - list or create vendor profiles.
- `PUT /vendors/:id/verify` - update vendor status (active or rejected).
- `GET /vendors/:id` - detailed vendor profile that includes wallet and brand info.

### 4.6 Advanced Controls
- `POST /wallets/credit` - credit a wallet with `{ "vendorId": "...", "amount": 1000, "description": "Bank Transfer Ref: 123" }`.
- `PUT /campaigns/:id/status` - force a campaign state (for example `{ "status": "paused" }`).
- `GET /support` - list all support tickets.
- `PUT /support/:id` - reply to and close a ticket with `{ "response": "...", "status": "resolved" }`.
- `POST /notifications` - broadcast system alerts.

## 5. New Features Testing Guide
These flows cover the Phase 2-4 enhancements.

### 5.1 File Uploads (Vendor/Admin)
- **Endpoint**: `POST /upload`
- **Auth**: Vendor or Admin token required.
- **Request**: Send form-data field `image=@/path/to/file.jpg`.
- **Expected Response**:
  ```json
  {
    "message": "File uploaded successfully",
    "url": "/uploads/image-<timestamp>.jpg"
  }
  ```
- **Verify**: Open the returned URL in a browser to confirm the file is accessible.

### 5.2 Password Recovery
- **Request OTP**: `POST /auth/forgot-password` with `{ "email": "vendor@brand.com" }`. In dev mode the response includes `{ "message": "OTP sent", "otp": "123456" }`.
- **Reset Password**: `POST /auth/reset-password` with `{ "email": "vendor@brand.com", "otp": "123456", "newPassword": "newsecurepassword123" }`. Expect `{ "message": "Password reset successful" }`.

### 5.3 Vendor Campaign Control
- **Pause a Campaign**: `PUT /vendor/campaigns/:id/status` with `{ "status": "paused" }`. New QR orders are blocked until the campaign is resumed.
- **Delete Draft Brand**: `DELETE /vendor/brands/:id` (allowed only if the brand has no products or campaigns; otherwise expect a 400 response).
- **Delete Draft Campaign**: `DELETE /vendor/campaigns/:id` (allowed only if the campaign has generated no QR codes; otherwise expect a 400 response).

### 5.4 Admin Product Moderation
- **Force Delete Product**: `DELETE /admin/products/:id`. Expected response: `{ "message": "Product forcibly deleted by Admin" }`.

### 5.5 Pagination Checks (Admin)
- `GET /admin/vendors?page=1&limit=5` - expect a response like:
  ```json
  {
    "vendors": [ ...5 entries... ],
    "pagination": { "total": 50, "page": 1, "pages": 10 }
  }
  ```
- Repeat for `GET /admin/users?page=1&limit=5` and `GET /admin/transactions?page=1&limit=5`.

## Status Codes
- `200/201`: Success
- `400`: Bad request (for example, insufficient funds or invalid draft deletion)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (wrong role)
