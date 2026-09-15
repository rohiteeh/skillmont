-- ====================================================================
-- SkillMint: A Freelance Marketplace Platform for Students and Freshers
-- Academic Year 2026 - III BCA Project
-- Comprehensive Seed Data Script (Section 10)
-- Authors: Rithik R. & Rubith Kumar K.
-- ====================================================================

USE `skillmint_db`;

-- Disable foreign key checks for clean batch seeding
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `Reviews`;
TRUNCATE TABLE `Messages`;
TRUNCATE TABLE `Portfolio`;
TRUNCATE TABLE `Applications`;
TRUNCATE TABLE `Projects`;
TRUNCATE TABLE `ClientProfile`;
TRUNCATE TABLE `StudentProfile`;
TRUNCATE TABLE `Users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- 1. USERS TABLE SEED DATA
-- Passwords are bcrypt hashes for: Password123!
-- ($2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a)
-- ====================================================================
INSERT INTO `Users` (`UserID`, `Name`, `Email`, `Password`, `Role`, `Status`, `CreatedAt`) VALUES
(1, 'Rithik R.', 'rithik.student@skillmint.edu', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Student', 'Active', '2026-08-01 09:00:00'),
(2, 'Rubith Kumar K.', 'rubith.client@skillmint.biz', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Client', 'Active', '2026-08-01 09:30:00'),
(3, 'Dr. Arunkumar M.', 'admin@skillmint.org', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Admin', 'Active', '2026-08-01 10:00:00'),
(4, 'Priya Senthil', 'priya.s@skillmint.edu', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Student', 'Active', '2026-08-02 11:15:00'),
(5, 'Kavitha Nathan', 'kavitha.ui@skillmint.edu', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Student', 'Active', '2026-08-02 14:00:00'),
(6, 'Vortex Tech Labs', 'contact@vortexlabs.io', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Client', 'Active', '2026-08-03 10:30:00'),
(7, 'Apex Brand Solutions', 'info@apexbrand.co', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Client', 'Active', '2026-08-03 16:20:00'),
(8, 'Vikram Chandran', 'vikram.c@skillmint.edu', '$2a$10$3euPcmQZqHk82YJjNn1mOup85J1mS0Ff.2GZp702Q55Hq2vXW4q/a', 'Student', 'Active', '2026-08-04 12:45:00');

-- ====================================================================
-- 2. STUDENT PROFILES
-- ====================================================================
INSERT INTO `StudentProfile` (`ProfileID`, `UserID`, `Skills`, `Department`, `Semester`, `Bio`, `PortfolioURL`, `Rating`, `CompletedProjects`) VALUES
(1, 1, 'React, Node.js, Express, JavaScript, MySQL, Tailwind CSS', 'Computer Applications (BCA)', 'Semester VI', 'Final-year BCA undergraduate focusing on MERN-stack and relational API engineering. Eager to take on challenging web builds.', 'https://github.com/rithik-dev/portfolio', 4.90, 4),
(2, 4, 'Python, Django, SQLite, Pandas, Data Scraping, REST APIs', 'Computer Science & Engineering', 'Semester VI', 'Skilled backend developer and data analysis enthusiast with hands-on experience in automated web crawlers.', 'https://priyasenthil.me', 4.80, 2),
(3, 5, 'Figma, Adobe XD, UI/UX Prototyping, CSS3 animations, HTML5', 'Information Technology', 'Semester IV', 'Passionate UI/UX designer crafting accessible, mobile-first responsive interfaces and high-fidelity design systems.', 'https://dribbble.com/kavithaui', 5.00, 3),
(4, 8, 'Java, Spring Boot, MySQL, Docker, RESTful Microservices', 'Computer Applications (BCA)', 'Semester VI', 'Software engineer aspirant focusing on robust backend services, test-driven development, and database optimization.', 'https://github.com/vikram-chandran', 4.70, 1);

-- ====================================================================
-- 3. CLIENT PROFILES
-- ====================================================================
INSERT INTO `ClientProfile` (`ProfileID`, `UserID`, `CompanyName`, `Industry`, `ContactInfo`, `Bio`, `Rating`) VALUES
(1, 2, 'Rubith Tech Ventures', 'Software Development & IT', 'rubith@rubithtech.biz | +91-9840123456', 'Early-stage tech firm offering bespoke digital products. Committed to mentoring student freelancers and freshers.', 4.95),
(2, 6, 'Vortex Tech Labs', 'FinTech & Cloud Computing', 'careers@vortexlabs.io | +91-9840987654', 'Innovative fintech software consultancy building high-frequency transaction dashboards and developer tooling.', 4.85),
(3, 7, 'Apex Brand Solutions', 'Digital Marketing & Media', 'support@apexbrand.co | +91-9840554433', 'Full-service digital agency delivering modern landing pages, e-commerce stores, and brand identity systems.', 4.75);

-- ====================================================================
-- 4. PROJECTS TABLE SEED DATA
-- ====================================================================
INSERT INTO `Projects` (`ProjectID`, `ClientID`, `Title`, `Description`, `Category`, `RequiredSkills`, `Budget`, `Deadline`, `Status`, `CreatedAt`) VALUES
(1, 2, 'E-Commerce Mobile Responsive UI Redesign', 'Redesign our client storefront using React and Tailwind CSS. Must be mobile-first with dark mode support and Lighthouse score > 90.', 'Frontend Development', 'React, Tailwind CSS, Responsive Design, JavaScript', 35000.00, '2026-10-30', 'InProgress', '2026-08-05 10:00:00'),
(2, 2, 'Full-Stack Student Portfolio Review Portal', 'Develop a portal allowing students to submit their BCA code projects for automated review, badge assignments, and mentor comments.', 'Full Stack Development', 'Node.js, Express, MySQL, Socket.io, HTML5', 55000.00, '2026-11-15', 'Open', '2026-08-06 11:30:00'),
(3, 6, 'Automated Financial Data Crawler & ETL Script', 'Build an automated Python crawler to extract currency exchange rates and stock quotes from public APIs and load them into a relational schema.', 'Data Engineering', 'Python, BeautifulSoup, Pandas, MySQL, Cron', 28000.00, '2026-10-20', 'Open', '2026-08-07 14:15:00'),
(4, 7, 'Interactive High-Fidelity Figma SaaS Design System', 'Create a 20-screen responsive SaaS dashboard in Figma with comprehensive design tokens, auto-layout components, and clickable prototype.', 'UI/UX Design', 'Figma, UI/UX Prototyping, Wireframing, Design Systems', 32000.00, '2026-10-25', 'Open', '2026-08-08 09:45:00'),
(5, 6, 'Spring Boot REST Microservice for Order Processing', 'Develop a secure Spring Boot microservice implementing JWT authentication, order validation logic, and unit test suites.', 'Backend Development', 'Java, Spring Boot, MySQL, JUnit, Docker', 45000.00, '2026-11-05', 'Open', '2026-08-09 15:00:00'),
(6, 2, 'Real-Time Campus Event Notification Bot', 'A lightweight Node.js and Socket.io service broadcasting live college symposium announcements to connected student mobile clients.', 'Web Development', 'Node.js, Socket.io, Express, Redis/SQLite', 20000.00, '2026-10-18', 'Completed', '2026-08-04 08:30:00');

-- ====================================================================
-- 5. APPLICATIONS TABLE SEED DATA
-- ====================================================================
INSERT INTO `Applications` (`ApplicationID`, `ProjectID`, `StudentID`, `CoverMessage`, `PortfolioLink`, `ProposedTimeline`, `BidAmount`, `Status`, `AppliedDate`) VALUES
(1, 1, 1, 'I have built over 5 e-commerce and SaaS layouts with React and Tailwind CSS. I will deliver pixel-perfect responsiveness within 10 days.', 'https://github.com/rithik-dev/ecommerce-showcase', '10 days', 32000.00, 'Accepted', '2026-08-05 14:00:00'),
(2, 1, 5, 'As a UI/UX specialist, I can ensure optimal visual hierarchy and micro-interactions for this redesign.', 'https://dribbble.com/kavithaui/shots/ecommerce', '12 days', 35000.00, 'UnderReview', '2026-08-05 16:30:00'),
(3, 2, 1, 'Our final year BCA project focuses on this exact problem domain. I have deep knowledge of Express and MySQL relational models.', 'https://github.com/rithik-dev/portfolio-system', '14 days', 50000.00, 'Submitted', '2026-08-06 15:20:00'),
(4, 3, 4, 'I specialize in Python web crawling, error-resilient proxies, and automated data pipelines. I can complete this well before the deadline.', 'https://priyasenthil.me/data-crawlers', '7 days', 26000.00, 'Submitted', '2026-08-07 18:00:00'),
(5, 4, 5, 'I have created design systems used by over 3 college startup incubators. Ready to share my master component library.', 'https://dribbble.com/kavithaui/saas-kit', '8 days', 30000.00, 'Submitted', '2026-08-08 12:10:00'),
(6, 5, 8, 'Java Spring Boot and clean architecture is my daily stack. I will provide 90%+ JUnit code coverage.', 'https://github.com/vikram-chandran/order-service', '10 days', 42000.00, 'Submitted', '2026-08-09 18:45:00');

-- ====================================================================
-- 6. PORTFOLIO ITEMS
-- ====================================================================
INSERT INTO `Portfolio` (`PortfolioID`, `StudentID`, `Title`, `Description`, `ProjectURL`, `MediaURL`, `UploadedDate`) VALUES
(1, 1, 'Freelance Hub Marketplace Prototype', 'A responsive freelance portal built using React and Express with full JWT session handling.', 'https://github.com/rithik-dev/freelance-hub', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', '2026-08-02 10:00:00'),
(2, 1, 'College Campus Asset Management System', 'Relational database web application managing department computer labs, issue logs, and servicing cycles.', 'https://github.com/rithik-dev/asset-manager', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600', '2026-08-03 11:30:00'),
(3, 4, 'Automated Job Feed Scraper', 'Python daemon collecting fresher software job openings across multiple tech portals and exporting clean JSON.', 'https://github.com/priyasenthil/job-scraper', 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600', '2026-08-03 14:00:00'),
(4, 5, 'HealthTech Telemedicine App Design', 'Comprehensive 24-screen mobile app prototype designed in Figma adhering to Google Material Design 3 guidelines.', 'https://dribbble.com/kavithaui/healthtech', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600', '2026-08-04 15:45:00');

-- ====================================================================
-- 7. MESSAGES TABLE SEED DATA
-- ====================================================================
INSERT INTO `Messages` (`MessageID`, `SenderID`, `ReceiverID`, `MessageText`, `SentDate`, `IsRead`) VALUES
(1, 2, 1, 'Hello Rithik! We reviewed your proposal for the E-Commerce Redesign project and were thoroughly impressed with your GitHub repositories.', '2026-08-05 14:15:00', 1),
(2, 1, 2, 'Thank you Mr. Rubith! I am really excited about this project. I have already analyzed your current layout and drafted component wireframes.', '2026-08-05 14:20:00', 1),
(3, 2, 1, 'Excellent initiative. I have officially accepted your bid on the portal and marked the project InProgress. Let us coordinate milestones!', '2026-08-05 14:25:00', 1),
(4, 1, 2, 'Understood. I will push the initial header and product grid prototype to the staging branch by tomorrow evening.', '2026-08-05 14:30:00', 0),
(5, 6, 4, 'Hi Priya, does your financial crawler handle pagination and rate limits on Cloudflare protected endpoints?', '2026-08-07 19:00:00', 1),
(6, 4, 6, 'Yes! I use header rotation and exponential backoff retries with rotating user agents to guarantee zero IP blocks.', '2026-08-07 19:15:00', 0);

-- ====================================================================
-- 8. REVIEWS & RATINGS SEED DATA
-- ====================================================================
INSERT INTO `Reviews` (`ReviewID`, `ProjectID`, `ReviewerID`, `RevieweeID`, `Rating`, `Comment`, `ReviewDate`) VALUES
(1, 6, 2, 1, 5, 'Outstanding work! Rithik delivered the campus notification bot ahead of schedule. Clean code, well-documented API endpoints, and great communication.', '2026-08-04 18:00:00'),
(2, 6, 1, 2, 5, 'Fantastic client to work with. Clear requirements, prompt feedback, and milestone approval without delays.', '2026-08-04 19:00:00');

-- Verify seeding counts
SELECT 'Users' AS TableName, COUNT(*) AS TotalRows FROM `Users`
UNION ALL
SELECT 'StudentProfile', COUNT(*) FROM `StudentProfile`
UNION ALL
SELECT 'ClientProfile', COUNT(*) FROM `ClientProfile`
UNION ALL
SELECT 'Projects', COUNT(*) FROM `Projects`
UNION ALL
SELECT 'Applications', COUNT(*) FROM `Applications`
UNION ALL
SELECT 'Portfolio', COUNT(*) FROM `Portfolio`
UNION ALL
SELECT 'Messages', COUNT(*) FROM `Messages`
UNION ALL
SELECT 'Reviews', COUNT(*) FROM `Reviews`;
