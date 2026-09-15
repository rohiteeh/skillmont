/**
 * Automated Test Suite for SkillMint Core Backend
 * Verifies Authentication, RBAC, Projects, Applications, and Real-Time Socket.io Messaging
 */

const { io: ioClient } = require('socket.io-client');
const { server } = require('../src/server');
const db = require('../src/config/db');
const { seedData } = require('../src/utils/seed');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let studentToken = '';
let clientToken = '';
let studentUser = null;
let clientUser = null;
let testProjectId = null;
let testApplicationId = null;

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  }
}

async function runTests() {
  process.env.PORT = TEST_PORT;
  process.env.NODE_ENV = 'test';

  console.log('🧪 Starting SkillMint Automated Verification Test Suite...\n');

  // Initialize DB and Seed Data for Testing
  await db.initDB();
  await seedData();

  // Start server on test port
  await new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`📡 Test server listening on ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check Endpoint
    // ----------------------------------------------------
    console.log('\n--- 1. Testing System Healthcheck ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returns status 200');
    assert(healthData.status === 'online', 'Health check reports online status');

    // ----------------------------------------------------
    // TEST 2: Authentication & Login
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Authentication & JWT Generation ---');
    
    // Login Student
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Email: 'student@skillmint.edu',
        Password: 'Password123!'
      })
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200, 'Student login returns 200 OK');
    assert(studentLoginData.data.token, 'Student receives valid JWT token');
    assert(studentLoginData.data.user.Role === 'Student', 'User role is Student');
    studentToken = studentLoginData.data.token;
    studentUser = studentLoginData.data.user;

    // Login Client
    const clientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Email: 'client@skillmint.biz',
        Password: 'Password123!'
      })
    });
    const clientLoginData = await clientLoginRes.json();
    assert(clientLoginRes.status === 200, 'Client login returns 200 OK');
    assert(clientLoginData.data.token, 'Client receives valid JWT token');
    assert(clientLoginData.data.user.Role === 'Client', 'User role is Client');
    clientToken = clientLoginData.data.token;
    clientUser = clientLoginData.data.user;

    // Register a new Student
    const uniqueEmail = `test.student.${Date.now()}@skillmint.edu`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Name: 'Alex Student',
        Email: uniqueEmail,
        Password: 'Password123!',
        Role: 'Student',
        Department: 'BCA',
        Semester: 'IV'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Student registration returns 201 Created');
    assert(regData.data.user.Email === uniqueEmail, 'Registered user has correct email');

    // ----------------------------------------------------
    // TEST 3: Role-Based Access Control (RBAC) Guard Tests
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Role-Based Access Control (RBAC) ---');

    // Student attempts to post a project (Should be 403 Forbidden)
    const studentPostProjectRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        Title: 'Unauthorized Project Attempt',
        Description: 'Student should not be able to post projects.',
        RequiredSkills: 'Node.js',
        Budget: 100,
        Deadline: '2026-12-31'
      })
    });
    assert(studentPostProjectRes.status === 403, 'Student cannot post project (403 Forbidden enforced)');

    // Client attempts to apply to a project (Should be 403 Forbidden)
    const clientApplyRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        ProjectID: 1,
        CoverMessage: 'Client attempting to apply should be blocked.'
      })
    });
    assert(clientApplyRes.status === 403, 'Client cannot apply for project (403 Forbidden enforced)');

    // ----------------------------------------------------
    // TEST 4: Project Lifecycle (Client Posts Project)
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Project Creation & Browsing ---');
    
    const postProjRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        Title: 'Full-Stack Freelance Portal Test',
        Description: 'Building dynamic student project portfolio review modules.',
        Category: 'Web Development',
        RequiredSkills: 'React, Node.js, Express',
        Budget: 500,
        Deadline: '2026-12-15'
      })
    });
    const postProjData = await postProjRes.json();
    assert(postProjRes.status === 201, 'Client posts project successfully (201 Created)');
    assert(postProjData.data.ProjectID > 0, 'ProjectID assigned');
    testProjectId = postProjData.data.ProjectID;

    // Browse projects
    const listProjRes = await fetch(`${BASE_URL}/projects?skills=React`);
    const listProjData = await listProjRes.json();
    assert(listProjRes.status === 200, 'Project list retrieved');
    assert(listProjData.data.length > 0, 'Filter by skills returns matching projects');

    // ----------------------------------------------------
    // TEST 5: Project Application & Hiring Flow
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Application Submission & Hiring Status ---');

    // Student applies to the newly created project
    const applyRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        ProjectID: testProjectId,
        CoverMessage: 'I am highly interested in this full-stack project. Check my GitHub portfolio.',
        PortfolioLink: 'https://github.com/rithik/portfolio',
        ProposedTimeline: '7 days',
        BidAmount: 450
      })
    });
    const applyData = await applyRes.json();
    assert(applyRes.status === 201, 'Student applies to project (201 Created)');
    testApplicationId = applyData.data.ApplicationID;

    // Test duplicate prevention
    const dupApplyRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        ProjectID: testProjectId,
        CoverMessage: 'Second attempt should fail.'
      })
    });
    assert(dupApplyRes.status === 409, 'Duplicate application blocked with 409 Conflict');

    // Client views applicants for their project
    const viewAppsRes = await fetch(`${BASE_URL}/applications/project/${testProjectId}`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const viewAppsData = await viewAppsRes.json();
    assert(viewAppsRes.status === 200, 'Client retrieves project applicants');
    assert(viewAppsData.data.length === 1, 'Client sees exactly 1 applicant for this project');
    assert(viewAppsData.data[0].StudentName === studentUser.Name, 'Applicant details match student user');

    // Client accepts applicant (PATCH /api/applications/:id/status)
    const patchStatusRes = await fetch(`${BASE_URL}/applications/${testApplicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ status: 'Accepted' })
    });
    const patchStatusData = await patchStatusRes.json();
    assert(patchStatusRes.status === 200, 'Client accepts application (200 OK)');
    assert(patchStatusData.data.NewStatus === 'Accepted', 'Application status updated to Accepted');
    assert(patchStatusData.data.ProjectStatus === 'InProgress', 'Project status automatically updated to InProgress');

    // ----------------------------------------------------
    // TEST 6: Real-Time Messaging with Socket.io
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Real-Time Messaging & Socket.io ---');

    await new Promise((resolve, reject) => {
      // Connect Client Socket
      const clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: clientToken }
      });

      // Connect Student Socket
      const studentSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: studentToken }
      });

      let clientConnected = false;
      let studentConnected = false;

      function checkConnected() {
        if (clientConnected && studentConnected) {
          console.log('⚡ Both Client and Student Sockets connected and authenticated.');
          runSocketMessaging();
        }
      }

      clientSocket.on('connect', () => {
        clientConnected = true;
        checkConnected();
      });

      studentSocket.on('connect', () => {
        studentConnected = true;
        checkConnected();
      });

      function runSocketMessaging() {
        // Set up student listener for incoming real-time message
        studentSocket.on('receive_message', (msg) => {
          assert(msg.MessageText === 'Hello from Client via Socket.io!', 'Student received real-time socket message');
          assert(msg.SenderID === clientUser.UserID, 'SenderID correctly matches Client UserID');
          assert(msg.IsOnlineDelivery === true, 'Message flagged as online delivery');

          // Clean up sockets
          clientSocket.disconnect();
          studentSocket.disconnect();
          resolve();
        });

        // Client emits message to Student
        clientSocket.emit('send_message', {
          receiverId: studentUser.UserID,
          messageText: 'Hello from Client via Socket.io!'
        }, (ack) => {
          assert(ack.success === true, 'Socket send_message acknowledged with success');
          assert(ack.status === 'delivered', 'Message status is delivered in real-time');
        });
      }

      // Timeout safety
      setTimeout(() => {
        clientSocket.disconnect();
        studentSocket.disconnect();
        reject(new Error('Socket.io messaging test timed out.'));
      }, 5000);
    });

    console.log('\n=======================================================');
    console.log(`🎉 ALL TESTS COMPLETED! Passed: ${passedCount}, Failed: ${failedCount}`);
    console.log('=======================================================\n');
  } catch (err) {
    console.error('Test Suite Exception:', err);
  } finally {
    server.close();
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
