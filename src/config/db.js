const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Determine Database Engine based on environment or connection strings
function determineDBType() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MYSQL_URL || '';
  if (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://') || process.env.DB_TYPE === 'postgres' || process.env.DB_TYPE === 'postgresql') {
    return 'postgres';
  }
  if (connStr.startsWith('mysql://') || process.env.MYSQL_URL || process.env.DB_TYPE === 'mysql') {
    return 'mysql';
  }
  return process.env.DB_TYPE || 'sqlite';
}

const DB_TYPE = determineDBType();
let dbInstance = null;
let mysqlPool = null;
let pgPool = null;

/**
 * Initializes the Database based on configuration
 */
async function initDB() {
  if (DB_TYPE === 'postgres') {
    const { Pool } = require('pg');
    const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    pgPool = new Pool({
      connectionString: connStr,
      ssl: (connStr && connStr.includes('localhost')) ? false : { rejectUnauthorized: false }
    });

    try {
      const client = await pgPool.connect();
      console.log('✅ Connected to Cloud PostgreSQL (Neon / Supabase) successfully.');
      client.release();

      // Create PostgreSQL tables if not exist
      const pgSchema = `
        CREATE TABLE IF NOT EXISTS Users (
          UserID SERIAL PRIMARY KEY,
          Name VARCHAR(100) NOT NULL,
          Email VARCHAR(150) NOT NULL UNIQUE,
          Password VARCHAR(255) NOT NULL,
          Role VARCHAR(20) NOT NULL DEFAULT 'Student',
          Status VARCHAR(20) NOT NULL DEFAULT 'Active',
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS StudentProfile (
          ProfileID SERIAL PRIMARY KEY,
          UserID INT NOT NULL UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
          Skills TEXT,
          Department VARCHAR(100) DEFAULT 'Computer Applications',
          Semester VARCHAR(20),
          Bio TEXT,
          PortfolioURL VARCHAR(255),
          Rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
          CompletedProjects INT NOT NULL DEFAULT 0,
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ClientProfile (
          ProfileID SERIAL PRIMARY KEY,
          UserID INT NOT NULL UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
          CompanyName VARCHAR(150),
          Industry VARCHAR(100),
          ContactInfo VARCHAR(150),
          Bio TEXT,
          Rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Projects (
          ProjectID SERIAL PRIMARY KEY,
          ClientID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          Title VARCHAR(200) NOT NULL,
          Description TEXT NOT NULL,
          Category VARCHAR(100) NOT NULL DEFAULT 'Web Development',
          RequiredSkills VARCHAR(255) NOT NULL,
          Budget NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          Deadline DATE NOT NULL,
          Status VARCHAR(20) NOT NULL DEFAULT 'Open',
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Applications (
          ApplicationID SERIAL PRIMARY KEY,
          ProjectID INT NOT NULL REFERENCES Projects(ProjectID) ON DELETE CASCADE,
          StudentID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          CoverMessage TEXT NOT NULL,
          PortfolioLink VARCHAR(255),
          ProposedTimeline VARCHAR(100),
          BidAmount NUMERIC(10,2),
          Status VARCHAR(20) NOT NULL DEFAULT 'Submitted',
          AppliedDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(ProjectID, StudentID)
        );

        CREATE TABLE IF NOT EXISTS Portfolio (
          PortfolioID SERIAL PRIMARY KEY,
          StudentID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          Title VARCHAR(200) NOT NULL,
          Description TEXT,
          ProjectURL VARCHAR(255),
          MediaURL VARCHAR(255),
          UploadedDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Messages (
          MessageID SERIAL PRIMARY KEY,
          SenderID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          ReceiverID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          MessageText TEXT NOT NULL,
          SentDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          IsRead INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS Reviews (
          ReviewID SERIAL PRIMARY KEY,
          ProjectID INT NOT NULL REFERENCES Projects(ProjectID) ON DELETE CASCADE,
          ReviewerID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          RevieweeID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
          Rating INT NOT NULL,
          Comment TEXT,
          ReviewDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pgPool.query(pgSchema);
      console.log('✅ PostgreSQL schema verified & ready.');
    } catch (err) {
      console.error('❌ Failed to connect to PostgreSQL:', err.message);
      throw err;
    }
  } else if (DB_TYPE === 'mysql') {
    const mysql = require('mysql2/promise');
    const connStr = process.env.MYSQL_URL || process.env.DATABASE_URL;

    if (connStr && typeof connStr === 'string' && connStr.startsWith('mysql')) {
      mysqlPool = mysql.createPool({
        uri: connStr,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: connStr.includes('localhost') ? undefined : { rejectUnauthorized: false }
      });
    } else {
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
        keepAliveInitialDelay: 10000,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      });
    }

    try {
      const connection = await mysqlPool.getConnection();
      console.log('✅ Connected to MySQL Database (Aiven / Localhost) successfully.');
      connection.release();

      // Create MySQL tables if not exist
      const mysqlSchema = `
        CREATE TABLE IF NOT EXISTS Users (
          UserID INT AUTO_INCREMENT PRIMARY KEY,
          Name VARCHAR(100) NOT NULL,
          Email VARCHAR(150) NOT NULL UNIQUE,
          Password VARCHAR(255) NOT NULL,
          Role ENUM('Student', 'Client', 'Admin') NOT NULL DEFAULT 'Student',
          Status ENUM('Active', 'Pending', 'Suspended') NOT NULL DEFAULT 'Active',
          CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_users_email (Email),
          INDEX idx_users_role (Role)
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS StudentProfile (
          ProfileID INT AUTO_INCREMENT PRIMARY KEY,
          UserID INT NOT NULL UNIQUE,
          Skills TEXT NULL,
          Department VARCHAR(100) NULL DEFAULT 'Computer Applications',
          Semester VARCHAR(20) NULL,
          Bio TEXT NULL,
          PortfolioURL VARCHAR(255) NULL,
          Rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
          CompletedProjects INT NOT NULL DEFAULT 0,
          CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS ClientProfile (
          ProfileID INT AUTO_INCREMENT PRIMARY KEY,
          UserID INT NOT NULL UNIQUE,
          CompanyName VARCHAR(150) NULL,
          Industry VARCHAR(100) NULL,
          ContactInfo VARCHAR(150) NULL,
          Bio TEXT NULL,
          Rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
          CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS Projects (
          ProjectID INT AUTO_INCREMENT PRIMARY KEY,
          ClientID INT NOT NULL,
          Title VARCHAR(200) NOT NULL,
          Description TEXT NOT NULL,
          Category VARCHAR(100) NOT NULL DEFAULT 'Web Development',
          RequiredSkills VARCHAR(255) NOT NULL,
          Budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          Deadline DATE NOT NULL,
          Status ENUM('Open', 'InProgress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Open',
          CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (ClientID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS Applications (
          ApplicationID INT AUTO_INCREMENT PRIMARY KEY,
          ProjectID INT NOT NULL,
          StudentID INT NOT NULL,
          CoverMessage TEXT NOT NULL,
          PortfolioLink VARCHAR(255) NULL,
          ProposedTimeline VARCHAR(100) NULL,
          BidAmount DECIMAL(10,2) NULL,
          Status ENUM('Submitted', 'UnderReview', 'Accepted', 'Rejected', 'Withdrawn') NOT NULL DEFAULT 'Submitted',
          AppliedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_project_student (ProjectID, StudentID),
          FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID) ON DELETE CASCADE,
          FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS Portfolio (
          PortfolioID INT AUTO_INCREMENT PRIMARY KEY,
          StudentID INT NOT NULL,
          Title VARCHAR(200) NOT NULL,
          Description TEXT NULL,
          ProjectURL VARCHAR(255) NULL,
          MediaURL VARCHAR(255) NULL,
          UploadedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS Messages (
          MessageID INT AUTO_INCREMENT PRIMARY KEY,
          SenderID INT NOT NULL,
          ReceiverID INT NOT NULL,
          MessageText TEXT NOT NULL,
          SentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          IsRead TINYINT(1) NOT NULL DEFAULT 0,
          FOREIGN KEY (SenderID) REFERENCES Users(UserID) ON DELETE CASCADE,
          FOREIGN KEY (ReceiverID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS Reviews (
          ReviewID INT AUTO_INCREMENT PRIMARY KEY,
          ProjectID INT NOT NULL,
          ReviewerID INT NOT NULL,
          RevieweeID INT NOT NULL,
          Rating TINYINT NOT NULL,
          Comment TEXT NULL,
          ReviewDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID) ON DELETE CASCADE,
          FOREIGN KEY (ReviewerID) REFERENCES Users(UserID) ON DELETE CASCADE,
          FOREIGN KEY (RevieweeID) REFERENCES Users(UserID) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `;
      // Split and run each CREATE TABLE statement
      const statements = mysqlSchema.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await mysqlPool.execute(stmt);
      }
      console.log('✅ MySQL schema verified & ready.');
    } catch (err) {
      console.error('❌ Failed to connect to MySQL:', err.message);
      throw err;
    }
  } else {
    // Default: SQLite using Node.js 24 native DatabaseSync
    const { DatabaseSync } = require('node:sqlite');
    let dbPath;
    if (process.env.VERCEL) {
      dbPath = path.join('/tmp', 'skillmint.db');
      const seedDb = path.resolve(__dirname, '../../skillmint.db');
      if (fs.existsSync(seedDb) && !fs.existsSync(dbPath)) {
        try {
          fs.copyFileSync(seedDb, dbPath);
          console.log('✅ Seed database copied to /tmp for Vercel execution.');
        } catch (e) {
          console.warn('⚠️ Could not copy seed db, creating fresh:', e.message);
        }
      }
    } else {
      dbPath = path.resolve(process.cwd(), process.env.SQLITE_PATH || './skillmint.db');
    }
    
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
 * Universal query runner for SQLite, MySQL, and PostgreSQL
 * @param {string} sql - Parameterized SQL query
 * @param {Array} params - Query arguments
 * @returns {Promise<Array|Object>}
 */
async function query(sql, params = []) {
  if (DB_TYPE === 'postgres') {
    if (!pgPool) await initDB();
    const trimmed = sql.trim();
    const isInsert = /^INSERT\b/i.test(trimmed);
    const isSelect = /^(SELECT|WITH)\b/i.test(trimmed);

    let pgSql = sql;
    if (isInsert && !/RETURNING\b/i.test(pgSql)) {
      pgSql += ' RETURNING *';
    }

    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`)
                 .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

    const res = await pgPool.query(pgSql, params);

    if (isSelect) {
      return res.rows;
    } else if (isInsert) {
      const row = res.rows[0] || {};
      const insertId = row.userid || row.projectid || row.applicationid || row.profileid || row.messageid || row.reviewid || row.portfolioid || Object.values(row)[0] || 0;
      return {
        insertId: Number(insertId),
        affectedRows: res.rowCount || 0,
        ...row
      };
    } else {
      return {
        insertId: 0,
        affectedRows: res.rowCount || 0
      };
    }
  } else if (DB_TYPE === 'mysql') {
    if (!mysqlPool) await initDB();
    const mysqlSql = sql.replace(/datetime\('now'\)/gi, 'NOW()');
    const [result] = await mysqlPool.execute(mysqlSql, params);
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
