const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedData() {
  console.log('🌱 Starting SkillMint database seeding...');
  await db.initDB();

  // Check if users already exist
  const existingUsers = await db.query('SELECT COUNT(*) AS count FROM Users');
  const count = existingUsers[0].count || existingUsers[0]['COUNT(*)'] || 0;

  if (count > 0) {
    console.log('ℹ️ Database already has data. Skipping seed.');
    return;
  }

  const defaultPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Student User
  const studentUser = await db.query(
    `INSERT INTO Users (Name, Email, Password, Role, Status) 
     VALUES (?, ?, ?, 'Student', 'Active')`,
    ['Rithik Student', 'student@skillmint.edu', hashedPassword]
  );
  const studentId = studentUser.insertId;

  await db.query(
    `INSERT INTO StudentProfile (UserID, Skills, Department, Semester, Bio, PortfolioURL, Rating, CompletedProjects)
     VALUES (?, ?, ?, ?, ?, ?, 4.9, 2)`,
    [
      studentId,
      'React, Node.js, Express, JavaScript, MySQL, Tailwind CSS',
      'Computer Applications (BCA)',
      'Semester VI',
      'Third-year BCA student passionate about building clean, performant full-stack web applications and APIs.',
      'https://github.com/skillmint/student-portfolio'
    ]
  );

  // 2. Seed Client User
  const clientUser = await db.query(
    `INSERT INTO Users (Name, Email, Password, Role, Status) 
     VALUES (?, ?, ?, 'Client', 'Active')`,
    ['Rubith Tech Ventures', 'client@skillmint.biz', hashedPassword]
  );
  const clientId = clientUser.insertId;

  await db.query(
    `INSERT INTO ClientProfile (UserID, CompanyName, Industry, ContactInfo, Bio, Rating)
     VALUES (?, ?, ?, ?, ?, 5.0)`,
    [
      clientId,
      'Rubith Tech Solutions Pvt Ltd',
      'Software & IT Services',
      'contact@rubithtech.biz | +91-9876543210',
      'Early-stage tech firm hiring passionate students and freshers for web development and freelance client projects.'
    ]
  );

  // 3. Seed Admin User
  const adminUser = await db.query(
    `INSERT INTO Users (Name, Email, Password, Role, Status) 
     VALUES (?, ?, ?, 'Admin', 'Active')`,
    ['SkillMint Admin', 'admin@skillmint.org', hashedPassword]
  );

  console.log('✅ Demo Users created:');
  console.log('   - Student: student@skillmint.edu (Password: Password123!)');
  console.log('   - Client:  client@skillmint.biz  (Password: Password123!)');
  console.log('   - Admin:   admin@skillmint.org   (Password: Password123!)');

  // 4. Seed Sample Projects
  const project1 = await db.query(
    `INSERT INTO Projects (ClientID, Title, Description, Category, RequiredSkills, Budget, Deadline, Status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
    [
      clientId,
      'Modern E-Commerce Mobile Responsive UI Redesign',
      'Need a modern, fast-loading responsive frontend redesign for our retail client portal with smooth micro-interactions.',
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
      'Student Portfolio & Freelance Dashboard System',
      'Build dynamic student portfolio review modules with verified skill badges and automated project hiring pipelines.',
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
      'Automated Data Scraping & Analysis Pipeline',
      'Create a reliable Python script to scrape open academic datasets and format them into clean CSV/JSON feeds.',
      'Data Engineering',
      'Python, BeautifulSoup, Pandas, SQLite',
      25000.00,
      '2026-10-15'
    ]
  );

  console.log('✅ Sample Projects created.');

  // 5. Seed Sample Application
  await db.query(
    `INSERT INTO Applications (ProjectID, StudentID, CoverMessage, PortfolioLink, ProposedTimeline, BidAmount, Status)
     VALUES (?, ?, ?, ?, ?, ?, 'Submitted')`,
    [
      project1.insertId,
      studentId,
      'I have 2 years of experience with React and modern responsive web design. I have built similar e-commerce dashboards in my BCA coursework.',
      'https://github.com/skillmint/student-portfolio',
      '10 days',
      32000.00
    ]
  );
  console.log('✅ Sample Application submitted.');

  // 6. Seed Sample Direct Message
  await db.query(
    `INSERT INTO Messages (SenderID, ReceiverID, MessageText, IsRead)
     VALUES (?, ?, ?, 1)`,
    [clientId, studentId, 'Hello Rithik! We reviewed your application and liked your portfolio projects.']
  );

  await db.query(
    `INSERT INTO Messages (SenderID, ReceiverID, MessageText, IsRead)
     VALUES (?, ?, ?, 0)`,
    [studentId, clientId, 'Thank you! I am ready to discuss the project milestones at your convenience.']
  );
  console.log('✅ Sample Messages inserted.');

  console.log('🎉 Seeding completed successfully!');
}

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedData };
