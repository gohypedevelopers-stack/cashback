# Coupon Cashback Backend API Guide

This guide provides detailed instructions on how to interact with the backend API.

**Base URL**: `http://localhost:5000`

---

## 1. Authentication
> **Note**: After logging in, you will receive a `token`. You must include this token in the `Authorization` header of subsequent requests:
> `Authorization: Bearer <your-token>`

### 1.1 Register User
Create a new user.
- **Endpoint**: `POST /api/auth/register`
- **Body**:
  ```json
  {
    "name": "Admin User",
    "email": "admin@gohype.com",
    "password": "securepassword",
    "role": "admin"  // Options: "admin", "vendor" (Customer not needed as no login required)
  }
  ```
- **Response**:
  ```json
  {
    "_id": "uuid-string",
    "name": "Admin User",
    "email": "admin@gohype.com",
    "role": "admin",
    "token": "eyJh..."
  }
  ```

### 1.2 Login
- **Endpoint**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "admin@gohype.com",
    "password": "securepassword"
  }
  ```

---

## 2. Admin Operations
> **Requires**: Login as `admin`.

### 2.1 Create Brand
- **Endpoint**: `POST /api/admin/brands`
- **Body**:
  ```json
  {
    "name": "Nike",
    "logoUrl": "https://url-to-logo.com/logo.png",
    "website": "https://nike.com"
  }
  ```

### 2.2 Create Campaign
- **Endpoint**: `POST /api/admin/campaigns`
- **Body**:
  ```json
  {
    "brandId": "<UUID-of-Brand>",
    "title": "Nike Summer Sale",
    "description": "Get Rs 50 Cashback on every scan",
    "cashbackAmount": 50,
    "totalBudget": 100000,
    "startDate": "2023-01-01",
    "endDate": "2023-12-31"
  }
  ```

### 2.3 Onboard Vendor
1. First, **Register** a new user with `role: "vendor"`.
2. Get the `userId` from the response.
3. Call this endpoint to create their profile.
- **Endpoint**: `POST /api/admin/vendors`
- **Body**:
  ```json
  {
    "userId": "<UUID-of-Vendor-User>",
    "businessName": "Supermart Config",
    "contactPhone": "9876543210",
    "gstin": "GSTIN12345"
  }
  ```

---

## 3. Vendor Operations
> **Requires**: Login as `vendor`.

### 3.1 Check Wallet
- **Endpoint**: `GET /api/vendor/wallet`
- **Response**:
  ```json
  {
    "balance": "0.00",
    "lockedBalance": "0.00",
    "currency": "INR"
  }
  ```

### 3.2 Recharge Wallet
- **Endpoint**: `POST /api/vendor/wallet/recharge`
- **Body**:
  ```json
  {
    "amount": 5000
  }
  ```

### 3.3 Order QR Codes
Buy QR codes for a campaign. The cost (`campaign.cashbackAmount * quantity`) is deducted from the wallet.
- **Endpoint**: `POST /api/vendor/qrs/order`
- **Body**:
  ```json
  {
    "campaignId": "<UUID-of-Campaign>",
    "quantity": 100
  }
  ```
- **Response**:
  ```json
  {
    "message": "QRs generated successfully",
    "count": 100
  }
  ```

### 3.4 View My QRs
Get the list of QRs you own, including their `uniqueHash`.
- **Endpoint**: `GET /api/vendor/qrs`
- **Response**:
  ```json
  [
    {
      "uniqueHash": "ab123456789...",
      "status": "generated",
      ...
    }
  ]
  ```

---

## 4. Public (Customer) Operations
> **No Login Required**. Used by the scanning app/frontend.

### 4.1 Verify QR
Scan the QR code and call this to check if it's valid and get the campaign details.
- **Endpoint**: `GET /api/public/qrs/:hash`
- **Example**: `/api/public/qrs/ab123456789...`
- **Response**:
  ```json
  {
    "valid": true,
    "amount": "50.00",
    "brand": "Nike",
    "campaign": "Nike Summer Sale"
  }
  ```

### 4.2 Redeem Cashback
After entering the UPI ID.
- **Endpoint**: `POST /api/public/qrs/:hash/redeem`
- **Body**:
  ```json
  {
    "upiId": "john@upi"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Cashback redemption initiated successfully",
    "transactionId": "PAY_123456...",
    "amount": "50.00"
  }
  ```
