/**
 * SkillMint Dedicated Authentication Portal Logic (login.js)
 * Academic Year 2026 - III BCA Capstone Project
 * Handles Sign In, Registration, 1-Click Viva Presets, and JWT Session Management
 */

const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// 1-Click Viva Demonstration Accounts
const VIVA_DEMO_CREDENTIALS = {
  student: {
    email: 'student@skillmint.edu',
    password: 'Password123!',
    role: 'Student'
  },
  client: {
    email: 'client@skillmint.biz',
    password: 'Password123!',
    role: 'Client'
  },
  admin: {
    email: 'admin@skillmint.org',
    password: 'Password123!',
    role: 'Admin'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
  parseUrlParameters();
});

/**
 * Check if the user is already logged in with a valid cached session
 */
function checkExistingSession() {
  const token = localStorage.getItem('skillmint_token');
  const cachedUser = localStorage.getItem('skillmint_user');

  if (token && cachedUser) {
    try {
      const user = JSON.parse(cachedUser);
      const banner = document.getElementById('existingSessionBanner');
      const nameEl = document.getElementById('sessionUserName');
      const roleEl = document.getElementById('sessionUserRole');
      const avatarEl = document.getElementById('sessionAvatar');

      if (banner && nameEl && roleEl && avatarEl) {
        nameEl.textContent = user.Name || 'Active User';
        roleEl.textContent = `${user.Role || 'Member'} Account Active`;
        avatarEl.textContent = (user.Name || 'U').charAt(0).toUpperCase();
        banner.style.display = 'flex';
      }
    } catch (e) {
      console.warn('Could not parse cached user data:', e);
    }
  }
}

/**
 * Handle URL query params (e.g. ?tab=register or ?role=client)
 */
function parseUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const role = params.get('role');

  if (tab === 'register') {
    switchAuthTab('register');
  }

  if (role && (role.toLowerCase() === 'client' || role.toLowerCase() === 'student')) {
    selectRegisterRole(role.charAt(0).toUpperCase() + role.slice(1).toLowerCase());
  }
}

/**
 * Tab Navigation (Sign In vs Register)
 */
function switchAuthTab(tabKey) {
  const tabSignIn = document.getElementById('tabBtnSignIn');
  const tabRegister = document.getElementById('tabBtnRegister');
  const panelSignIn = document.getElementById('panelSignIn');
  const panelRegister = document.getElementById('panelRegister');

  clearAuthAlert();

  if (tabKey === 'signin') {
    tabSignIn.classList.add('active');
    tabSignIn.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');

    panelSignIn.classList.add('active');
    panelRegister.classList.remove('active');
  } else {
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabSignIn.classList.remove('active');
    tabSignIn.setAttribute('aria-selected', 'false');

    panelRegister.classList.add('active');
    panelSignIn.classList.remove('active');
  }
}

/**
 * Toggle Password Visibility (Eye icon)
 */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.setAttribute('title', 'Hide password');
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.setAttribute('title', 'Show password');
  }
}

/**
 * Role Selection in Registration Tab
 */
function selectRegisterRole(role) {
  const inputRole = document.getElementById('registerRole');
  const cardStudent = document.getElementById('roleCardStudent');
  const cardClient = document.getElementById('roleCardClient');
  const studentFields = document.getElementById('studentFieldsContainer');
  const clientFields = document.getElementById('clientFieldsContainer');

  if (inputRole) inputRole.value = role;

  if (role === 'Student') {
    cardStudent.classList.add('selected');
    cardClient.classList.remove('selected');
    if (studentFields) studentFields.style.display = 'block';
    if (clientFields) clientFields.style.display = 'none';
  } else {
    cardClient.classList.add('selected');
    cardStudent.classList.remove('selected');
    if (studentFields) studentFields.style.display = 'none';
    if (clientFields) clientFields.style.display = 'block';
  }
}

/**
 * 1-Click Viva Presets Handler
 */
async function quickFillAndLogin(presetKey) {
  const creds = VIVA_DEMO_CREDENTIALS[presetKey];
  if (!creds) return;

  // Switch to sign-in tab first
  switchAuthTab('signin');

  const emailField = document.getElementById('loginEmail');
  const pwdField = document.getElementById('loginPassword');

  if (emailField) emailField.value = creds.email;
  if (pwdField) pwdField.value = creds.password;

  showAuthAlert(`Auto-authenticating as ${creds.role} for viva demonstration...`, 'success');

  // Trigger login immediately
  await executeLogin(creds.email, creds.password);
}

/**
 * Handle Sign In Form Submission
 */
async function handleSignInSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAuthAlert('Please enter both your email address and password.', 'error');
    return;
  }

  await executeLogin(email, password);
}

/**
 * Core Login Execution (Calls POST /api/auth/login)
 */
async function executeLogin(email, password) {
  const btnSubmit = document.getElementById('btnSignInSubmit');
  const btnText = document.getElementById('btnSignInText');
  const spinner = document.getElementById('loginSpinner');

  // Set Loading UI
  if (btnSubmit) btnSubmit.disabled = true;
  if (btnText) btnText.textContent = 'Verifying Credentials...';
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: email, Password: password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Store session securely in localStorage
      localStorage.setItem('skillmint_token', data.data.token);
      localStorage.setItem('skillmint_user', JSON.stringify(data.data.user));
      if (data.data.profile) {
        localStorage.setItem('skillmint_profile', JSON.stringify(data.data.profile));
      }

      showAuthAlert(`✅ Welcome back, ${data.data.user.Name}! Redirecting to dashboard...`, 'success');

      if (btnText) btnText.textContent = 'Success! Redirecting...';

      // Smooth redirection to main dashboard
      setTimeout(() => {
        // If admin role, redirect to index.html with #admin hash or direct view
        if (data.data.user.Role === 'Admin') {
          window.location.href = '/marketplace#admin';
        } else {
          window.location.href = '/marketplace';
        }
      }, 700);
    } else {
      showAuthAlert(data.message || 'Invalid credentials. Please verify and try again.', 'error');
      if (btnSubmit) btnSubmit.disabled = false;
      if (btnText) btnText.textContent = 'Sign In to SkillMint 🚀';
      if (spinner) spinner.style.display = 'none';
    }
  } catch (err) {
    console.error('Sign-in error:', err);
    showAuthAlert('Unable to reach authentication server. Please check your backend connection.', 'error');
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Sign In to SkillMint 🚀';
    if (spinner) spinner.style.display = 'none';
  }
}

/**
 * Handle Registration Form Submission (Calls POST /api/auth/register)
 */
async function handleRegisterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const role = document.getElementById('registerRole').value;
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!name || name.length < 2) {
    showAuthAlert('Full name is required (at least 2 characters).', 'error');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showAuthAlert('Please enter a valid email address.', 'error');
    return;
  }

  if (!password || password.length < 6) {
    showAuthAlert('Password must be at least 6 characters long.', 'error');
    return;
  }

  const payload = {
    Name: name,
    Email: email,
    Password: password,
    Role: role
  };

  if (role === 'Student') {
    payload.Department = document.getElementById('registerDepartment').value.trim() || 'Computer Applications (BCA)';
    payload.Semester = document.getElementById('registerSemester').value.trim() || 'Semester VI';
  } else if (role === 'Client') {
    payload.CompanyName = document.getElementById('registerCompany').value.trim() || 'Tech Ventures';
    payload.Industry = document.getElementById('registerIndustry').value.trim() || 'Software & Technology';
  }

  const btnSubmit = document.getElementById('btnRegisterSubmit');
  const btnText = document.getElementById('btnRegisterText');
  const spinner = document.getElementById('registerSpinner');

  if (btnSubmit) btnSubmit.disabled = true;
  if (btnText) btnText.textContent = 'Creating Account...';
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Store session
      localStorage.setItem('skillmint_token', data.data.token);
      localStorage.setItem('skillmint_user', JSON.stringify(data.data.user));

      showAuthAlert('🎉 Account created successfully! Launching dashboard...', 'success');
      if (btnText) btnText.textContent = 'Account Ready! Redirecting...';

      setTimeout(() => {
        window.location.href = '/marketplace';
      }, 750);
    } else {
      showAuthAlert(data.message || 'Registration failed. Please check inputs and try again.', 'error');
      if (btnSubmit) btnSubmit.disabled = false;
      if (btnText) btnText.textContent = 'Create Verified Account ✨';
      if (spinner) spinner.style.display = 'none';
    }
  } catch (err) {
    console.error('Registration error:', err);
    showAuthAlert('Connection failure. Could not register user.', 'error');
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Create Verified Account ✨';
    if (spinner) spinner.style.display = 'none';
  }
}

/**
 * Display alert messages (Error or Success)
 */
function showAuthAlert(message, type = 'error') {
  const alertBox = document.getElementById('authAlertBox');
  if (!alertBox) return;

  alertBox.className = `auth-alert ${type}`;
  alertBox.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;
  alertBox.style.display = 'flex';
}

function clearAuthAlert() {
  const alertBox = document.getElementById('authAlertBox');
  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.innerHTML = '';
  }
}

/**
 * Forgot password guidance dialog
 */
function handleForgotPassword(e) {
  if (e && e.preventDefault) e.preventDefault();
  alert(
    "🔑 SkillMint Password Recovery Guide:\n\n" +
    "For viva and demonstration evaluation:\n" +
    "• Default password for all demo accounts is: Password123!\n\n" +
    "Demo Accounts:\n" +
    "• Student: student@skillmint.edu\n" +
    "• Client:  client@skillmint.biz\n" +
    "• Admin:   admin@skillmint.org\n\n" +
    "In production, a password reset token is dispatched via email."
  );
}

/**
 * Log out directly from the login portal if a stale session exists
 */
function logoutFromAuthPortal() {
  localStorage.removeItem('skillmint_token');
  localStorage.removeItem('skillmint_user');
  localStorage.removeItem('skillmint_profile');

  const banner = document.getElementById('existingSessionBanner');
  if (banner) banner.style.display = 'none';

  showAuthAlert('You have signed out. Please enter credentials to log in.', 'success');
}
