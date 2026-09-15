-- ====================================================================
-- SkillMint: A Freelance Marketplace Platform for Students and Freshers
-- Academic Year 2026 - III BCA Project
-- Relational Database DDL Script (MySQL 8.0+)
-- Authors: Rithik R. & Rubith Kumar K.
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `skillmint_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `skillmint_db`;

-- 1. Users Table (Core Auth & RBAC)
CREATE TABLE IF NOT EXISTS `Users` (
    `UserID` INT AUTO_INCREMENT PRIMARY KEY,
    `Name` VARCHAR(100) NOT NULL,
    `Email` VARCHAR(150) NOT NULL UNIQUE,
    `Password` VARCHAR(255) NOT NULL,
    `Role` ENUM('Student', 'Client', 'Admin') NOT NULL DEFAULT 'Student',
    `Status` ENUM('Active', 'Pending', 'Suspended') NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`Email`),
    INDEX `idx_users_role` (`Role`),
    INDEX `idx_users_status` (`Status`)
) ENGINE=InnoDB;

-- 2. Student Profile Table
CREATE TABLE IF NOT EXISTS `StudentProfile` (
    `ProfileID` INT AUTO_INCREMENT PRIMARY KEY,
    `UserID` INT NOT NULL UNIQUE,
    `Skills` TEXT NULL COMMENT 'Comma-separated skills (e.g. React, Node.js, Python)',
    `Department` VARCHAR(100) NULL DEFAULT 'Computer Applications',
    `Semester` VARCHAR(20) NULL,
    `Bio` TEXT NULL,
    `PortfolioURL` VARCHAR(255) NULL,
    `Rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    `CompletedProjects` INT NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_student_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Client Profile Table
CREATE TABLE IF NOT EXISTS `ClientProfile` (
    `ProfileID` INT AUTO_INCREMENT PRIMARY KEY,
    `UserID` INT NOT NULL UNIQUE,
    `CompanyName` VARCHAR(150) NULL,
    `Industry` VARCHAR(100) NULL,
    `ContactInfo` VARCHAR(150) NULL,
    `Bio` TEXT NULL,
    `Rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_client_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS `Projects` (
    `ProjectID` INT AUTO_INCREMENT PRIMARY KEY,
    `ClientID` INT NOT NULL,
    `Title` VARCHAR(200) NOT NULL,
    `Description` TEXT NOT NULL,
    `Category` VARCHAR(100) NOT NULL DEFAULT 'Web Development',
    `RequiredSkills` VARCHAR(255) NOT NULL,
    `Budget` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `Deadline` DATE NOT NULL,
    `Status` ENUM('Open', 'InProgress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Open',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_projects_client` FOREIGN KEY (`ClientID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE,
    INDEX `idx_projects_category` (`Category`),
    INDEX `idx_projects_status` (`Status`),
    INDEX `idx_projects_deadline` (`Deadline`)
) ENGINE=InnoDB;

-- 5. Applications Table (Student Hiring Lifecycle)
CREATE TABLE IF NOT EXISTS `Applications` (
    `ApplicationID` INT AUTO_INCREMENT PRIMARY KEY,
    `ProjectID` INT NOT NULL,
    `StudentID` INT NOT NULL,
    `CoverMessage` TEXT NOT NULL,
    `PortfolioLink` VARCHAR(255) NULL,
    `ProposedTimeline` VARCHAR(100) NULL,
    `BidAmount` DECIMAL(10,2) NULL,
    `Status` ENUM('Submitted', 'UnderReview', 'Accepted', 'Rejected', 'Withdrawn') NOT NULL DEFAULT 'Submitted',
    `AppliedDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_app_project` FOREIGN KEY (`ProjectID`) REFERENCES `Projects` (`ProjectID`) ON DELETE CASCADE,
    CONSTRAINT `fk_app_student` FOREIGN KEY (`StudentID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE,
    CONSTRAINT `uq_student_project_app` UNIQUE (`ProjectID`, `StudentID`),
    INDEX `idx_app_status` (`Status`)
) ENGINE=InnoDB;

-- 6. Student Portfolio Items Table
CREATE TABLE IF NOT EXISTS `Portfolio` (
    `PortfolioID` INT AUTO_INCREMENT PRIMARY KEY,
    `StudentID` INT NOT NULL,
    `Title` VARCHAR(150) NOT NULL,
    `Description` TEXT NULL,
    `ProjectURL` VARCHAR(255) NULL,
    `MediaURL` VARCHAR(255) NULL,
    `UploadedDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_portfolio_student` FOREIGN KEY (`StudentID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Messages Table (Real-Time Communication History)
CREATE TABLE IF NOT EXISTS `Messages` (
    `MessageID` INT AUTO_INCREMENT PRIMARY KEY,
    `SenderID` INT NOT NULL,
    `ReceiverID` INT NOT NULL,
    `MessageText` TEXT NOT NULL,
    `SentDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `IsRead` BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT `fk_msg_sender` FOREIGN KEY (`SenderID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE,
    CONSTRAINT `fk_msg_receiver` FOREIGN KEY (`ReceiverID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE,
    INDEX `idx_msg_conversation` (`SenderID`, `ReceiverID`),
    INDEX `idx_msg_sentdate` (`SentDate`)
) ENGINE=InnoDB;

-- 8. Reviews & Ratings Table
CREATE TABLE IF NOT EXISTS `Reviews` (
    `ReviewID` INT AUTO_INCREMENT PRIMARY KEY,
    `ProjectID` INT NOT NULL,
    `ReviewerID` INT NOT NULL,
    `RevieweeID` INT NOT NULL,
    `Rating` TINYINT NOT NULL CHECK (`Rating` BETWEEN 1 AND 5),
    `Comment` TEXT NULL,
    `ReviewDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_review_project` FOREIGN KEY (`ProjectID`) REFERENCES `Projects` (`ProjectID`) ON DELETE CASCADE,
    CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`ReviewerID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE,
    CONSTRAINT `fk_review_reviewee` FOREIGN KEY (`RevieweeID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ====================================================================
-- NOTE FOR XAMPP / MYSQL WORKBENCH:
-- To populate initial realistic demo data based on Section 10 of the
-- project review report, execute the companion script:
--
--   SOURCE seed_data.sql;
--   OR in terminal: mysql -u root -p skillmint_db < seed_data.sql
-- ====================================================================

