/**
 * SkillMint Database Provisioning & Seeding Utility
 * Academic Year 2026 - III BCA Capstone Project
 * Usage:
 *   node src/utils/createDatabase.js         (Creates DB and tables if missing, seeds if empty)
 *   node src/utils/createDatabase.js --reset (Drops existing tables, recreates schema, and seeds fresh data)
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function createDatabase(options = {}) {
  const isReset = options.reset || process.argv.includes('--reset');

  console.log('=======================================================');
  console.log('🛠️  SkillMint Relational Database Creation Tool');
  console.log('=======================================================');

  // Initialize DB engine
  await db.initDB();
  const dbType = db.getDBType();
  console.log(`📡 Database Engine: ${dbType.toUpperCase()}`);

  if (isReset) {
    console.log('⚠️  Reset flag detected: Dropping existing tables...');
    const dropTables = [
      'Reviews',
      'Messages',
      'Portfolio',
      'Applications',
      'Projects',
      'ClientProfile',
      'StudentProfile',
      'Users'
    ];

    for (const table of dropTables) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${table}`);
      } catch (err) {
        console.warn(`Could not drop ${table}:`, err.message);
      }
    }
    console.log('🧹 Cleaned existing tables.');
    // Re-initialize schema
    await db.initDB();
  }

  // Check if Users table has data
  const existingUsers = await db.query('SELECT COUNT(*) AS count FROM Users');
  const userCount = existingUsers[0]?.count || existingUsers[0]?.['COUNT(*)'] || 0;

  if (userCount === 0) {
    console.log('🌱 Seeding fresh initial records...');
    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 1. Student User
    const studentUser = await db.query(
      `INSERT INTO Users (Name, Email, Password, Role, Status) 
       VALUES (?, ?, ?, 'Student', 'Active')`,
      ['Rithik Student', 'student@skillmint.edu', hashedPassword]
    );
    const studentId = studentUser.insertId;

    await db.query(
      `INSERT INTO StudentProfile (UserID, Skills, Department, Semester, Bio, PortfolioURL, Rating, CompletedProjects)
       VALUES (?, ?, ?, ?, ?, ?, 4.90, 4)`,
      [
        studentId,
        'React, Node.js, Express, JavaScript, MySQL, Tailwind CSS',
        'Computer Applications (BCA)',
        'Semester VI',
        'Third-year BCA undergraduate focusing on full-stack web architectures and relational database systems.',
        'https://github.com/skillmint/student-portfolio'
      ]
    );

    // 2. Client User
    const clientUser = await db.query(
      `INSERT INTO Users (Name, Email, Password, Role, Status) 
       VALUES (?, ?, ?, 'Client', 'Active')`,
      ['Rubith Tech Ventures', 'client@skillmint.biz', hashedPassword]
    );
    const clientId = clientUser.insertId;

    await db.query(
      `INSERT INTO ClientProfile (UserID, CompanyName, Industry, ContactInfo, Bio, Rating)
       VALUES (?, ?, ?, ?, ?, 5.00)`,
      [
        clientId,
        'Rubith Tech Solutions Pvt Ltd',
        'Software Development & IT',
        'contact@rubithtech.biz | +91-9876543210',
        'Early-stage digital product consultancy hiring skilled undergraduate developers for client projects.'
      ]
    );

    // 3. Admin User
    await db.query(
      `INSERT INTO Users (Name, Email, Password, Role, Status) 
       VALUES (?, ?, ?, 'Admin', 'Active')`,
      ['SkillMint Admin', 'admin@skillmint.org', hashedPassword]
    );

    // 4. Sample Projects
    const project1 = await db.query(
      `INSERT INTO Projects (ClientID, Title, Description, Category, RequiredSkills, Budget, Deadline, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'InProgress')`,
      [
        clientId,
        'Modern E-Commerce Mobile Responsive UI Redesign',
        'Redesign our client retail storefront using React and modern CSS. Must be mobile-first with high performance.',
        'Frontend Development',
        'HTML5, CSS3, React, Tailwind CSS',
        35000.00,
        '2026-10-30'
      ]
    );

    const project2 = await db.query(
      `INSERT INTO Projects (ClientID, Title, Description, Category, RequiredSkills, Budget, Deadline, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [
        clientId,
        'Full-Stack Student Portfolio Review Portal',
        'Develop a portal allowing students to submit their BCA code projects for automated review, badge assignments, and mentor comments.',
        'Full Stack Development',
        'Node.js, Express, MySQL, Socket.io',
        55000.00,
        '2026-11-15'
      ]
    );

    const project3 = await db.query(
      `INSERT INTO Projects (ClientID, Title, Description, Category, RequiredSkills, Budget, Deadline, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [
        clientId,
        'Automated Academic Data Crawler & Analytics Script',
        'Build a reliable Python web crawler to extract academic research datasets and load them into clean relational schema.',
        'Data Engineering',
        'Python, BeautifulSoup, Pandas, SQLite',
        25000.00,
        '2026-10-15'
      ]
    );

    // 5. Sample Application
    await db.query(
      `INSERT INTO Applications (ProjectID, StudentID, CoverMessage, PortfolioLink, ProposedTimeline, BidAmount, Status)
       VALUES (?, ?, ?, ?, ?, ?, 'Accepted')`,
      [
        project1.insertId,
        studentId,
        'I have built several responsive portals in my BCA coursework. I will deliver clean, modular code with full unit test coverage.',
        'https://github.com/skillmint/student-portfolio',
        '10 days',
        32000.00
      ]
    );

    // 6. Direct Messages
    await db.query(
      `INSERT INTO Messages (SenderID, ReceiverID, MessageText, IsRead)
       VALUES (?, ?, ?, 1)`,
      [clientId, studentId, 'Hello Rithik! We reviewed your proposal and were very impressed with your repository.']
    );
    await db.query(
      `INSERT INTO Messages (SenderID, ReceiverID, MessageText, IsRead)
       VALUES (?, ?, ?, 0)`,
      [studentId, clientId, 'Thank you! I am ready to discuss the milestones and deliver the initial UI draft.']
    );

    // 7. Review & Rating
    await db.query(
      `INSERT INTO Reviews (ProjectID, ReviewerID, RevieweeID, Rating, Comment)
       VALUES (?, ?, ?, 5.0, 'Outstanding technical work, delivered 3 days ahead of schedule with clean code documentation.')`,
      [project1.insertId, clientId, studentId]
    );

    console.log('✅ Seed data successfully inserted.');
  } else {
    console.log(`ℹ️  Database already contains ${userCount} active users. Skipping seed.`);
  }

  // Summary audit
  console.log('-------------------------------------------------------');
  console.log('📊 Current Database Table Counts:');
  const auditTables = ['Users', 'StudentProfile', 'ClientProfile', 'Projects', 'Applications', 'Messages', 'Reviews'];
  for (const tbl of auditTables) {
    try {
      const res = await db.query(`SELECT COUNT(*) AS c FROM ${tbl}`);
      const c = res[0]?.c || res[0]?.['COUNT(*)'] || 0;
      console.log(`   - ${tbl.padEnd(16)}: ${c} records`);
    } catch (e) {
      console.warn(`   - ${tbl.padEnd(16)}: (Table check error: ${e.message})`);
    }
  }
  console.log('=======================================================');
  console.log('🎉 Database is ready for platform operations!');
  console.log('=======================================================');
}

if (require.main === module) {
  createDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Database creation failed:', err);
      process.exit(1);
    });
}

module.exports = { createDatabase };
