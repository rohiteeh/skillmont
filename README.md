# 🚀 SkillMint Backend Core: Freelance Marketplace Platform for Students and Freshers

**Academic Year 2026 — III BCA Project**  
**Project Authors:** Rithik R. & Rubith Kumar K.  
**Architecture:** 3-Tier Web Application (Node.js/Express + MySQL/SQLite + Socket.io)

---

## 📌 Project Overview

SkillMint is a dedicated freelance marketplace platform designed to bridge the gap between talented college students/freshers and clients seeking cost-effective, high-quality development work. 

This backend core implementation powers:
1. **Authentication & Role-Based Access Control (RBAC)**: Secure registration, login, bcrypt password hashing, JWT sessions, and role authorization for `Student`, `Client`, and `Admin`.
2. **RESTful Project & Hiring Lifecycle**:
   - Clients post freelance projects with skill requirements, budgets, and deadlines.
   - Students explore/filter open projects and submit bids with cover letters and portfolio links.
   - Clients review student applicants, accept/reject proposals, and initiate project tracking (`InProgress`).
3. **Real-Time Direct Messaging (Socket.io)**: Authenticated WebSocket communication with real-time delivery, user-specific rooms, typing indicators, read receipts, and offline message storage.
4. **Relational Database DDL**: Complete MySQL schema definitions with indexes and foreign keys (`ON DELETE CASCADE`), plus pluggable zero-setup SQLite support.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js v24+
- **Framework**: Express.js 4.19
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **Real-Time Engine**: Socket.io 4.7
- **Database**:
  - **SQLite** (Default local runtime): Zero-config, powered by Node.js 24 native `node:sqlite`.
  - **MySQL 8.0+** (`mysql2/promise`): Ready for XAMPP, WAMP, or cloud MySQL deployment.

---

## ⚡ Quick Start Guide

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment (`.env`)
The project comes with a configured `.env`. You can adjust settings if needed:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=skillmint_secure_jwt_token_key_2026_bca_project
JWT_EXPIRES_IN=7d

# Database Configuration (sqlite or mysql)
DB_TYPE=sqlite
SQLITE_PATH=./skillmint.db

# MySQL Settings (Active when DB_TYPE=mysql)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=skillmint_db
```

### 3. Run the Server
```bash
npm start
```
*The database automatically creates all tables and seeds demo accounts on first run!*

### 4. Run Automated Test Suite
To verify all 27 test assertions covering Auth, RBAC, Projects, Applications, and Socket.io:
```bash
npm test
```

---

## 👥 Default Demo Accounts

All demo accounts are pre-seeded with the password: `Password123!`

| Role | Email | Name | Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `student@skillmint.edu` | Rithik Student | Browse jobs, submit proposals, manage portfolio, chat |
| **Client** | `client@skillmint.biz` | Rubith Tech Ventures | Post projects, review applicants, hire students, chat |
| **Admin** | `admin@skillmint.org` | SkillMint Admin | Platform oversight, moderate users/projects |

---

## 📡 REST API Reference

### 1. Authentication & Profile (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new `Student` or `Client` account |
| `POST` | `/api/auth/login` | Public | Login with email & password, returns JWT token |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated user & profile info |
| `PUT` | `/api/auth/profile` | Authenticated | Update student skills/bio or client company info |

### 2. Projects Lifecycle (`/api/projects`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/projects` | Public | Browse projects with filters (`?skills=`, `?category=`, `?search=`) |
| `GET` | `/api/projects/:id` | Public | Get project details, client info, and application count |
| `POST` | `/api/projects` | `Client` | Post a new freelance project with budget & deadline |
| `GET` | `/api/projects/my/client`| `Client` | View all projects posted by the logged-in client |
| `PUT` | `/api/projects/:id` | `Client`/`Admin`| Update project details or status |
| `DELETE`| `/api/projects/:id` | `Client`/`Admin`| Delete project and cascade associated data |

### 3. Applications & Hiring (`/api/applications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | `Student` | Submit project application with cover message & portfolio |
| `GET` | `/api/applications/my` | `Student` | View all applications submitted by the logged-in student |
| `GET` | `/api/applications/project/:id` | `Client`/`Admin`| View all applicants for a client's project |
| `PATCH`| `/api/applications/:id/status` | `Client`/`Admin`| Accept or reject applicant (`Accepted` triggers project to `InProgress`) |

### 4. Direct Messaging & History (`/api/messages`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/messages/conversations` | Authenticated | List all active chats with last message & unread badge count |
| `GET` | `/api/messages/:otherUserId` | Authenticated | Get full conversation history with another user & mark as read |
| `POST` | `/api/messages` | Authenticated | REST fallback to send a direct message |

---

## ⚡ Socket.io Real-Time Messaging Events

### Connection & Auth
Pass the JWT token during connection:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

### Client -> Server Events
- `send_message`: `{ receiverId: 1, messageText: 'Hello!' }`
- `typing`: `{ receiverId: 1, isTyping: true }`
- `mark_as_read`: `{ senderId: 1 }`

### Server -> Client Events
- `receive_message`: Emitted to recipient in real-time when online.
- `message_sent`: Acknowledgment to sender with delivery status (`delivered` or `stored_offline`).
- `user_typing`: Notifies recipient that sender is typing.
- `messages_read`: Read receipt notification.

---

## 🗄️ MySQL Database Setup (Optional for Production / XAMPP)

To use your local MySQL/XAMPP server instead of the built-in SQLite engine:
1. Open MySQL Workbench or phpMyAdmin and import the DDL script:
   ```bash
   mysql -u root -p < schema.sql
   ```
2. Update `.env`:
   ```env
   DB_TYPE=mysql
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=skillmint_db
   ```
3. Restart server: `npm start`.
