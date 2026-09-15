const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
let dbInstance = null;
let mysqlPool = null;

/**
 * Initializes the Database based on configuration
 */
async function initDB() {
  if (DB_TYPE === 'mysql') {
    const mysql = require('mysql2/promise');
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'skillmint_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    try {
      const connection = await mysqlPool.getConnection();
      console.log('✅ Connected to MySQL Database successfully.');
      connection.release();
    } catch (err) {
      console.error('❌ Failed to connect to MySQL:', err.message);
      throw err;
    }
  } else {
    // Default: SQLite using Node.js 24 native DatabaseSync
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = path.resolve(process.cwd(), process.env.SQLITE_PATH || './skillmint.db');
    
    dbInstance = new DatabaseSync(dbPath);
    console.log(`✅ SQLite Database initialized at: ${dbPath}`);

    // Enable foreign keys in SQLite
    dbInstance.exec('PRAGMA foreign_keys = ON;');

    // Create tables if they do not exist
    const sqliteSchema = `
      CREATE TABLE IF NOT EXISTS Users (
        UserID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        Email TEXT NOT NULL UNIQUE,
        Password TEXT NOT NULL,
        Role TEXT NOT NULL CHECK(Role IN ('Student', 'Client', 'Admin')) DEFAULT 'Student',
        Status TEXT NOT NULL CHECK(Status IN ('Active', 'Pending', 'Suspended')) DEFAULT 'Active',
        CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS StudentProfile (
        ProfileID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL UNIQUE,
        Skills TEXT,
        Department TEXT DEFAULT 'Computer Applications',
        Semester TEXT,
        Bio TEXT,
        PortfolioURL TEXT,
        Rating REAL NOT NULL DEFAULT 0.00,
        CompletedProjects INTEGER NOT NULL DEFAULT 0,
        CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ClientProfile (
        ProfileID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL UNIQUE,
        CompanyName TEXT,
        Industry TEXT,
        ContactInfo TEXT,
        Bio TEXT,
        Rating REAL NOT NULL DEFAULT 0.00,
        CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Projects (
        ProjectID INTEGER PRIMARY KEY AUTOINCREMENT,
        ClientID INTEGER NOT NULL,
        Title TEXT NOT NULL,
        Description TEXT NOT NULL,
        Category TEXT NOT NULL DEFAULT 'Web Development',
        RequiredSkills TEXT NOT NULL,
        Budget REAL NOT NULL DEFAULT 0.00,
        Deadline TEXT NOT NULL,
        Status TEXT NOT NULL CHECK(Status IN ('Open', 'InProgress', 'Completed', 'Cancelled')) DEFAULT 'Open',
        CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (ClientID) REFERENCES Users(UserID) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Applications (
        ApplicationID INTEGER PRIMARY KEY AUTOINCREMENT,
        ProjectID INTEGER NOT NULL,
        StudentID INTEGER NOT NULL,
        CoverMessage TEXT NOT NULL,
        PortfolioLink TEXT,
        ProposedTimeline TEXT,
        BidAmount REAL,
        Status TEXT NOT NULL CHECK(Status IN ('Submitted', 'UnderReview', 'Accepted', 'Rejected', 'Withdrawn')) DEFAULT 'Submitted',
        AppliedDate TEXT NOT NULL DEFAULT (datetime('now')),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(ProjectID, StudentID),
        FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID) ON DELETE CASCADE,
        FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Portfolio (
        PortfolioID INTEGER PRIMARY KEY AUTOINCREMENT,
        StudentID INTEGER NOT NULL,
        Title TEXT NOT NULL,
        Description TEXT,
        ProjectURL TEXT,
        MediaURL TEXT,
        UploadedDate TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Messages (
        MessageID INTEGER PRIMARY KEY AUTOINCREMENT,
        SenderID INTEGER NOT NULL,
        ReceiverID INTEGER NOT NULL,
        MessageText TEXT NOT NULL,
        SentDate TEXT NOT NULL DEFAULT (datetime('now')),
        IsRead INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (SenderID) REFERENCES Users(UserID) ON DELETE CASCADE,
        FOREIGN KEY (ReceiverID) REFERENCES Users(UserID) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Reviews (
        ReviewID INTEGER PRIMARY KEY AUTOINCREMENT,
        ProjectID INTEGER NOT NULL,
        ReviewerID INTEGER NOT NULL,
        RevieweeID INTEGER NOT NULL,
        Rating INTEGER NOT NULL CHECK(Rating BETWEEN 1 AND 5),
        Comment TEXT,
        ReviewDate TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID) ON DELETE CASCADE,
        FOREIGN KEY (ReviewerID) REFERENCES Users(UserID) ON DELETE CASCADE,
        FOREIGN KEY (RevieweeID) REFERENCES Users(UserID) ON DELETE CASCADE
      );
    `;

    dbInstance.exec(sqliteSchema);
  }
}

/**
 * Universal query runner for both SQLite and MySQL
 * @param {string} sql - Parameterized SQL query
 * @param {Array} params - Query arguments
 * @returns {Promise<Array|Object>}
 */
async function query(sql, params = []) {
  if (DB_TYPE === 'mysql') {
    if (!mysqlPool) await initDB();
    const [result] = await mysqlPool.execute(sql, params);
    return result;
  } else {
    // SQLite execution
    if (!dbInstance) await initDB();
    const trimmed = sql.trim();
    const isSelect = /^(SELECT|PRAGMA|WITH)\b/i.test(trimmed);
    const stmt = dbInstance.prepare(sql);

    if (isSelect) {
      // Return array of objects
      return stmt.all(...params);
    } else {
      // Execute mutation (INSERT/UPDATE/DELETE)
      const res = stmt.run(...params);
      return {
        insertId: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : 0,
        affectedRows: res.changes || 0
      };
    }
  }
}

module.exports = {
  initDB,
  query,
  getDBType: () => DB_TYPE
};
