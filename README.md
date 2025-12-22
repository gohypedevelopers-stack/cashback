# Coupon Cashback Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   - Create `.env` file (see `.env.example`).
   - ensure PostgreSQL is running.

3. Run Server:
   ```bash
   npm start
   ```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register (admin/vendor/customer)
- `POST /api/auth/login` - Login

### Admin (Protected: Admin Only)
- `GET /api/admin/brands` - List Brands
- `POST /api/admin/brands` - Create Brand
- `POST /api/admin/campaigns` - Create Campaign
- `GET /api/admin/vendors` - List Vendors
- `POST /api/admin/vendors` - Create Vendor Profile

### Vendor (Protected: Vendor Only)
- `GET /api/vendor/wallet` - View Balance
- `POST /api/vendor/wallet/recharge` - Recharge Wallet
- `POST /api/vendor/qrs/order` - Order QRs (Deduct balance)
- `GET /api/vendor/qrs` - View My QRs

### Public (Customer)
- `GET /api/public/qrs/:hash` - Verify QR
- `POST /api/public/qrs/:hash/redeem` - Redeem QR (Submit UPI)
