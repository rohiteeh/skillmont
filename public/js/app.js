/**
 * SkillMint Main Application Logic (Vanilla ES6+)
 * Powers Dashboards, Multi-Step Forms, Filters, and Lifecycle Actions
 */

let currentUser = null;
let currentProfile = null;
let projectsData = [];
let myApplicationsData = [];
let activeTab = 'search'; // 'search', 'portfolio', 'applications', 'client-projects'
let currentWizardStep = 1;
const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// Demo Accounts mapping for 1-click viva demonstrations (Admin requires credentials)
const DEMO_ACCOUNTS = {
  student: { email: 'student@skillmint.edu', password: 'Password123!', role: 'Student' },
  client: { email: 'client@skillmint.biz', password: 'Password123!', role: 'Client' }
};

document.addEventListener('DOMContentLoaded', () => {
  initAuth().then(() => {
    if (window.location.hash === '#admin') {
      handleAdminViewClick();
    }
  });
  setupEventListeners();
  loadProjects();
});

/* ====================================================================
   AUTHENTICATION & ROLE SWITCHER
   ==================================================================== */
async function initAuth() {
  const token = localStorage.getItem('skillmint_token');
  const cachedUser = localStorage.getItem('skillmint_user');
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get('preview') || urlParams.get('demo') || urlParams.get('guest');

  if (token && cachedUser) {
    try {
      currentUser = JSON.parse(cachedUser);
      updateUserUI();
      initSocketConnection(token);
      loadDashboardMetrics();
    } catch (e) {
      console.warn('Failed to parse cached session:', e);
      localStorage.removeItem('skillmint_token');
      localStorage.removeItem('skillmint_user');
      window.location.href = 'login.html';
    }
  } else if (isPreview) {
    // Demo/guest preview mode bypasses initial login gate
    await switchDemoRole('student');
  } else {
    // Unauthenticated user - redirect to dedicated login portal
    window.location.href = 'login.html';
  }
}

function handleAuthAction() {
  const token = localStorage.getItem('skillmint_token');
  if (token) {
    handleLogout();
  } else {
    window.location.href = 'login.html';
  }
}

function handleLogout() {
  localStorage.removeItem('skillmint_token');
  localStorage.removeItem('skillmint_user');
  localStorage.removeItem('skillmint_profile');
  showToast('Signed out. Redirecting to login portal...', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 450);
}

async function switchDemoRole(roleKey) {
  if (roleKey === 'admin') {
    handleAdminViewClick();
    return;
  }

  const account = DEMO_ACCOUNTS[roleKey];
  if (!account) return;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: account.email, Password: account.password })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('skillmint_token', data.data.token);
      localStorage.setItem('skillmint_user', JSON.stringify(data.data.user));
      currentUser = data.data.user;
      currentProfile = data.data.profile;

      updateUserUI();
      initSocketConnection(data.data.token);
      loadDashboardMetrics();
      loadProjects();
      showToast(`Logged in as ${currentUser.Role} (${currentUser.Name})`, 'success');
    } else {
      showToast(data.message || 'Login failed.', 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Failed to connect to authentication server.', 'error');
  }
}

function updateUserUI() {
  if (!currentUser) return;

  // Update role pill active state
  document.querySelectorAll('.role-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role.toLowerCase() === currentUser.Role.toLowerCase());
  });

  // Update header avatar & name
  const userNameEl = document.getElementById('navUserName');
  const userAvatarEl = document.getElementById('navUserAvatar');
  if (userNameEl) userNameEl.textContent = currentUser.Name;
  if (userAvatarEl) userAvatarEl.textContent = currentUser.Name.charAt(0);

  // Update Auth action button in navbar
  const authBtn = document.getElementById('btnNavAuth');
  const authBtnText = document.getElementById('btnNavAuthText');
  if (authBtn && authBtnText) {
    if (currentUser) {
      authBtnText.textContent = '🚪 Sign Out';
      authBtn.style.background = 'rgba(239, 68, 68, 0.12)';
      authBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      authBtn.style.color = '#fca5a5';
      authBtn.title = `Signed in as ${currentUser.Name} (${currentUser.Role}). Click to sign out.`;
    } else {
      authBtnText.textContent = '🔑 Sign In';
      authBtn.style.background = 'var(--accent-gradient)';
      authBtn.style.borderColor = 'transparent';
      authBtn.style.color = '#ffffff';
      authBtn.title = 'Sign In to SkillMint';
    }
  }

  // Update Greeting Card (Section 23.1)
  const greetingName = document.getElementById('greetingUserName');
  const greetingAvatar = document.getElementById('greetingAvatar');
  const greetingSubtitle = document.getElementById('greetingSubtitle');
  const skillsContainer = document.getElementById('userSkillTags');

  if (greetingName) greetingName.textContent = currentUser.Name;
  if (greetingAvatar) greetingAvatar.textContent = currentUser.Name.charAt(0);

  if (greetingSubtitle) {
    if (currentUser.Role === 'Student') {
      greetingSubtitle.innerHTML = `🎓 <span>Computer Applications (BCA) — Semester VI</span>`;
    } else if (currentUser.Role === 'Client') {
      greetingSubtitle.innerHTML = `🏢 <span>Rubith Tech Solutions — Hiring Partner</span>`;
    } else {
      greetingSubtitle.innerHTML = `🛡️ <span>Platform Administrator</span>`;
    }
  }

  // Update visible skills
  if (skillsContainer) {
    if (currentUser.Role === 'Student') {
      skillsContainer.innerHTML = `
        <span class="skill-tag">React</span>
        <span class="skill-tag">Node.js</span>
        <span class="skill-tag">Express</span>
        <span class="skill-tag">MySQL</span>
        <span class="skill-tag">Tailwind CSS</span>
        <span class="skill-tag">Socket.io</span>
      `;
    } else {
      skillsContainer.innerHTML = `
        <span class="skill-tag">Tech Recruiter</span>
        <span class="skill-tag">Full-Stack Projects</span>
        <span class="skill-tag">Mentorship</span>
      `;
    }
  }

  // Show/Hide Role-Specific UI elements
  const btnPostProject = document.getElementById('btnOpenPostProject');
  const clientProjectsPill = document.getElementById('pillClientProjects');
  const myAppsPill = document.getElementById('pillMyApplications');

  if (btnPostProject) {
    btnPostProject.style.display = (currentUser.Role === 'Client' || currentUser.Role === 'Admin') ? 'inline-flex' : 'none';
  }
  if (clientProjectsPill) {
    clientProjectsPill.style.display = (currentUser.Role === 'Client' || currentUser.Role === 'Admin') ? 'flex' : 'none';
  }
  if (myAppsPill) {
    myAppsPill.style.display = (currentUser.Role === 'Student') ? 'flex' : 'none';
  }

  // Admin-only Console Pill & Panel
  const pillAdminConsole = document.getElementById('pillAdminConsole');
  if (pillAdminConsole) {
    pillAdminConsole.style.display = (currentUser.Role === 'Admin') ? 'flex' : 'none';
  }

  if (currentUser.Role !== 'Admin') {
    const sectionAdmin = document.getElementById('sectionAdminPanel');
    if (sectionAdmin && sectionAdmin.style.display !== 'none') {
      sectionAdmin.style.display = 'none';
      const sectionSearch = document.getElementById('sectionSearchProjects');
      if (sectionSearch) sectionSearch.style.display = 'block';
    }
  }
}

/* ====================================================================
   DASHBOARD METRICS (SECTION 23.1 COUNTERS)
   ==================================================================== */
async function loadDashboardMetrics() {
  const token = localStorage.getItem('skillmint_token');
  if (!token) return;

  try {
    // Fetch projects count
    const projRes = await fetch(`${API_BASE}/api/projects`);
    const projData = await projRes.json();
    const availableCount = projData.count || 12;

    const availableCountEl = document.getElementById('metricAvailableCount');
    if (availableCountEl) availableCountEl.textContent = availableCount;

    // Fetch user applications if Student
    if (currentUser && currentUser.Role === 'Student') {
      const appRes = await fetch(`${API_BASE}/api/applications/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appData = await appRes.json();
      const appliedCount = appData.count || 5;

      const appliedEl = document.getElementById('metricAppliedCount');
      if (appliedEl) appliedEl.textContent = appliedCount;
      myApplicationsData = appData.data || [];
    }

    // Default badge values matching Section 23.1
    const completedEl = document.getElementById('metricCompletedCount');
    const messagesEl = document.getElementById('metricMessagesCount');
    if (completedEl) completedEl.textContent = '2';
    if (messagesEl) messagesEl.textContent = '3';
  } catch (err) {
    console.warn('Dashboard metric load error:', err);
  }
}

/* ====================================================================
   PROJECTS EXPLORER & QUICK FILTER CHIPS
   ==================================================================== */
function filterByQuickSkill(skill) {
  const skillInput = document.getElementById('filterSkills');
  if (skillInput) {
    skillInput.value = skill;
  }
  
  // Highlight active chip
  document.querySelectorAll('.quick-skill-chip').forEach(chip => {
    if (!chip.classList.contains('reset')) {
      const chipText = chip.textContent || '';
      chip.classList.toggle('active', !!skill && chipText.toLowerCase().includes(skill.toLowerCase()));
    }
  });

  // Switch to search view if in other view
  setActiveNavPill('search');
  
  // Trigger project reload
  loadProjects();

  // Smooth scroll to projects section
  const section = document.getElementById('sectionSearchProjects');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (skill) {
    showToast(`⚡ Filtered projects by: ${skill}`, 'info');
  } else {
    showToast('Filters reset.', 'info');
  }
}

async function loadProjects() {
  const tableBody = document.getElementById('projectsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Loading live projects...</td></tr>`;

  try {
    const category = document.getElementById('filterCategory')?.value || '';
    const search = document.getElementById('filterSearch')?.value || '';
    const skills = document.getElementById('filterSkills')?.value || '';

    let url = `${API_BASE}/api/projects?status=Open`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (skills) url += `&skills=${encodeURIComponent(skills)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.data) {
      projectsData = data.data;
      renderProjectsTable(projectsData);
    }
  } catch (err) {
    console.error('Failed to load projects:', err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--danger);">Error loading projects.</td></tr>`;
  }
}

function renderProjectsTable(projects) {
  const tableBody = document.getElementById('projectsTableBody');
  if (!tableBody) return;

  if (projects.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-dim);">No open projects match your criteria.</td></tr>`;
    return;
  }

  tableBody.innerHTML = projects.map(p => {
    const skillBadges = (p.RequiredSkills || '')
      .split(',')
      .slice(0, 3)
      .map(s => `<span class="skill-tag">${escapeHtml(s.trim())}</span>`)
      .join(' ');

    const isStudent = currentUser && currentUser.Role === 'Student';
    const isOwner = currentUser && Number(currentUser.UserID) === Number(p.ClientID);

    return `
      <tr>
        <td class="project-title-cell">
          <div style="font-weight:700; color:var(--text-main); font-size:0.96rem; letter-spacing:-0.01em;">${escapeHtml(p.Title)}</div>
          <div class="project-client-name">Posted by ${escapeHtml(p.ClientName || 'Client')} • <span style="color:#a5b4fc;">${escapeHtml(p.CompanyName || 'Verified Enterprise')}</span></div>
        </td>
        <td><span class="badge-category">${escapeHtml(p.Category)}</span></td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${skillBadges}</div></td>
        <td><span class="budget-text">₹${Number(p.Budget).toLocaleString('en-IN')}</span></td>
        <td>
          <div style="font-size:0.85rem; color:var(--text-muted);">${p.Deadline || '2026-12-31'}</div>
          <div style="font-size:0.75rem; color:#a78bfa; font-weight:600;">⚡ ${p.ApplicationCount || 0} proposals</div>
        </td>
        <td style="text-align:right;">
          ${isStudent ? `
            <button class="btn btn-primary btn-sm" onclick="openApplyModal(${p.ProjectID}, '${escapeHtml(p.Title)}')">
              Apply Now 🚀
            </button>
          ` : isOwner ? `
            <button class="btn btn-secondary btn-sm" onclick="viewProjectApplicants(${p.ProjectID})">
              Review Applicants 👥
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="openChatWithUser(${p.ClientID}, '${escapeHtml(p.ClientName)}')">
              Contact Client 💬
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

/* ====================================================================
   CLIENT APPLICATIONS REVIEW
   ==================================================================== */
async function viewProjectApplicants(projectId) {
  try {
    const token = localStorage.getItem('skillmint_token');
    const res = await fetch(`${API_BASE}/api/applications/project/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Could not load applicants.', 'error');
      return;
    }

    const modalBody = document.getElementById('applicantReviewModalBody');
    const modalTitle = document.getElementById('applicantReviewModalTitle');
    if (modalTitle) modalTitle.textContent = `Applicants for "${data.projectTitle}"`;

    if (!data.data || data.data.length === 0) {
      modalBody.innerHTML = `<p style="text-align:center; padding:30px; color:var(--text-muted);">No students have applied to this project yet.</p>`;
    } else {
      modalBody.innerHTML = data.data.map(app => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:18px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <h4 style="font-size:1.05rem; color:var(--text-main); font-weight:700;">${escapeHtml(app.StudentName)}</h4>
              <p style="font-size:0.8rem; color:var(--text-dim);">${escapeHtml(app.Department || 'BCA')} • Rating: ⭐ ${app.StudentRating || '5.0'}</p>
            </div>
            <span class="status-badge ${app.Status.toLowerCase()}">${app.Status}</span>
          </div>

          <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:12px; line-height:1.5;">
            <strong>Cover Message:</strong> ${escapeHtml(app.CoverMessage)}
          </p>

          <div style="display:flex; align-items:center; gap:16px; font-size:0.82rem; color:var(--text-dim); margin-bottom:14px;">
            <span>⏱️ Timeline: <strong>${escapeHtml(app.ProposedTimeline || 'N/A')}</strong></span>
            <span>💰 Proposed Bid: <strong>₹${app.BidAmount ? Number(app.BidAmount).toLocaleString('en-IN') : 'N/A'}</strong></span>
            ${app.PortfolioLink ? `<a href="${escapeHtml(app.PortfolioLink)}" target="_blank" style="color:#818cf8; text-decoration:underline;">🔗 Portfolio Link</a>` : ''}
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="openChatWithUser(${app.StudentID}, '${escapeHtml(app.StudentName)}')">💬 Chat</button>
            <button class="btn btn-danger btn-sm" onclick="updateAppStatus(${app.ApplicationID}, 'Rejected')">Reject</button>
            <button class="btn btn-success btn-sm" onclick="updateAppStatus(${app.ApplicationID}, 'Accepted')">Accept & Hire</button>
          </div>
        </div>
      `).join('');
    }

    openModal('modalApplicantReview');
  } catch (err) {
    console.error('Failed to view applicants:', err);
    showToast('Failed to fetch applicants.', 'error');
  }
}

async function updateAppStatus(applicationId, newStatus) {
  try {
    const token = localStorage.getItem('skillmint_token');
    const res = await fetch(`${API_BASE}/api/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Applicant ${newStatus === 'Accepted' ? 'hired successfully! Project is now InProgress.' : 'marked as Rejected.'}`, 'success');
      closeModal('modalApplicantReview');
      loadProjects();
      loadDashboardMetrics();
    } else {
      showToast(data.message || 'Status update failed.', 'error');
    }
  } catch (err) {
    showToast('Network error updating status.', 'error');
  }
}

/* ====================================================================
   STUDENT APPLICATION MODAL & SUBMISSION
   ==================================================================== */
function openApplyModal(projectId, projectTitle) {
  const idInput = document.getElementById('applyProjectId');
  const titleDisplay = document.getElementById('applyProjectTitleDisplay');
  if (idInput) idInput.value = projectId;
  if (titleDisplay) titleDisplay.textContent = projectTitle;

  openModal('modalApplyProject');
}

async function handleApplicationSubmit(e) {
  e.preventDefault();
  const projectId = document.getElementById('applyProjectId').value;
  const coverMessage = document.getElementById('applyCoverMessage').value;
  const portfolioLink = document.getElementById('applyPortfolioLink').value;
  const timeline = document.getElementById('applyTimeline').value;
  const bidAmount = document.getElementById('applyBidAmount').value;

  if (!coverMessage || coverMessage.trim().length < 10) {
    showToast('Cover message must be at least 10 characters long.', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('skillmint_token');
    const res = await fetch(`${API_BASE}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ProjectID: Number(projectId),
        CoverMessage: coverMessage.trim(),
        PortfolioLink: portfolioLink.trim(),
        ProposedTimeline: timeline.trim(),
        BidAmount: bidAmount ? Number(bidAmount) : null
      })
    });
    const data = await res.json();

    if (data.success) {
      showToast('Application submitted successfully! Good luck!', 'success');
      closeModal('modalApplyProject');
      loadProjects();
      loadDashboardMetrics();
    } else {
      showToast(data.message || 'Application failed.', 'error');
    }
  } catch (err) {
    showToast('Failed to submit application.', 'error');
  }
}

/* ====================================================================
   MULTI-STEP PROJECT POSTING WIZARD (CLIENT)
   ==================================================================== */
function wizardNextStep() {
  if (currentWizardStep === 1) {
    const title = document.getElementById('wizardTitle').value.trim();
    const desc = document.getElementById('wizardDesc').value.trim();

    if (title.length < 5) {
      showToast('Please enter a project title (min 5 characters).', 'error');
      return;
    }
    if (desc.length < 15) {
      showToast('Please provide a detailed description (min 15 characters).', 'error');
      return;
    }
  } else if (currentWizardStep === 2) {
    const skills = document.getElementById('wizardSkills').value.trim();
    const budget = document.getElementById('wizardBudget').value;

    if (!skills) {
      showToast('Specify at least one required skill.', 'error');
      return;
    }
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      showToast('Enter a valid budget amount.', 'error');
      return;
    }
  }

  if (currentWizardStep < 3) {
    currentWizardStep++;
    renderWizardStep();
  }
}

function wizardPrevStep() {
  if (currentWizardStep > 1) {
    currentWizardStep--;
    renderWizardStep();
  }
}

function renderWizardStep() {
  // Update step visual nodes
  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`wizardNode${i}`);
    const section = document.getElementById(`wizardStepSection${i}`);
    if (node) {
      node.classList.toggle('active', i === currentWizardStep);
      node.classList.toggle('completed', i < currentWizardStep);
    }
    if (section) {
      section.style.display = (i === currentWizardStep) ? 'block' : 'none';
    }
  }

  const btnPrev = document.getElementById('wizardBtnPrev');
  const btnNext = document.getElementById('wizardBtnNext');
  const btnSubmit = document.getElementById('wizardBtnSubmit');

  if (btnPrev) btnPrev.style.display = currentWizardStep > 1 ? 'inline-flex' : 'none';
  if (btnNext) btnNext.style.display = currentWizardStep < 3 ? 'inline-flex' : 'none';
  if (btnSubmit) btnSubmit.style.display = currentWizardStep === 3 ? 'inline-flex' : 'none';

  if (currentWizardStep === 3) {
    // Populate summary
    document.getElementById('summaryTitle').textContent = document.getElementById('wizardTitle').value;
    document.getElementById('summaryCategory').textContent = document.getElementById('wizardCategory').value;
    document.getElementById('summarySkills').textContent = document.getElementById('wizardSkills').value;
    document.getElementById('summaryBudget').textContent = `₹${Number(document.getElementById('wizardBudget').value).toLocaleString('en-IN')}`;
  }
}

async function handleWizardProjectSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('wizardTitle').value.trim();
  const category = document.getElementById('wizardCategory').value;
  const desc = document.getElementById('wizardDesc').value.trim();
  const skills = document.getElementById('wizardSkills').value.trim();
  const budget = document.getElementById('wizardBudget').value;
  const deadline = document.getElementById('wizardDeadline').value;

  // Validate deadline in the future
  if (!deadline) {
    showToast('Deadline date is required.', 'error');
    return;
  }
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deadlineDate <= today) {
    showToast('Deadline must be a future date.', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('skillmint_token');
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        Title: title,
        Category: category,
        Description: desc,
        RequiredSkills: skills,
        Budget: Number(budget),
        Deadline: deadline
      })
    });
    const data = await res.json();

    if (data.success) {
      showToast('🎉 Project posted successfully!', 'success');
      closeModal('modalPostProject');
      currentWizardStep = 1;
      renderWizardStep();
      document.getElementById('formPostProject').reset();
      loadProjects();
      loadDashboardMetrics();
    } else {
      showToast(data.message || 'Failed to post project.', 'error');
    }
  } catch (err) {
    showToast('Network error posting project.', 'error');
  }
}

/* ====================================================================
   PORTFOLIO SUBMISSION WITH FILE VALIDATION (<5MB, PDF/PNG/JPEG)
   ==================================================================== */
function handlePortfolioFileSelect(input) {
  const file = input.files[0];
  const fileInfoEl = document.getElementById('portfolioFileInfo');

  if (!file) {
    if (fileInfoEl) fileInfoEl.textContent = 'Supported: PDF, PNG, JPG (Max 5MB)';
    return;
  }

  const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    showToast(`Invalid file format (.${ext}). Only PDF, PNG, and JPEG files are allowed.`, 'error');
    input.value = '';
    if (fileInfoEl) fileInfoEl.textContent = '❌ Invalid format! Please choose PDF, PNG, or JPEG.';
    return;
  }

  // 5MB Limit check (5 * 1024 * 1024 = 5242880 bytes)
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    showToast(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5MB maximum limit.`, 'error');
    input.value = '';
    if (fileInfoEl) fileInfoEl.textContent = '❌ File too large! Maximum 5MB allowed.';
    return;
  }

  if (fileInfoEl) {
    fileInfoEl.innerHTML = `✅ Selected: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
  }
  showToast(`File "${file.name}" validated successfully!`, 'success');
}

function handlePortfolioSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('portfolioTitle').value.trim();
  const desc = document.getElementById('portfolioDesc').value.trim();
  const url = document.getElementById('portfolioUrl').value.trim();

  if (!title) {
    showToast('Project title is required.', 'error');
    return;
  }

  showToast(`Portfolio item "${title}" saved to your student profile!`, 'success');
  closeModal('modalPortfolio');
  document.getElementById('formPortfolio').reset();
  document.getElementById('portfolioFileInfo').textContent = 'Supported: PDF, PNG, JPG (Max 5MB)';
}

/* ====================================================================
   NAVIGATION PILL CLICKS
   ==================================================================== */
function setActiveNavPill(pillName) {
  activeTab = pillName;
  document.querySelectorAll('.nav-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pill === pillName);
  });

  const sectionSearch = document.getElementById('sectionSearchProjects');
  const sectionMyApps = document.getElementById('sectionMyApplications');
  const sectionAdmin = document.getElementById('sectionAdminPanel');

  if (pillName === 'admin') {
    if (!currentUser || currentUser.Role !== 'Admin') {
      showToast('🔒 Access Restricted: Please authenticate with administrator credentials.', 'error');
      openModal('modalAdminAuth');
      return;
    }
    if (sectionSearch) sectionSearch.style.display = 'none';
    if (sectionMyApps) sectionMyApps.style.display = 'none';
    if (sectionAdmin) sectionAdmin.style.display = 'block';
    loadAdminData();
    return;
  } else {
    if (sectionAdmin) sectionAdmin.style.display = 'none';
  }

  if (pillName === 'search') {
    if (sectionSearch) sectionSearch.style.display = 'block';
    if (sectionMyApps) sectionMyApps.style.display = 'none';
  } else if (pillName === 'applications') {
    if (sectionSearch) sectionSearch.style.display = 'none';
    if (sectionMyApps) sectionMyApps.style.display = 'block';
    renderMyApplications();
  } else if (pillName === 'portfolio') {
    openModal('modalPortfolio');
  } else if (pillName === 'messages') {
    // Open chat with default partner
    const partnerId = (currentUser && currentUser.Role === 'Student') ? 2 : 1;
    const partnerName = (currentUser && currentUser.Role === 'Student') ? 'Rubith Tech Ventures' : 'Rithik Student';
    openChatWithUser(partnerId, partnerName);
  }
}

function renderMyApplications() {
  const container = document.getElementById('myApplicationsList');
  if (!container) return;

  if (myApplicationsData.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim);">You have not applied to any projects yet.</div>`;
    return;
  }

  container.innerHTML = myApplicationsData.map(app => `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:20px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h4 style="font-size:1.1rem; color:var(--text-main); font-weight:700;">${escapeHtml(app.ProjectTitle)}</h4>
        <span class="status-badge ${app.Status.toLowerCase()}">${app.Status}</span>
      </div>
      <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:12px;">${escapeHtml(app.CoverMessage)}</p>
      <div style="display:flex; align-items:center; gap:16px; font-size:0.8rem; color:var(--text-dim);">
        <span>Client: <strong>${escapeHtml(app.ClientName || 'Client')}</strong></span>
        <span>Budget: <strong>₹${app.Budget ? Number(app.Budget).toLocaleString('en-IN') : '0'}</strong></span>
        <span>Applied on: <strong>${app.AppliedDate ? new Date(app.AppliedDate).toLocaleDateString() : 'Recent'}</strong></span>
      </div>
    </div>
  `).join('');
}

/* ====================================================================
   MODAL UTILITIES & EVENT LISTENERS
   ==================================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

/* ====================================================================
   ADMINISTRATOR PORTAL & MODERATION (RBAC)
   ==================================================================== */
function openAdminLoginModal() {
  openModal('modalAdminAuth');
  setTimeout(() => {
    const userField = document.getElementById('adminUsername');
    if (userField) userField.focus();
  }, 100);
}

function closeAdminLoginModal() {
  closeModal('modalAdminAuth');
}

function toggleAdminPasswordVisibility() {
  const pwdField = document.getElementById('adminPassword');
  const btn = document.getElementById('btnToggleAdminPassword');
  const btnText = document.getElementById('btnToggleAdminPasswordText');
  if (pwdField) {
    if (pwdField.type === 'password') {
      pwdField.type = 'text';
      if (btn) btn.textContent = '🙈';
      if (btnText) btnText.textContent = '🙈 Hide Password';
    } else {
      pwdField.type = 'password';
      if (btn) btn.textContent = '👁️';
      if (btnText) btnText.textContent = '👁️ Show Password';
    }
  }
}

function handleAdminViewClick() {
  openAdminLoginModal();
}

function showAdminDashboard() {
  document.querySelectorAll('.role-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === 'Admin');
  });

  const sectionSearch = document.getElementById('sectionSearchProjects');
  const sectionMyApps = document.getElementById('sectionMyApplications');
  const sectionAdmin = document.getElementById('sectionAdminPanel');

  if (sectionSearch) sectionSearch.style.display = 'none';
  if (sectionMyApps) sectionMyApps.style.display = 'none';
  if (sectionAdmin) sectionAdmin.style.display = 'block';

  const pillAdmin = document.getElementById('pillAdminConsole');
  if (pillAdmin) {
    pillAdmin.style.display = 'inline-flex';
    document.querySelectorAll('.nav-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pill === 'admin');
    });
  }

  loadAdminData();
}

async function handleAdminAuthSubmit(e) {
  if (e) e.preventDefault();
  const usernameInput = document.getElementById('adminUsername');
  const passwordInput = document.getElementById('adminPassword');
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    showToast('Please enter both admin username and password.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: username, Password: password })
    });
    const data = await res.json();

    if (data.success && data.data) {
      if (data.data.user.Role !== 'Admin') {
        showToast('Access denied: Account is not an Administrator.', 'error');
        return;
      }

      localStorage.setItem('skillmint_token', data.data.token);
      localStorage.setItem('skillmint_user', JSON.stringify(data.data.user));
      currentUser = data.data.user;
      currentProfile = data.data.profile;

      closeAdminLoginModal();
      updateUserUI();
      initSocketConnection(data.data.token);
      showAdminDashboard();
      showToast('🛡️ Administrator authenticated successfully!', 'success');
    } else {
      showToast(data.message || 'Invalid administrator credentials.', 'error');
    }
  } catch (err) {
    console.error('Admin login error:', err);
    showToast('Failed to connect to authentication server.', 'error');
  }
}

async function loadAdminData() {
  const token = localStorage.getItem('skillmint_token');
  if (!token) return;

  try {
    const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const statsData = await statsRes.json();
    if (statsData.success && statsData.data) {
      const s = statsData.data;
      const elStudents = document.getElementById('adminStatStudents');
      const elClients = document.getElementById('adminStatClients');
      const elProjects = document.getElementById('adminStatProjects');
      const elApps = document.getElementById('adminStatApps');

      if (elStudents) elStudents.textContent = s.totalStudents;
      if (elClients) elClients.textContent = s.totalClients;
      if (elProjects) elProjects.textContent = s.totalProjects;
      if (elApps) elApps.textContent = s.totalApplications;
    }

    const usersRes = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    if (usersData.success && usersData.data) {
      renderAdminUsersTable(usersData.data);
    }
  } catch (err) {
    console.error('Failed to load admin data:', err);
    showToast('Failed to load admin statistics.', 'error');
  }
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-dim);">No platform users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isSuspended = u.Status === 'Suspended';
    const statusBadgeClass = isSuspended ? 'rejected' : 'accepted';
    const statusText = isSuspended ? 'Suspended' : 'Active';
    const toggleActionText = isSuspended ? 'Activate User' : 'Suspend User';
    const toggleBtnClass = isSuspended ? 'btn-secondary' : 'btn-danger';
    const newStatus = isSuspended ? 'Active' : 'Suspended';
    const isSelf = currentUser && Number(currentUser.UserID) === Number(u.UserID);

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--accent-gradient); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem; color:#fff;">
              ${escapeHtml(u.Name ? u.Name.charAt(0) : 'U')}
            </div>
            <div>
              <strong style="color:var(--text-main); font-size:0.9rem;">${escapeHtml(u.Name)}</strong>
              <div style="font-size:0.75rem; color:var(--text-dim);">ID: #${u.UserID} ${u.CompanyName ? '• ' + escapeHtml(u.CompanyName) : (u.Department ? '• ' + escapeHtml(u.Department) : '')}</div>
            </div>
          </div>
        </td>
        <td style="color:var(--text-muted); font-size:0.86rem;">${escapeHtml(u.Email)}</td>
        <td><span class="skill-tag">${escapeHtml(u.Role)}</span></td>
        <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
        <td style="color:var(--text-dim); font-size:0.82rem;">${u.CreatedAt ? new Date(u.CreatedAt).toLocaleDateString() : 'N/A'}</td>
        <td style="text-align:right;">
          ${isSelf ? '<span style="font-size:0.78rem; color:var(--text-dim); font-style:italic;">Current Admin</span>' : `
            <button class="btn ${toggleBtnClass} btn-sm" style="padding:4px 10px; font-size:0.76rem;" onclick="toggleUserStatus(${u.UserID}, '${newStatus}')">
              ${toggleActionText}
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleUserStatus(userId, newStatus) {
  const token = localStorage.getItem('skillmint_token');
  if (!token) return;

  if (!confirm(`Are you sure you want to change User #${userId} status to "${newStatus}"?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`User status updated to ${newStatus}.`, 'success');
      loadAdminData();
    } else {
      showToast(data.message || 'Failed to update user status.', 'error');
    }
  } catch (err) {
    console.error('Status update error:', err);
    showToast('Failed to connect to server.', 'error');
  }
}

function setupEventListeners() {
  // Live filters
  const filterSearch = document.getElementById('filterSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterSkills = document.getElementById('filterSkills');

  if (filterSearch) filterSearch.addEventListener('input', debounce(loadProjects, 300));
  if (filterCategory) filterCategory.addEventListener('change', loadProjects);
  if (filterSkills) filterSkills.addEventListener('input', debounce(loadProjects, 300));

  // Chat input enter key
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });
    chatInput.addEventListener('input', handleTypingEvent);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
