# Restaurant Management System

A full-stack restaurant management project built with:
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MySQL

It includes two panels:
- User Panel (`/user`) for login, booking, menu ordering, and feedback
- Admin Panel (`/admin`) for dashboard analytics, product management, and database views

## Features

### User Side
- User registration and login
- Role-based login (User/Admin)   
- Table booking and cancellation
- Menu browsing with product ratings
- Order placement and billing flow
- Feedback submission

### Admin Side
- Dashboard with:
  - Income summary
  - Daily sales trend chart
  - Category revenue distribution
  - Best dishes section
- Product management:
  - Add product
  - Update product
  - Delete product
  - Image upload support
- Database tables view:
  - Users
  - Bookings
  - Orders/Billing
  - Feedback
- Offline product fallback + sync retry

## Tech Stack

- Node.js
- Express
- MySQL (`mysql2`)
- Multer (for image uploads)
- Chart.js (dashboard charts)

## Project Structure

```text
Restaurant Managemant System/
|-- admin panel/
|   |-- css/
|   |-- js/
|   |-- index.html
|   |-- product.html
|   |-- add-product.html
|   `-- profile.html
|-- user panel/
|   |-- assets/
|   |-- index.html
|   |-- login.html
|   |-- booking.html
|   |-- Menu.html
|   |-- order.html
|   |-- billing.html
|   |-- feedback.html
|   `-- user.js
|-- server.js
|-- db.js
|-- database.sql
|-- package.json
`-- README.md
```

## Prerequisites

- Node.js (v18+ recommended)
- MySQL Server
- npm

## Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/Sarngi1524/Restaurant-Managemant-System.git
cd Restaurant-Managemant-System
```

2. Install dependencies:

```bash
npm install
```

3. Create/import database:
- Open MySQL Workbench (or CLI)
- Run the SQL in `database.sql`

4. Configure DB credentials:
- Update MySQL credentials in:
  - `server.js`
  - `db.js`

5. Start the server:

```bash
npm start
```

6. Open in browser:
- User panel: `http://localhost:3000/user/index.html`
- Admin panel: `http://localhost:3000/admin/index.html`

## Default Admin Account

From `database.sql`:
- Email: `admin@seffronsky.com`
- Password: `admin123`
- Role: `admin`

## Main API Endpoints

- `POST /api/register`
- `POST /api/login`
- `POST /api/bookings`
- `GET /api/user-bookings`
- `DELETE /api/cancel-booking/:id`
- `POST /api/orders`
- `POST /api/feedback`
- `GET /api/products`
- `POST /api/products/:id/rate`
- `POST /api/admin/add-product`
- `PUT /api/admin/update-product/:id`
- `DELETE /api/admin/delete-product/:id`
- `POST /api/admin/upload-image`
- `GET /api/admin/stats`
- `GET /api/data`

## Notes

- Uploaded product images are stored in `user panel/assets/`.
- This project currently uses plain-text passwords and hardcoded DB credentials for local development.
- For production, use:
  - Password hashing (e.g., bcrypt)
  - Environment variables (`.env`)
  - Proper validation and auth/session security

## License

ISC
