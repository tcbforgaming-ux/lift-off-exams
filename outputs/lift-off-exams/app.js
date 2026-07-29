const categories = ["Business Administration Core", "Marketing", "Finance", "Business Management and Administration", "Hospitality and Tourism", "Entrepreneurship"];
const difficulties = ["Easy", "Medium", "Hard"];
const topics = [
  "Business Law",
  "Channel Management",
  "Communications",
  "Customer Relations",
  "Economics",
  "Emotional Intelligence",
  "Entrepreneurship",
  "Financial Analysis",
  "Financial-Information Management",
  "Human Resources Management",
  "Information Management",
  "Knowledge Management",
  "Market Planning",
  "Marketing",
  "Marketing-Information Management",
  "Operations",
  "Pricing",
  "Product/Service Management",
  "Professional Development",
  "Project Management",
  "Promotion",
  "Quality Management",
  "Risk Management",
  "Selling",
  "Strategic Management"
];

function createBlueprint(cluster, level, category, distribution, version = "2026.1") {
  const cleanDistribution = Object.fromEntries(
    Object.entries(distribution)
      .map(([topic, count]) => [normalizeTopicName(topic), Number(count)])
      .filter(([, count]) => Number.isFinite(count) && count > 0)
  );
  return {
    name: `${cluster} - ${level}`,
    cluster,
    level,
    category,
    version,
    distribution: cleanDistribution,
    totalQuestions: Object.values(cleanDistribution).reduce((sum, count) => sum + count, 0)
  };
}

const prdBlueprints = [
  createBlueprint("Business Administration Core", "District Test", "Business Administration Core", {
    "Business Law": 5, Communications: 7, "Customer Relations": 2, Economics: 6, "Emotional Intelligence": 9, Entrepreneurship: 1, "Financial Analysis": 7, "Human Resources Management": 1, "Information Management": 7, "Knowledge Management": 6, Marketing: 1, Operations: 21, "Professional Development": 6, "Project Management": 6, "Quality Management": 3, "Risk Management": 4, "Strategic Management": 8
  }),
  createBlueprint("Business Administration Core", "State Test", "Business Administration Core", {
    "Business Law": 5, Communications: 6, "Customer Relations": 2, Economics: 5, "Emotional Intelligence": 8, "Financial Analysis": 6, "Information Management": 6, "Knowledge Management": 7, Marketing: 1, Operations: 24, "Professional Development": 5, "Project Management": 7, "Quality Management": 4, "Risk Management": 5, "Strategic Management": 9
  }),
  createBlueprint("Business Administration Core", "ICDC Test", "Business Administration Core", {
    "Business Law": 5, Communications: 6, "Customer Relations": 1, Economics: 4, "Emotional Intelligence": 6, "Financial Analysis": 5, "Information Management": 6, "Knowledge Management": 8, Marketing: 1, Operations: 26, "Professional Development": 4, "Project Management": 8, "Quality Management": 5, "Risk Management": 5, "Strategic Management": 10
  }),
  createBlueprint("Marketing Cluster Exam", "District Test", "Marketing", {
    "Business Law": 2, "Channel Management": 5, Communications: 5, "Customer Relations": 2, Economics: 6, "Emotional Intelligence": 9, Entrepreneurship: 1, "Financial Analysis": 6, "Human Resources Management": 1, "Information Management": 5, "Market Planning": 4, Marketing: 1, "Marketing-Information Management": 11, Operations: 6, Pricing: 3, "Product/Service Management": 11, "Professional Development": 6, Promotion: 9, Selling: 6, "Strategic Management": 1
  }),
  createBlueprint("Marketing Cluster Exam", "State Test", "Marketing", {
    "Business Law": 2, "Channel Management": 6, Communications: 4, "Customer Relations": 2, Economics: 5, "Emotional Intelligence": 8, "Financial Analysis": 5, "Information Management": 4, "Market Planning": 4, Marketing: 1, "Marketing-Information Management": 14, Operations: 5, Pricing: 4, "Product/Service Management": 13, "Professional Development": 5, Promotion: 11, Selling: 7
  }),
  createBlueprint("Marketing Cluster Exam", "ICDC Test", "Marketing", {
    "Business Law": 1, "Channel Management": 7, Communications: 3, "Customer Relations": 1, Economics: 4, "Emotional Intelligence": 6, "Financial Analysis": 4, "Information Management": 3, "Market Planning": 5, Marketing: 1, "Marketing-Information Management": 16, Operations: 4, Pricing: 4, "Product/Service Management": 15, "Professional Development": 5, Promotion: 13, Selling: 8
  }),
  createBlueprint("Finance Cluster Exam", "District Test", "Finance", {
    "Business Law": 7, Communications: 5, "Customer Relations": 5, Economics: 6, "Emotional Intelligence": 9, Entrepreneurship: 1, "Financial Analysis": 24, "Financial-Information Management": 9, "Human Resources Management": 1, "Information Management": 6, Marketing: 1, Operations: 6, "Professional Development": 13, "Risk Management": 6, "Strategic Management": 1
  }),
  createBlueprint("Finance Cluster Exam", "State Test", "Finance", {
    "Business Law": 8, Communications: 4, "Customer Relations": 5, Economics: 5, "Emotional Intelligence": 8, "Financial Analysis": 28, "Financial-Information Management": 10, "Information Management": 5, Marketing: 1, Operations: 5, "Professional Development": 14, "Risk Management": 7
  }),
  createBlueprint("Finance Cluster Exam", "ICDC Test", "Finance", {
    "Business Law": 7, Communications: 3, "Customer Relations": 4, Economics: 4, "Emotional Intelligence": 6, "Financial Analysis": 30, "Financial-Information Management": 12, "Information Management": 5, Marketing: 1, Operations: 4, "Professional Development": 15, "Risk Management": 9
  }),
  createBlueprint("Hospitality and Tourism Cluster Exam", "District Test", "Hospitality and Tourism", {
    "Business Law": 3, Communications: 5, "Customer Relations": 8, Economics: 6, "Emotional Intelligence": 9, Entrepreneurship: 1, "Financial Analysis": 8, "Human Resources Management": 2, "Information Management": 14, "Market Planning": 1, Marketing: 1, Operations: 13, Pricing: 1, "Product/Service Management": 6, "Professional Development": 8, Promotion: 2, "Quality Management": 1, "Risk Management": 1, Selling: 7, "Strategic Management": 3
  }),
  createBlueprint("Hospitality and Tourism Cluster Exam", "State Test", "Hospitality and Tourism", {
    "Business Law": 3, Communications: 4, "Customer Relations": 9, Economics: 6, "Emotional Intelligence": 9, "Financial Analysis": 7, "Human Resources Management": 1, "Information Management": 15, "Knowledge Management": 1, "Market Planning": 1, Marketing: 1, Operations: 13, Pricing: 1, "Product/Service Management": 7, "Professional Development": 7, Promotion: 3, "Quality Management": 1, "Risk Management": 1, Selling: 8, "Strategic Management": 2
  }),
  createBlueprint("Hospitality and Tourism Cluster Exam", "ICDC Test", "Hospitality and Tourism", {
    "Business Law": 2, Communications: 3, "Customer Relations": 9, Economics: 5, "Emotional Intelligence": 7, "Financial Analysis": 7, "Human Resources Management": 1, "Information Management": 15, "Knowledge Management": 1, "Market Planning": 2, Marketing: 2, Operations: 13, Pricing: 1, "Product/Service Management": 9, "Professional Development": 6, Promotion: 3, "Quality Management": 1, "Risk Management": 2, Selling: 9, "Strategic Management": 2
  }),
  createBlueprint("Entrepreneurship Cluster Exam", "District Test", "Entrepreneurship", {
    "Business Law": 4, "Channel Management": 3, Communications: 1, "Customer Relations": 1, Economics: 3, "Emotional Intelligence": 6, Entrepreneurship: 14, "Financial Analysis": 10, "Human Resources Management": 5, "Information Management": 4, Marketing: 1, "Marketing-Information Management": 2, "Market Planning": 5, Operations: 13, Pricing: 2, "Product/Service Management": 4, "Professional Development": 5, Promotion: 6, "Quality Management": 1, "Risk Management": 2, Selling: 1, "Strategic Management": 7
  }),
  createBlueprint("Entrepreneurship Cluster Exam", "State Test", "Entrepreneurship", {
    "Business Law": 4, "Channel Management": 3, "Customer Relations": 1, Economics: 3, "Emotional Intelligence": 6, Entrepreneurship: 13, "Financial Analysis": 9, "Human Resources Management": 4, "Information Management": 3, Marketing: 1, "Marketing-Information Management": 3, "Market Planning": 6, Operations: 13, Pricing: 3, "Product/Service Management": 4, "Professional Development": 5, Promotion: 7, "Quality Management": 1, "Risk Management": 3, Selling: 1, "Strategic Management": 7
  }),
  createBlueprint("Entrepreneurship Cluster Exam", "ICDC Test", "Entrepreneurship", {
    "Business Law": 3, "Channel Management": 3, Communications: 1, "Customer Relations": 1, Economics: 2, "Emotional Intelligence": 4, Entrepreneurship: 14, "Financial Analysis": 11, "Human Resources Management": 4, "Information Management": 2, Marketing: 1, "Marketing-Information Management": 2, "Market Planning": 6, Operations: 14, Pricing: 2, "Product/Service Management": 4, "Professional Development": 4, Promotion: 8, "Quality Management": 1, "Risk Management": 4, Selling: 1, "Strategic Management": 8
  })
];

const auditEvents = [
  ["Jun 19, 2026 9:20 AM", "owner@liftoff.test", "Blueprint version update", "Marketing Cluster Exam", "Annual DECA update"],
  ["Jun 19, 2026 8:44 AM", "admin@liftoff.test", "Report marked Work In Progress", "Question FIN-204", "Needs answer review"],
  ["Jun 18, 2026 5:18 PM", "admin@liftoff.test", "Question retired", "Question MKT-118", "Duplicate report volume"],
  ["Jun 18, 2026 2:06 PM", "owner@liftoff.test", "Administrator suspension vote", "admin-17", "Governance threshold reached"]
];

const reportStatuses = ["Valid", "Invalid", "Spam", "Fixed", "Work In Progress"];

const savedSupabaseConfig = JSON.parse(localStorage.getItem("lift-supabase") || "{}");
if ("accessToken" in savedSupabaseConfig) {
  delete savedSupabaseConfig.accessToken;
  localStorage.setItem("lift-supabase", JSON.stringify(savedSupabaseConfig));
}
localStorage.removeItem("lift-role");
const savedBannedWordsRaw = localStorage.getItem("lift-banned-words");
const savedBannedWords = JSON.parse(savedBannedWordsRaw || "[]");
const savedAdminTagsRaw = localStorage.getItem("lift-admin-tags");
const savedAdminTags = JSON.parse(savedAdminTagsRaw || "[]");

function savedOnboardingProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("lift-onboarding") || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savedTeamAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem("lift-team-accounts") || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savedTestIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem("lift-test-ids") || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savedReportQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem("lift-report-queue") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const initialReportQueue = savedReportQueue();

function savedCustomBlueprints() {
  try {
    const parsed = JSON.parse(localStorage.getItem("lift-custom-blueprints") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(blueprint => createBlueprint(
      blueprint.cluster || `${blueprint.category || "Marketing"} Blueprint`,
      blueprint.level || "District Test",
      blueprint.category || "Marketing",
      blueprint.distribution || {},
      blueprint.version || "2026.1"
    ));
  } catch {
    return [];
  }
}

const initialCustomBlueprints = savedCustomBlueprints();
const initialOnboarding = savedOnboardingProfile();
const initialTeamAccounts = savedTeamAccounts();

const sampleQuestions = [
  {
    text: "Which action best supports long-term customer retention after a promotional campaign?",
    topic: "Customer Relations",
    difficulty: "Medium",
    options: ["Reduce all follow-up contact", "Collect feedback and personalize next offers", "Change the brand position weekly", "Limit service access after purchase"],
    answer: "B",
    explanation: "Retention improves when the business uses feedback and relevant follow-up to keep value clear after the first interaction."
  },
  {
    text: "A business is comparing the expected profit from two product lines. Which metric is most useful?",
    topic: "Financial Analysis",
    difficulty: "Hard",
    options: ["Contribution margin", "Logo recognition", "Customer age", "Store layout"],
    answer: "A",
    explanation: "Contribution margin helps compare how much revenue remains after variable costs."
  },
  {
    text: "What is the strongest reason to segment a market before choosing promotional channels?",
    topic: "Promotion",
    difficulty: "Easy",
    options: ["It removes the need for a budget", "It identifies groups with similar needs", "It guarantees sales growth", "It replaces customer research"],
    answer: "B",
    explanation: "Segmentation groups customers by shared traits so messages and channels can be chosen with more precision."
  },
  {
    text: "A manager wants fewer fulfillment errors during peak season. What should be improved first?",
    topic: "Operations",
    difficulty: "Medium",
    options: ["The social media calendar", "Inventory and workflow controls", "The slogan", "The refund policy only"],
    answer: "B",
    explanation: "Fulfillment accuracy depends on reliable operational controls and clear workflow."
  },
  {
    text: "Which response shows professional selling behavior when a buyer raises an objection?",
    topic: "Selling",
    difficulty: "Medium",
    options: ["Ignore the objection", "Pressure the buyer to decide", "Clarify the concern and connect benefits", "Offer unrelated discounts"],
    answer: "C",
    explanation: "Effective selling addresses the concern directly and connects the solution to the buyer's needs."
  }
];

const state = {
  route: "landing",
  theme: localStorage.getItem("lift-theme") || "light",
  account: "free",
  role: "student",
  roleVerified: false,
  roleStatus: "Sign in to load account permissions.",
  adminInviteEmail: "new.admin@liftoff.test",
  adminInviteRole: "admin",
  adminInviteStatus: "No administrator access link generated.",
  adminInviteLink: "",
  governanceStatus: "No governance vote started.",
  governanceTarget: "",
  governanceReason: "",
  governanceVotes: [],
  adminProfiles: [],
  ownerCount: null,
  nameReviews: [],
  adminAuditLogs: [],
  adminControlStatus: "Admin data has not been loaded.",
  adminControlsLoading: false,
  adminPage: "overview",
  ownerPrivilegesSuspended: false,
  ownerPrivilegeForm: {
    password: "",
    status: "Owner privilege suspension is inactive."
  },
  broadcastAudience: "all",
  broadcastTitle: "Lift Off Exams update",
  broadcastMessage: "Weekly performance summaries are ready.",
  broadcastStatus: "No broadcast queued.",
  broadcasts: [],
  duplicateReviews: [],
  generatedBatches: [],
  generatedCandidates: [],
  generatedCandidateStatus: "Generated candidates have not been loaded.",
  generatedBatchStatus: "Generated batches have not been loaded.",
  generatedCandidateFilters: {
    reviewStatus: "All",
    validationStatus: "All",
    category: "All",
    topicTag: "All",
    batchId: "",
    keyword: ""
  },
  selectedGeneratedCandidateId: "",
  generatedCandidateEditStatus: "Select a generated candidate to review, edit, or publish.",
  generatedCandidateEditForm: {
    category: "",
    performanceIndicator: "",
    questionType: "Scenario",
    questionText: "",
    options: ["", "", "", ""],
    correctOptionId: "A",
    explanation: "",
    difficulty: "Medium",
    tags: ""
  },
  blueprintVersions: [],
  test: null,
  questionBank: sampleQuestions,
  bankSource: "Sample bank",
  supabaseStatus: "Not connected",
  supabaseImportIssues: [],
  supabaseLastLoad: {
    totalRows: 0,
    validRows: sampleQuestions.length,
    skippedRows: 0
  },
  onboarding: {
    examLevel: initialOnboarding.examLevel || "District Test",
    cluster: initialOnboarding.cluster || "Business Administration Core",
    goal: initialOnboarding.goal || "Build exam readiness",
    questionCount: Number(initialOnboarding.questionCount || 50),
    completed: Boolean(initialOnboarding.completed),
    status: initialOnboarding.status || "Choose an exam and cluster to personalize your practice plan."
  },
  supabaseConfig: {
    url: savedSupabaseConfig.url || "",
    anonKey: savedSupabaseConfig.anonKey || "",
    table: savedSupabaseConfig.table || "questions"
  },
  testIds: savedTestIds(),
  testIdLookup: {
    input: "",
    selectedId: "",
    status: "Enter a Test ID to preview it.",
    premiumCount: 50,
    timer: "60",
    customTimerMinutes: 30,
    studyMode: "Standard",
    randomizeOrder: false
  },
  user: null,
  authStatus: "Not signed in.",
  userQuestionStatuses: {},
  questionStatusStatus: "Question statuses are local until sign-in.",
  userDataStatus: "User history and settings are local until sign-in.",
  userDataLoading: false,
  questionStatusesLoading: false,
  questionStatusLoadedKey: "",
  questionStatusLoadPromise: null,
  questionBankAutoLoadKey: "",
  questionBankAutoLoadPromise: null,
  authForm: {
    email: "student@example.com",
    password: "password123",
    displayName: "Avery"
  },
  accountSettings: {
    displayName: "",
    email: "",
    phone: "",
    pendingEmail: "",
    status: "Account settings are local until sign-in."
  },
  billing: {
    status: "Billing is local until sign-in.",
    loading: false,
    checked: false,
    subscription: null,
    checkoutFunction: "create-checkout-session",
    portalFunction: "create-customer-portal-session"
  },
  teamAccounts: {
    teams: Array.isArray(initialTeamAccounts.teams) ? initialTeamAccounts.teams : [],
    memberships: Array.isArray(initialTeamAccounts.memberships) ? initialTeamAccounts.memberships : [],
    invites: Array.isArray(initialTeamAccounts.invites) ? initialTeamAccounts.invites : [],
    assignments: Array.isArray(initialTeamAccounts.assignments) ? initialTeamAccounts.assignments : [],
    assignmentRecipients: Array.isArray(initialTeamAccounts.assignmentRecipients) ? initialTeamAccounts.assignmentRecipients : [],
    selectedTeamId: initialTeamAccounts.selectedTeamId || "",
    acceptingInviteToken: initialTeamAccounts.acceptingInviteToken || "",
    inviteStatus: initialTeamAccounts.inviteStatus || "Open a team invite link to join a team account.",
    status: initialTeamAccounts.status || "Create a team account to assign practice to students.",
    form: {
      name: initialTeamAccounts.form?.name || "Lift Off Study Team"
    },
    memberForm: {
      email: initialTeamAccounts.memberForm?.email || "",
      displayName: initialTeamAccounts.memberForm?.displayName || "",
      role: initialTeamAccounts.memberForm?.role || "student",
      roleLabel: initialTeamAccounts.memberForm?.roleLabel || "Student"
    },
    assignmentForm: {
      title: initialTeamAccounts.assignmentForm?.title || "Practice Assignment",
      testId: initialTeamAccounts.assignmentForm?.testId || "",
      dueDate: initialTeamAccounts.assignmentForm?.dueDate || "",
      attemptLimit: Number(initialTeamAccounts.assignmentForm?.attemptLimit || 1),
      recipientIds: Array.isArray(initialTeamAccounts.assignmentForm?.recipientIds) ? initialTeamAccounts.assignmentForm.recipientIds : []
    }
  },
  deletionRequest: null,
  deletionForm: {
    confirmText: "",
    reason: "",
    status: "No deletion request is active."
  },
  adminDeletionQueue: [],
  adminDeletionStatus: "No deletion queue loaded.",
  userNotifications: [],
  notificationStatus: "No account notifications loaded.",
  passwordRecovery: {
    email: "student@example.com",
    newPassword: "",
    confirmPassword: "",
    status: "Enter your account email to receive a password reset link."
  },
  notificationSettings: {
    all: true,
    testCompletion: true,
    weeklyProgressReports: true,
    billing: true,
    account: true,
    performanceReports: true
  },
  uploadStatus: "No upload attempted.",
  searchFilters: {
    keyword: "",
    category: "All",
    difficulty: "All",
    seenStatus: "All"
  },
  searchKeywordDraft: null,
  reviewQuestionIndex: null,
  reviewQuestionConfirmed: false,
  exportStatus: "No export generated yet.",
  exportPreview: "",
  exportFilename: "",
  reportActionStatus: "No report action selected.",
  adminTagInput: "",
  adminTagStatus: "No tag changes yet.",
  adminTags: savedAdminTagsRaw ? savedAdminTags : [],
  selectedReportId: "",
  reportEditStatus: "Select a report to edit its question.",
  reportEditForm: {
    partitionKey: "",
    performanceIndicator: "",
    questionType: "Multiple Choice",
    questionText: "",
    options: ["", "", "", ""],
    correctOptionId: "A",
    explanation: "",
    difficulty: "Medium",
    tags: ""
  },
  reportQueue: initialReportQueue.length ? initialReportQueue : [
    {
      id: "RPT-SEED-1",
      priority: "12 reports",
      reason: "Incorrect answer",
      question: "Financial Analysis margin question",
      status: "Open",
      testId: "Sample",
      reportedAt: "Seeded"
    },
    {
      id: "RPT-SEED-2",
      priority: "4 reports",
      reason: "Unclear wording",
      question: "Promotion channel question",
      status: "Open",
      testId: "Sample",
      reportedAt: "Seeded"
    }
  ],
  bannedWordInput: "",
  bannedWordStatus: "No banned word submitted.",
  bannedWords: savedBannedWordsRaw ? savedBannedWords : ["example banned phrase", "flagged-name"],
  customBlueprints: initialCustomBlueprints,
  blueprintStatus: initialCustomBlueprints.length ? `${initialCustomBlueprints.length} saved custom blueprint${initialCustomBlueprints.length === 1 ? "" : "s"} loaded.` : "No custom blueprint created.",
  blueprintForm: {
    level: "District Test",
    category: "Marketing",
    version: "2026.1",
    reason: "Blueprint distribution update",
    distribution: "Promotion: 10\nSelling: 10\nCustomer Relations: 10"
  },
  uploadForm: {
    partitionKey: "Marketing",
    performanceIndicator: "Customer Relations",
    questionType: "Multiple Choice",
    questionText: "Which action best supports long-term customer retention after a promotional campaign?",
    options: [
      "Reduce all follow-up contact",
      "Collect feedback and personalize next offers",
      "Change the brand position weekly",
      "Limit service access after purchase"
    ],
    correctOptionId: "B",
    explanation: "Retention improves when the business uses feedback and relevant follow-up to keep value clear after the first interaction.",
    difficulty: "Medium",
    tags: "Marketing, Customer Relations, Medium"
  },
  bulkUploadText: `[
  {
    "partition_key": "Marketing",
    "performance_indicator": "Customer Relations",
    "question_type": "Multiple Choice",
    "question_text": "Which action best supports long-term customer retention after a promotional campaign?",
    "options": [
      { "id": "A", "text": "Reduce all follow-up contact" },
      { "id": "B", "text": "Collect feedback and personalize next offers" },
      { "id": "C", "text": "Change the brand position weekly" },
      { "id": "D", "text": "Limit service access after purchase" }
    ],
    "correct_option_id": "B",
    "explanation": "Retention improves when the business uses feedback and relevant follow-up to keep value clear after the first interaction.",
    "difficulty": "Medium",
    "tags": ["Marketing", "Customer Relations", "Medium"]
  }
]`,
  answers: {},
  completedTestIds: [],
  scoreHistory: [
    { id: "EXAMPLE01", mode: "Test", date: "Jun 12", correct: 34, total: 50, percent: 68, topics: ["Promotion", "Selling"] },
    { id: "EXAMPLE02", mode: "Quiz", date: "Jun 13", correct: 18, total: 25, percent: 72, topics: ["Financial Analysis"] },
    { id: "EXAMPLE03", mode: "Test", date: "Jun 14", correct: 36, total: 50, percent: 72, topics: ["Operations"] },
    { id: "EXAMPLE04", mode: "Infinite Run", date: "Jun 15", correct: 41, total: 50, percent: 82, topics: ["Customer Relations"] },
    { id: "EXAMPLE05", mode: "Test", date: "Jun 16", correct: 38, total: 50, percent: 76, topics: ["Risk Management"] },
    { id: "EXAMPLE06", mode: "Quiz", date: "Jun 17", correct: 23, total: 25, percent: 92, topics: ["Economics"] },
    { id: "EXAMPLE07", mode: "Test", date: "Jun 18", correct: 43, total: 50, percent: 86, topics: ["Professional Development"] }
  ],
  topicStats: [
    { topic: "Promotion", correct: 18, total: 25 },
    { topic: "Selling", correct: 12, total: 22 },
    { topic: "Customer Relations", correct: 21, total: 28 },
    { topic: "Financial Analysis", correct: 14, total: 30 },
    { topic: "Risk Management", correct: 11, total: 24 },
    { topic: "Operations", correct: 20, total: 26 }
  ],
  difficultyStats: [
    { difficulty: "Easy", correct: 19, total: 20 },
    { difficulty: "Medium", correct: 18, total: 25 },
    { difficulty: "Hard", correct: 9, total: 22 }
  ],
  confidenceStats: [
    { topic: "Promotion", unsure: 4, total: 25 },
    { topic: "Financial Analysis", unsure: 5, total: 30 },
    { topic: "Operations", unsure: 2, total: 26 }
  ],
  current: 0,
  timerHidden: false,
  strikeCount: 0,
  gradedAnswers: {},
  testNotice: "",
  testEndReason: "",
  generationNotice: "Manual tag filters use AND logic. Blueprint presets use their required topic distribution.",
  allowShorterGeneration: false,
  reportFormOpen: false,
  reportReason: "Incorrect answer",
  reportComments: "",
  resumeAvailable: false,
  pausedSession: null,
  hardcore: {
    enabled: false,
    strikes: "Two-Strike Mode",
    allowUnsure: true,
    weakFocus: true
  },
  selected: {
    category: "Business Administration Core",
    difficulties: ["Easy", "Medium"],
    topics: ["Business Law", "Communications", "Customer Relations", "Economics", "Emotional Intelligence", "Financial Analysis", "Information Management", "Knowledge Management", "Marketing", "Operations", "Professional Development", "Project Management", "Quality Management", "Risk Management", "Strategic Management"],
    count: 100,
    timer: "60",
    customTimerMinutes: 30,
    studyMode: "Standard",
    blueprint: "Business Administration Core - District Test"
  }
};

const app = document.querySelector("#app");
document.documentElement.dataset.theme = state.theme;
let timerInterval = null;
let searchKeywordTimer = null;

function logoMarkup() {
  return `<span class="mark" aria-hidden="true"><img src="./assets/logo.jpg" alt=""></span><span>Lift Off Exams</span>`;
}

function setRoute(route) {
  state.route = route;
  if (route !== "test") stopTimerLoop();
  if (route === "admin" && isAdminRole() && state.ownerCount === null && !state.adminControlsLoading) {
    setTimeout(() => refreshAdminControlData(), 0);
  }
  render();
}

function setAdminPage(page) {
  state.adminPage = page;
  state.route = "admin";
  if (page === "deletion" && isAdminRole() && !state.adminDeletionQueue.length) {
    setTimeout(() => refreshAdminDeletionQueue(), 0);
  }
  render();
}

function applyRecoveryRouteFromUrl() {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const teamInviteToken = params.get("team-invite") || (hash.startsWith("team-invite=") ? hash.slice("team-invite=".length) : "");
  if (teamInviteToken) {
    state.route = "team-invite";
    state.teamAccounts.acceptingInviteToken = decodeURIComponent(teamInviteToken);
    state.teamAccounts.inviteStatus = "Review and accept this team invitation.";
    persistTeamAccounts();
    return true;
  }
  if (hash === "password-reset" || params.get("type") === "recovery") {
    state.route = "password-reset";
    state.passwordRecovery.status = "Create a new password for this account.";
    return true;
  }
  if (params.get("type") === "email_change" || params.get("type") === "email") {
    state.route = "settings";
    state.accountSettings.pendingEmail = "";
    state.accountSettings.status = "Email change confirmed. Your account email has been updated.";
    window.history.replaceState({}, document.title, window.location.href.split("#")[0]);
    return true;
  }
  return false;
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("lift-theme", state.theme);
  document.documentElement.dataset.theme = state.theme;
  saveUserPreferences();
  render();
}

function toggleNotificationPreference(key) {
  state.notificationSettings[key] = !state.notificationSettings[key];
  saveUserPreferences();
  render();
}

function testId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

function persistTestIds() {
  localStorage.setItem("lift-test-ids", JSON.stringify(state.testIds));
}

function currentPoolTimestamp() {
  const periodMs = 7 * 24 * 60 * 60 * 1000;
  return new Date(Math.floor(Date.now() / periodMs) * periodMs).toISOString();
}

function stringSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < String(value).length; i++) {
    hash ^= String(value).charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seedText) {
  const shuffled = [...items];
  const random = seededRandom(stringSeed(seedText));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function selectedTimerSeconds() {
  if (state.selected.timer === "none") return null;
  if (state.selected.timer === "custom") {
    const rawMinutes = Number(state.selected.customTimerMinutes);
    const customMinutes = Math.min(999, Math.max(1, Number.isFinite(rawMinutes) ? rawMinutes : 30));
    state.selected.customTimerMinutes = customMinutes;
    return customMinutes * 60;
  }
  const minutes = Number(state.selected.timer || 60);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 60 * 60;
}

function setCustomTimerMinutes(value) {
  state.selected.customTimerMinutes = Math.min(999, Math.max(1, Number(value) || 1));
  render();
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function timerRemainingSeconds() {
  if (!state.test?.timerSeconds) return null;
  const elapsed = Math.floor((Date.now() - state.test.startedAt) / 1000);
  return Math.max(0, state.test.timerSeconds - elapsed);
}

function testElapsedSeconds(test = state.test, now = Date.now()) {
  if (!test) return 0;
  if (Number.isFinite(Number(test.elapsedSeconds))) return Math.max(0, Number(test.elapsedSeconds));
  const base = Math.max(0, Number(test.elapsedSecondsBeforeStart || 0));
  const startedAt = Number(test.startedAt || 0);
  if (!startedAt) return base;
  const endedAt = Number(test.completedAt || now);
  return Math.max(0, base + Math.floor((endedAt - startedAt) / 1000));
}

function formatElapsedTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

function stopTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function startTimerLoop() {
  stopTimerLoop();
  if (!state.test?.timerSeconds || state.route !== "test") return;
  timerInterval = setInterval(() => {
    if (state.route !== "test" || !state.test?.timerSeconds) {
      stopTimerLoop();
      return;
    }
    if (timerRemainingSeconds() <= 0) {
      state.testEndReason = "Time expired.";
      completeTest();
      return;
    }
    render();
  }, 1000);
}

function activeQuestions() {
  return state.questionBank.length ? state.questionBank : sampleQuestions;
}

function allTopicTags() {
  return [...new Set([...topics, ...state.adminTags].map(normalizeTopicName).filter(Boolean))];
}

function activeQuestionStatusIds() {
  return [...new Set(activeQuestions().map(question => question.id).filter(isUuid))];
}

function questionStatusLoadKey() {
  return state.user ? `${state.user.id}:${activeQuestionStatusIds().join(",")}` : "";
}

function allBlueprints() {
  return [...prdBlueprints, ...state.customBlueprints];
}

function persistCustomBlueprints() {
  localStorage.setItem("lift-custom-blueprints", JSON.stringify(state.customBlueprints));
  saveUserCustomBlueprints();
}

function selectedBlueprint() {
  if (state.selected.blueprint === "__manual__") return null;
  return allBlueprints().find(blueprint => blueprint.name === state.selected.blueprint) || null;
}

function questionTopicValues(question) {
  return [
    question.topic,
    question.category,
    question.performanceIndicator,
    question.partitionKey,
    ...(Array.isArray(question.tags) ? question.tags : parseTags(question.tags))
  ].filter(Boolean).map(normalizeTopicName);
}

function questionMatchesTopic(question, topic) {
  const wanted = normalizeTopicName(topic).toLowerCase();
  return questionTopicValues(question).some(value => value.toLowerCase() === wanted);
}

function questionMatchesCategory(question, category) {
  const wanted = normalizeTopicName(category).toLowerCase();
  return questionTopicValues(question).some(value => value.toLowerCase() === wanted);
}

function blueprintTopics(blueprint) {
  return Object.keys(blueprint?.distribution || {}).filter(topic => blueprint.distribution[topic] > 0);
}

function pruneSelectedTopicsForBlueprint(blueprint) {
  if (!blueprint) return;
  const allowed = new Set(blueprintTopics(blueprint));
  state.selected.topics = state.selected.topics.filter(topic => allowed.has(topic));
  if (!state.selected.topics.length) state.selected.topics = [...allowed];
}

function blueprintCoverage(blueprint) {
  if (!blueprint) return { status: "Manual", coverage: 0, shortfalls: [] };
  const bank = activeQuestions();
  const shortfalls = Object.entries(blueprint.distribution)
    .map(([topic, required]) => {
      const available = bank.filter(question => questionMatchesTopic(question, topic)).length;
      return { topic, required, available, missing: Math.max(0, required - available) };
    })
    .filter(item => item.missing > 0);
  const requiredTotal = blueprint.totalQuestions || 1;
  const missingTotal = shortfalls.reduce((sum, item) => sum + item.missing, 0);
  const coverage = Math.max(0, Math.round(((requiredTotal - missingTotal) / requiredTotal) * 100));
  return {
    status: shortfalls.length === 0 ? "Valid" : coverage >= 75 ? "Warning" : "Invalid",
    coverage,
    shortfalls: shortfalls.map(item => `${item.topic} +${item.missing}`)
  };
}

function applyBlueprint(blueprint) {
  if (!blueprint) return;
  state.selected.category = blueprint.category;
  state.selected.topics = blueprintTopics(blueprint);
  pruneSelectedTopicsForBlueprint(blueprint);
  state.selected.count = blueprint.totalQuestions;
  state.selected.blueprint = blueprint.name;
}

function selectBlueprint(value) {
  state.selected.blueprint = value;
  const blueprint = selectedBlueprint();
  if (blueprint) applyBlueprint(blueprint);
  if (!blueprint && value === "__manual__") state.selected.topics = state.selected.topics.filter(topic => allTopicTags().includes(topic));
  render();
}

function onboardingExamLevels() {
  return [...new Set(prdBlueprints.map(blueprint => blueprint.level).filter(Boolean))];
}

function onboardingClusters() {
  return [...new Set(allBlueprints().map(blueprint => blueprint.category || blueprint.cluster).filter(Boolean))];
}

function currentOnboardingBlueprint() {
  const cluster = state.onboarding.cluster;
  const examLevel = state.onboarding.examLevel;
  const blueprints = allBlueprints();
  return blueprints.find(blueprint => blueprint.category === cluster && blueprint.level === examLevel)
    || blueprints.find(blueprint => blueprint.cluster === cluster && blueprint.level === examLevel)
    || blueprints.find(blueprint => blueprint.category === cluster)
    || blueprints[0]
    || null;
}

function persistOnboarding() {
  localStorage.setItem("lift-onboarding", JSON.stringify(state.onboarding));
  saveUserPreferences();
}

function onboardingQuestionCount() {
  const count = Number(state.onboarding.questionCount);
  return Math.min(250, Math.max(1, Number.isFinite(count) ? Math.round(count) : 50));
}

function updateOnboardingQuestionCount(value) {
  state.onboarding.questionCount = onboardingQuestionCountFromValue(value);
  state.onboarding.completed = false;
  state.onboarding.status = `Ready to save a ${state.onboarding.questionCount}-question practice plan.`;
  persistOnboarding();
  render();
}

function onboardingQuestionCountFromValue(value) {
  const count = Number(value);
  return Math.min(250, Math.max(1, Number.isFinite(count) ? Math.round(count) : 50));
}

function onboardingGoalOptions() {
  return [
    "Build exam readiness",
    "Find weak topics",
    "Improve speed",
    "Review before competition"
  ];
}

function onboardingGoalImpact(goal = state.onboarding.goal) {
  const impacts = {
    "Build exam readiness": {
      title: "Exam-readiness path",
      body: "Favor full-length blueprint tests, results review, explanations, and Test IDs so the user can retake a reproducible exam path."
    },
    "Find weak topics": {
      title: "Weak-area discovery",
      body: "Prioritize the diagnostic first, then push low-scoring topic tags into focused practice and analytics review."
    },
    "Improve speed": {
      title: "Speed training",
      body: "Use shorter timed runs, surface time spent on results, and nudge the user toward repeat practice with tighter pacing."
    },
    "Review before competition": {
      title: "Final review sprint",
      body: "Blend weak-topic focus with tighter timed practice, then use results review to clean up misses before competition."
    }
  };
  return impacts[goal] || impacts["Build exam readiness"];
}

function updateOnboardingDraft(field, value) {
  if (!["examLevel", "cluster", "goal"].includes(field)) return;
  state.onboarding[field] = value;
  state.onboarding.completed = false;
  const blueprint = currentOnboardingBlueprint();
  state.onboarding.status = blueprint
    ? `Ready to save ${blueprint.name}.`
    : "Choose an exam and cluster to personalize your practice plan.";
  persistOnboarding();
  render();
}

function applyOnboardingPlanToSelected() {
  const blueprint = currentOnboardingBlueprint();
  if (!blueprint) {
    state.onboarding.status = "No matching blueprint was found for that exam and cluster.";
    persistOnboarding();
    return null;
  }
  applyBlueprint(blueprint);
  state.selected.count = onboardingQuestionCount();
  state.onboarding.completed = true;
  state.onboarding.status = `${blueprint.name} is now your active practice plan.`;
  persistOnboarding();
  return blueprint;
}

function saveOnboardingPlan() {
  applyOnboardingPlanToSelected();
  render();
}

function realCompletedScores() {
  return state.scoreHistory.filter(entry => !String(entry.id || "").startsWith("EXAMPLE"));
}

function onboardingWeakTopic(blueprint) {
  const allowedTopics = new Set(blueprintTopics(blueprint));
  return state.topicStats
    .filter(stat => allowedTopics.has(stat.topic) && Number(stat.total) > 0)
    .map(stat => ({ ...stat, percent: Math.round((stat.correct / stat.total) * 100) }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total)[0] || null;
}

function onboardingDiagnosticQuestionCount() {
  return onboardingQuestionCount();
}

function onboardingRecommendation() {
  const blueprint = currentOnboardingBlueprint();
  if (!blueprint) {
    return {
      title: "Choose a starting plan",
      body: "Pick an exam and cluster so Lift Off can match the right blueprint.",
      action: "save"
    };
  }
  if (!state.onboarding.completed) {
    return {
      title: "Save your practice plan",
      body: `${blueprint.name} will set the category, topic tags, and question count for future tests.`,
      action: "save"
    };
  }
  if (!realCompletedScores().length) {
    return {
      title: "Start with a diagnostic",
      body: `Take a ${onboardingDiagnosticQuestionCount()}-question first run so the analytics page can begin finding your strongest and weakest areas.`,
      action: "diagnostic"
    };
  }
  const weakTopic = onboardingWeakTopic(blueprint);
  if (weakTopic && weakTopic.percent < 70) {
    return {
      title: `Review ${weakTopic.topic}`,
      body: `Your current accuracy is ${weakTopic.percent}% on this topic. A focused practice set is the best next move.`,
      action: "topic",
      topic: weakTopic.topic
    };
  }
  return {
    title: "Generate a full blueprint test",
    body: "Your recent work is ready for a more complete exam-style run using the saved blueprint.",
    action: "generator"
  };
}

function startOnboardingDiagnostic() {
  const blueprint = applyOnboardingPlanToSelected();
  if (!blueprint) return render();
  state.selected.count = onboardingDiagnosticQuestionCount();
  state.selected.difficulties = ["Easy", "Medium"];
  state.selected.timer = "60";
  startTest("Diagnostic");
}

function startOnboardingPractice(topic = "") {
  const blueprint = applyOnboardingPlanToSelected();
  if (!blueprint) return render();
  const normalizedTopic = normalizeTopicName(topic);
  if (normalizedTopic && blueprintTopics(blueprint).includes(normalizedTopic)) {
    state.selected.blueprint = "__manual__";
    state.selected.topics = [normalizedTopic];
    state.selected.count = onboardingQuestionCount();
  }
  state.generationNotice = normalizedTopic
    ? `Focused practice is set for ${normalizedTopic}.`
    : `${blueprint.name} is ready in the generator.`;
  persistOnboarding();
  setRoute("generator");
}

function parseBlueprintDistribution(value) {
  return String(value || "")
    .split(/\n|,/)
    .map(line => line.trim())
    .filter(Boolean)
    .reduce((distribution, line) => {
      const match = line.match(/^(.+?)\s*(?::|[-\u2013\u2014]|\t|\s{2,})\s*(\d+)$/);
      if (!match) return distribution;
      distribution[normalizeTopicName(match[1])] = Number(match[2]);
      return distribution;
    }, {});
}

function saveBlueprintFromForm() {
  if (!requireAdminPermission("save exam blueprints")) return;
  const distribution = parseBlueprintDistribution(state.blueprintForm.distribution);
  if (!Object.keys(distribution).length) {
    state.blueprintStatus = "Blueprint was not created. Add topic/count lines such as Promotion: 10.";
    render();
    return;
  }
  const blueprint = createBlueprint(
    `${state.blueprintForm.category} Blueprint`,
    state.blueprintForm.level.trim() || "District Test",
    state.blueprintForm.category,
    distribution,
    state.blueprintForm.version.trim() || "2026.1"
  );
  state.customBlueprints = state.customBlueprints.filter(existing => existing.name !== blueprint.name);
  state.customBlueprints.push(blueprint);
  persistCustomBlueprints();
  state.blueprintStatus = `Created ${blueprint.name} with ${blueprint.totalQuestions} questions.`;
  applyBlueprint(blueprint);
  render();
  saveBlueprintVersionToSupabase(blueprint, state.blueprintForm.reason)
    .then(() => {
      state.blueprintStatus = `Saved ${blueprint.name} version ${blueprint.version} to Supabase.`;
      render();
    })
    .catch(error => {
      state.blueprintStatus = `Saved locally. Supabase version save failed: ${error.message}`;
      render();
    });
}

function restorePrdBlueprints() {
  state.customBlueprints = [];
  persistCustomBlueprints();
  state.blueprintStatus = "Custom blueprints cleared. PRD blueprints restored.";
  applyBlueprint(prdBlueprints[0]);
  render();
}

function deleteCustomBlueprint(name) {
  if (!requireAdminPermission("retire exam blueprints")) return;
  state.customBlueprints = state.customBlueprints.filter(blueprint => blueprint.name !== name);
  persistCustomBlueprints();
  if (state.selected.blueprint === name) applyBlueprint(prdBlueprints[0]);
  state.blueprintStatus = `Deleted ${name}.`;
  render();
}

function persistBannedWords() {
  localStorage.setItem("lift-banned-words", JSON.stringify(state.bannedWords));
}

async function submitBannedWord() {
  if (!requireAdminPermission("manage banned terms")) return;
  const word = state.bannedWordInput.trim();
  if (!word) {
    state.bannedWordStatus = "Enter a word or phrase before submitting.";
    render();
    return;
  }
  const exists = state.bannedWords.some(item => item.toLowerCase() === word.toLowerCase());
  if (exists) {
    state.bannedWordStatus = `${word} is already on the banned word list.`;
    render();
    return;
  }
  state.bannedWords.push(word);
  state.bannedWordInput = "";
  state.bannedWordStatus = `Added ${word} to the banned word list.`;
  persistBannedWords();
  if (hasSupabaseConfig()) {
    try {
      const client = await supabaseClient();
      const { error } = await client.from("banned_terms").upsert({
        term: word,
        active: true,
        created_by: state.user.id
      }, { onConflict: "term" });
      if (error) throw error;
      state.bannedWordStatus = `Added ${word} to the shared banned-word list.`;
      await writeAdminAudit("Banned term added", "banned_term", word, null, {});
    } catch (error) {
      state.bannedWordStatus = `Added locally. Supabase save failed: ${error.message}`;
    }
  }
  render();
}

async function removeBannedWord(word) {
  if (!requireAdminPermission("manage banned terms")) return;
  const normalizedWord = String(word || "").trim().toLowerCase();
  const before = state.bannedWords.length;
  state.bannedWords = state.bannedWords.filter(item => item.trim().toLowerCase() !== normalizedWord);
  state.bannedWordStatus = before === state.bannedWords.length
    ? `${word} was not found on the banned word list.`
    : `Removed ${word} from the banned word list.`;
  persistBannedWords();
  if (hasSupabaseConfig()) {
    try {
      const client = await supabaseClient();
      const { error } = await client.from("banned_terms").update({ active: false }).eq("term", word);
      if (error) throw error;
      state.bannedWordStatus = `Removed ${word} from the shared banned-word list.`;
      await writeAdminAudit("Banned term removed", "banned_term", word, null, {});
    } catch (error) {
      state.bannedWordStatus = `Removed locally. Supabase update failed: ${error.message}`;
    }
  }
  render();
}

function persistAdminTags() {
  localStorage.setItem("lift-admin-tags", JSON.stringify(state.adminTags));
}

function submitAdminTag() {
  if (!requireAdminPermission("manage tags")) return;
  const tag = normalizeTopicName(state.adminTagInput);
  if (!tag) {
    state.adminTagStatus = "Enter a topic tag before submitting.";
    render();
    return;
  }
  const exists = allTopicTags().some(existing => existing.toLowerCase() === tag.toLowerCase());
  if (exists) {
    state.adminTagStatus = `${tag} already exists.`;
    render();
    return;
  }
  state.adminTags.push(tag);
  state.adminTagInput = "";
  state.adminTagStatus = `Created topic tag ${tag}.`;
  persistAdminTags();
  render();
}

function removeAdminTag(tag) {
  if (!requireAdminPermission("manage tags")) return;
  const normalized = normalizeTopicName(tag).toLowerCase();
  state.adminTags = state.adminTags.filter(item => item.toLowerCase() !== normalized);
  state.selected.topics = state.selected.topics.filter(item => item.toLowerCase() !== normalized);
  state.adminTagStatus = `Removed custom topic tag ${tag}.`;
  persistAdminTags();
  render();
}

function persistReportQueue() {
  localStorage.setItem("lift-report-queue", JSON.stringify(state.reportQueue));
}

function questionSnapshot(question) {
  return {
    id: question.id || "",
    partitionKey: question.category || question.partitionKey || "",
    performanceIndicator: question.topic || question.performanceIndicator || "",
    questionType: question.questionType || "Multiple Choice",
    questionText: question.text || "",
    options: [...(question.options || ["", "", "", ""])].slice(0, 4),
    correctOptionId: normalizeCorrectOptionId(question.answer || "A"),
    explanation: question.explanation || "",
    difficulty: normalizeDifficulty(question.difficulty || "Medium"),
    tags: parseTags(question.tags || [question.category, question.topic, question.difficulty]).join(", ")
  };
}

function reportFormPayload() {
  const form = state.reportEditForm;
  return {
    id: form.id || "",
    partition_key: form.partitionKey.trim(),
    performance_indicator: form.performanceIndicator.trim(),
    question_type: form.questionType.trim() || "Multiple Choice",
    question_text: form.questionText.trim(),
    options: normalizeOptions(form.options),
    correct_option_id: normalizeCorrectOptionId(form.correctOptionId),
    explanation: form.explanation.trim(),
    difficulty: normalizeDifficulty(form.difficulty),
    tags: parseTags(form.tags),
    updated_at: new Date().toISOString()
  };
}

function hydrateReportEditForm(report) {
  const snapshot = report.questionSnapshot || {};
  const source = activeQuestions().find(question =>
    (snapshot.id && question.id === snapshot.id) ||
    question.text === report.question ||
    question.text === snapshot.questionText
  );
  const q = source ? questionSnapshot(source) : snapshot;
  state.reportEditForm = {
    id: q.id || snapshot.id || "",
    partitionKey: q.partitionKey || report.category || "Marketing",
    performanceIndicator: q.performanceIndicator || report.topic || "General",
    questionType: q.questionType || "Multiple Choice",
    questionText: q.questionText || report.question || "",
    options: normalizeOptions(q.options || []).map(option => option.text).concat(["", "", "", ""]).slice(0, 4),
    correctOptionId: normalizeCorrectOptionId(q.correctOptionId || "A"),
    explanation: q.explanation || "",
    difficulty: q.difficulty || report.difficulty || "Medium",
    tags: q.tags || [q.partitionKey, q.performanceIndicator, q.difficulty].filter(Boolean).join(", ")
  };
}

function selectReportForEdit(id) {
  if (!requireAdminPermission("review reported questions")) return;
  const report = state.reportQueue.find(item => item.id === id);
  if (!report) {
    state.reportEditStatus = "Report was not found.";
    render();
    return;
  }
  state.selectedReportId = id;
  hydrateReportEditForm(report);
  state.reportEditStatus = `Editing report ${id}.`;
  render();
}

function applyQuestionPayloadToLocalBank(payload) {
  const selected = state.reportQueue.find(report => report.id === state.selectedReportId);
  let updated = 0;
  activeQuestions().forEach(question => {
    const matchesId = payload.id && question.id === payload.id;
    const matchesText = selected && question.text === selected.question;
    if (!matchesId && !matchesText) return;
    question.id = question.id || payload.id;
    question.category = payload.partition_key;
    question.partitionKey = payload.partition_key;
    question.topic = payload.performance_indicator;
    question.performanceIndicator = payload.performance_indicator;
    question.questionType = payload.question_type;
    question.text = payload.question_text;
    question.options = payload.options.map(option => option.text);
    question.answer = payload.correct_option_id;
    question.explanation = payload.explanation;
    question.difficulty = payload.difficulty;
    question.tags = payload.tags;
    question.updatedAt = payload.updated_at;
    updated += 1;
  });
  return updated;
}

function updateSelectedReportAfterEdit(payload, status = "Work In Progress") {
  state.reportQueue = state.reportQueue.map(report => report.id === state.selectedReportId
    ? {
        ...report,
        status,
        action: status === "Fixed" ? "Question edited and marked fixed" : "Question edit saved",
        question: payload.question_text,
        topic: payload.performance_indicator,
        difficulty: payload.difficulty,
        questionSnapshot: {
          id: payload.id,
          partitionKey: payload.partition_key,
          performanceIndicator: payload.performance_indicator,
          questionType: payload.question_type,
          questionText: payload.question_text,
          options: payload.options.map(option => option.text),
          correctOptionId: payload.correct_option_id,
          explanation: payload.explanation,
          difficulty: payload.difficulty,
          tags: payload.tags.join(", ")
        },
        updatedAt: new Date().toLocaleString()
      }
    : report
  );
  persistReportQueue();
}

function saveReportQuestionLocally(markFixed = false) {
  if (!requireAdminPermission("edit questions")) return null;
  const payload = reportFormPayload();
  const errors = validateQuestionPayload({
    ...payload,
    status: "Unseen",
    seen_count: 0
  });
  if (errors.length) {
    state.reportEditStatus = `Validation failed: ${errors.join(" ")}`;
    render();
    return null;
  }
  const updated = applyQuestionPayloadToLocalBank(payload);
  updateSelectedReportAfterEdit(payload, markFixed ? "Fixed" : "Work In Progress");
  state.reportEditStatus = `Saved edit locally${updated ? ` and updated ${updated} matching question${updated === 1 ? "" : "s"}` : ""}.`;
  render();
  return payload;
}

function retireReportQuestionLocally() {
  if (!requireAdminPermission("retire questions")) return;
  const payload = reportFormPayload();
  const selected = state.reportQueue.find(report => report.id === state.selectedReportId);
  let retired = 0;
  activeQuestions().forEach(question => {
    const matchesId = payload.id && question.id === payload.id;
    const matchesText = selected && question.text === selected.question;
    if (!matchesId && !matchesText) return;
    question.lifecycleState = "Retired";
    question.updatedAt = new Date().toISOString();
    retired += 1;
  });
  updateSelectedReportAfterEdit(payload, "Fixed");
  state.reportEditStatus = `Retired ${retired || 0} matching question${retired === 1 ? "" : "s"} locally. Retired questions are excluded from new generated tests.`;
  render();
}

async function updateSupabaseQuestion(payload) {
  const { url, anonKey, table } = state.supabaseConfig;
  if (!url || !anonKey || !table) throw new Error("Add a Project URL, anon key, and table name first.");
  if (!payload.id || !isUuid(payload.id)) throw new Error("This report does not have a Supabase UUID question id. Reload the Supabase bank, then report the question again.");
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(payload.id)}`;
  const { id, ...body } = payload;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: await supabaseHeaders(),
    body: JSON.stringify(body)
  });
  const responseText = await response.text();
  if (!response.ok) {
    let detail = responseText;
    try {
      const parsed = JSON.parse(responseText);
      detail = parsed.message || parsed.details || responseText;
    } catch {}
    throw new Error(`Supabase update returned ${response.status}: ${detail}`);
  }
  return responseText ? JSON.parse(responseText) : [];
}

async function saveReportQuestionToSupabase() {
  if (!requireAdminPermission("edit questions")) return;
  const payload = saveReportQuestionLocally(false);
  if (!payload) return;
  state.reportEditStatus = "Saving corrected question to Supabase...";
  render();
  try {
    await updateSupabaseQuestion(payload);
    updateSelectedReportAfterEdit(payload, "Fixed");
    const updatedReport = state.reportQueue.find(report => report.id === state.selectedReportId);
    if (updatedReport) await updateSupabaseQuestionReport(updatedReport);
    await writeAdminAudit("Reported question corrected", "question", payload.id, "Report marked fixed", { report_id: state.selectedReportId });
    state.reportEditStatus = "Saved corrected question to Supabase and marked the report fixed.";
    await loadSupabaseBank();
  } catch (error) {
    state.reportEditStatus = error.message;
    render();
  }
}

async function generateAdminAccessLink() {
  if (!isAdminRole()) {
    state.adminInviteStatus = "Only Administrators and Owners may generate administrator access links.";
    render();
    return;
  }
  const email = state.adminInviteEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    state.adminInviteStatus = "Enter a valid email before generating an access link.";
    render();
    return;
  }
  if (state.adminInviteRole === "owner" && !isOwnerRole()) {
    state.adminInviteStatus = "Only Owners may create Owner invite records.";
    render();
    return;
  }
  state.adminInviteStatus = "Creating tokenized invite record...";
  state.adminInviteLink = "";
  render();
  try {
    const { record, link } = await createAdminAccessLinkRecord(email, state.adminInviteRole);
    state.adminInviteStatus = `Invite saved to Supabase for ${record.email}.`;
    state.adminInviteLink = link;
    auditEvents.unshift([new Date().toLocaleString(), state.user?.email || roleLabel(), "Generated admin access link", email, `${record.requested_role} invite ${record.id}`]);
    await writeAdminAudit("Administrator access link generated", "admin_access_link", record.id, null, { email, requested_role: record.requested_role });
  } catch (error) {
    state.adminInviteStatus = `Could not create Supabase invite: ${error.message}`;
    state.adminInviteLink = "";
  }
  render();
}

async function copyAdminInviteLink() {
  if (!state.adminInviteLink) return;
  try {
    await navigator.clipboard.writeText(state.adminInviteLink);
    state.adminInviteStatus = "Invite link copied.";
  } catch (error) {
    state.adminInviteStatus = "Copy failed. Select the link and copy it manually.";
  }
  render();
}

async function startGovernanceVote(action) {
  if (!isOwnerRole()) {
    state.governanceStatus = "Only Owners may start governance votes.";
    render();
    return;
  }
  state.governanceStatus = `Starting ${action} vote...`;
  render();
  try {
    const client = await supabaseClient();
    const targetValue = state.governanceTarget.trim();
    const targetProfile = state.adminProfiles.find(profile =>
      profile.user_id === targetValue ||
      profile.display_name?.toLowerCase() === targetValue.toLowerCase()
    );
    const { data, error } = await client.rpc("create_governance_vote", {
      action_value: action,
      target_user_id_value: targetProfile?.user_id || null,
      target_email_value: targetProfile ? null : targetValue || null,
      reason_value: state.governanceReason.trim() || null
    });
    if (error) throw error;
    const { data: ballotStatus, error: ballotError } = await client.rpc("cast_governance_ballot", {
      vote_id_value: data,
      decision_value: "Approve"
    });
    if (ballotError) throw ballotError;
    state.governanceStatus = ballotStatus === "Approved"
      ? `${action} approved and applied.`
      : `${action} vote created with your approval recorded.`;
    await loadOwnerCount(client);
    await loadAdminProfiles(client);
    await loadGovernanceVotes(client);
    await loadAdminAuditLogs(client);
  } catch (error) {
    state.governanceStatus = `Could not start governance vote: ${error.message}`;
  }
  render();
}

async function castGovernanceBallot(id, decision) {
  if (!isOwnerRole()) return;
  state.governanceStatus = `Saving ${decision.toLowerCase()} ballot...`;
  render();
  try {
    const client = await supabaseClient();
    const { data, error } = await client.rpc("cast_governance_ballot", {
      vote_id_value: id,
      decision_value: decision
    });
    if (error) throw error;
    state.governanceStatus = `Ballot saved. Vote status: ${data}.`;
    await loadGovernanceVotes(client);
    await loadAdminAuditLogs(client);
  } catch (error) {
    state.governanceStatus = `Could not save ballot: ${error.message}`;
  }
  render();
}

async function setOwnOwnerPrivilegesSuspended(suspendValue) {
  if (!state.user?.email) {
    state.ownerPrivilegeForm.status = "Sign in before changing Owner privileges.";
    render();
    return;
  }
  const password = state.ownerPrivilegeForm.password;
  if (!password) {
    state.ownerPrivilegeForm.status = "Enter your account password first.";
    render();
    return;
  }
  if (suspendValue && !isOwnerRole()) {
    state.ownerPrivilegeForm.status = "Only active Owners may suspend Owner privileges.";
    render();
    return;
  }
  if (!suspendValue && !state.ownerPrivilegesSuspended) {
    state.ownerPrivilegeForm.status = "Owner privileges are not currently suspended.";
    render();
    return;
  }
  state.ownerPrivilegeForm.status = suspendValue
    ? "Verifying password and suspending Owner privileges..."
    : "Verifying password and restoring Owner privileges...";
  render();
  try {
    const client = await supabaseClient();
    const signInResult = await withTimeout(client.auth.signInWithPassword({
      email: state.user.email,
      password
    }), 10000, "Password verification");
    if (signInResult.error) throw signInResult.error;

    const { data, error } = await client.rpc("set_own_owner_privileges_suspended", {
      suspend_value: suspendValue
    });
    if (error) throw error;

    await client.auth.refreshSession();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    state.user = userData.user;
    await applyUserRole(userData.user);
    await refreshAdminControlData();
    state.adminPage = "owner-access";
    state.ownerPrivilegeForm.password = "";
    state.ownerPrivilegeForm.status = data === "Restored"
      ? "Owner privileges restored."
      : "Owner privileges suspended. You now have Administrator access until restored.";
  } catch (error) {
    state.ownerPrivilegeForm.status = `Could not update Owner privileges: ${error.message}`;
  }
  render();
}

async function loadAdminProfiles(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("user_id,display_name,role,account_tier,suspended_until,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  state.adminProfiles = data || [];
}

async function loadOwnerCount(clientArg) {
  const client = clientArg || await supabaseClient();
  const rpcResult = await client.rpc("get_active_owner_count");
  if (!rpcResult.error) {
    state.ownerCount = Number(rpcResult.data || 0);
    return;
  }
  const { data, error } = await client
    .from("profiles")
    .select("user_id,suspended_until")
    .eq("role", "owner")
    .limit(1000);
  if (error) throw error;
  const now = Date.now();
  state.ownerCount = (data || []).filter(profile =>
    !profile.suspended_until || new Date(profile.suspended_until).getTime() < now
  ).length;
}

async function loadNameReviews(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("name_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  state.nameReviews = data || [];
}

async function loadBannedTerms(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("banned_terms")
    .select("term")
    .eq("active", true)
    .order("term");
  if (error) throw error;
  state.bannedWords = (data || []).map(item => item.term);
  persistBannedWords();
}

async function loadBroadcasts(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("notification_broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  state.broadcasts = data || [];
}

async function loadGovernanceVotes(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("governance_votes")
    .select("*,governance_ballots(decision,owner_user_id,created_at)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  state.governanceVotes = data || [];
}

async function loadAdminAuditLogs(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  state.adminAuditLogs = data || [];
}

async function loadDuplicateReviews(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("duplicate_question_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  state.duplicateReviews = (data || []).map(row => ({
    id: row.id,
    candidate: row.candidate_question,
    candidateText: row.candidate_question?.question_text || "",
    matchingQuestionId: row.matching_question_id || "",
    matchingText: activeQuestions().find(question => question.id === row.matching_question_id)?.text || "Stored question",
    similarity: row.similarity,
    status: row.status
  }));
}

async function loadGeneratedQuestionBatches(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("generated_question_batches")
    .select("id,openai_batch_id,status,requested_count,imported_count,failed_count,created_at,completed_at,error,metadata")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  state.generatedBatches = data || [];
  state.generatedBatchStatus = state.generatedBatches.length
    ? `Loaded ${state.generatedBatches.length} generated batch${state.generatedBatches.length === 1 ? "" : "es"}.`
    : "No generated batches found yet.";
}

function generatedCandidateFilterSummary() {
  const filters = state.generatedCandidateFilters;
  const active = [];
  if (filters.reviewStatus !== "All") active.push(filters.reviewStatus);
  if (filters.validationStatus !== "All") active.push(filters.validationStatus);
  if (filters.category !== "All") active.push(filters.category);
  if (filters.topicTag !== "All") active.push(filters.topicTag);
  if (filters.batchId) active.push(`batch ${filters.batchId.slice(0, 8)}`);
  if (filters.keyword) active.push(`"${filters.keyword}"`);
  return active.length ? ` Filters: ${active.join(", ")}.` : "";
}

async function loadGeneratedQuestionCandidates(clientArg) {
  const client = clientArg || await supabaseClient();
  const filters = state.generatedCandidateFilters;
  let query = client
    .from("generated_question_candidates")
    .select("id,batch_job_id,source_custom_id,performance_indicator,partition_keys,category,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,question_hash,validation_status,review_status,quality_score,validation_errors,reviewed_at,published_question_id,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (filters.reviewStatus !== "All") query = query.eq("review_status", filters.reviewStatus);
  if (filters.validationStatus !== "All") query = query.eq("validation_status", filters.validationStatus);
  if (filters.category !== "All") query = query.eq("category", filters.category);
  if (filters.topicTag !== "All") query = query.contains("tags", [filters.topicTag]);
  if (filters.batchId.trim()) query = query.eq("batch_job_id", filters.batchId.trim());
  if (filters.keyword.trim()) {
    const term = filters.keyword.trim().replace(/[%,]/g, "");
    query = query.or(`question_text.ilike.%${term}%,performance_indicator.ilike.%${term}%,source_custom_id.ilike.%${term}%`);
  }
  query = query.limit(100);
  const { data, error } = await query;
  if (error) throw error;
  state.generatedCandidates = data || [];
  state.generatedCandidateStatus = `Loaded ${state.generatedCandidates.length} proposed question${state.generatedCandidates.length === 1 ? "" : "s"}.${generatedCandidateFilterSummary()}`;
  if (state.selectedGeneratedCandidateId && !state.generatedCandidates.some(candidate => candidate.id === state.selectedGeneratedCandidateId)) {
    state.selectedGeneratedCandidateId = "";
  }
}

async function refreshGeneratedQuestionCandidates() {
  if (!requireAdminPermission("view generated question candidates")) return;
  state.generatedCandidateStatus = "Loading generated candidates from Supabase...";
  render();
  try {
    const client = await supabaseClient();
    await Promise.all([
      loadGeneratedQuestionBatches(client),
      loadGeneratedQuestionCandidates(client)
    ]);
  } catch (error) {
    state.generatedCandidateStatus = `Could not load generated candidates: ${error.message}`;
  }
  render();
}

let generatedCandidateKeywordTimer = null;

function setGeneratedCandidateFilter(name, value) {
  if (!(name in state.generatedCandidateFilters)) return;
  state.generatedCandidateFilters[name] = value;
  if (name !== "keyword") refreshGeneratedQuestionCandidates();
  else {
    clearTimeout(generatedCandidateKeywordTimer);
    generatedCandidateKeywordTimer = setTimeout(() => refreshGeneratedQuestionCandidates(), 450);
  }
  render();
}

async function updateGeneratedBatchStatusFromCandidates(client, batchId) {
  if (!batchId) return;
  const { data, error } = await client
    .from("generated_question_candidates")
    .select("review_status")
    .eq("batch_job_id", batchId);
  if (error) throw error;
  const total = data?.length || 0;
  if (!total) return;
  const published = data.filter(candidate => candidate.review_status === "Published").length;
  const reviewed = data.filter(candidate => candidate.review_status && candidate.review_status !== "Pending Review").length;
  const status = published === total
    ? "Published"
    : published > 0
      ? "Partially Published"
      : reviewed > 0
        ? "Under Review"
        : "Imported";
  const { error: updateError } = await client
    .from("generated_question_batches")
    .update({
      status,
      imported_count: total,
      metadata: {
        candidate_count: total,
        reviewed_count: reviewed,
        published_count: published
      }
    })
    .eq("id", batchId);
  if (updateError) throw updateError;
}

function generatedCandidateReviewClass(status) {
  if (status === "Approved" || status === "Published") return "good";
  if (status === "Rejected" || status === "Needs Edit") return "bad";
  return "gold";
}

function hydrateGeneratedCandidateEditForm(candidate) {
  const options = normalizeOptions(candidate.options || []);
  state.generatedCandidateEditForm = {
    category: candidate.category || categories[0],
    performanceIndicator: candidate.performance_indicator || "",
    questionType: candidate.question_type || "Scenario",
    questionText: candidate.question_text || "",
    options: options.map(option => option.text).concat(["", "", "", ""]).slice(0, 4),
    correctOptionId: normalizeCorrectOptionId(candidate.correct_option_id || "A"),
    explanation: candidate.explanation || "",
    difficulty: normalizeDifficulty(candidate.difficulty || "Medium"),
    tags: Array.isArray(candidate.tags) ? candidate.tags.join(", ") : ""
  };
}

function selectGeneratedCandidateForEdit(id) {
  if (!requireAdminPermission("review generated question candidates")) return;
  const candidate = state.generatedCandidates.find(item => item.id === id);
  if (!candidate) {
    state.generatedCandidateEditStatus = "Generated candidate was not found.";
    render();
    return;
  }
  state.selectedGeneratedCandidateId = id;
  hydrateGeneratedCandidateEditForm(candidate);
  state.generatedCandidateEditStatus = `Editing generated candidate ${id}.`;
  render();
  setTimeout(() => document.getElementById("generated-candidate-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

function generatedCandidateQuestionPayload(candidate) {
  const tags = Array.isArray(candidate.tags) ? candidate.tags : parseTags(candidate.tags);
  const partitions = Array.isArray(candidate.partition_keys) ? candidate.partition_keys : [];
  return {
    partition_key: candidate.category || partitions[0] || "",
    performance_indicator: candidate.performance_indicator || "",
    question_type: candidate.question_type || "",
    question_text: candidate.question_text || "",
    options: normalizeOptions(candidate.options || []),
    correct_option_id: normalizeCorrectOptionId(candidate.correct_option_id || "A"),
    explanation: candidate.explanation || "",
    difficulty: normalizeDifficulty(candidate.difficulty || ""),
    tags,
    question_hash: candidate.question_hash || ""
  };
}

function normalizedQuestionText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function generatedCandidateValidationErrors(candidate, candidateId = "") {
  const question = generatedCandidateQuestionPayload(candidate);
  const errors = validateQuestionPayload(question);
  if (!question.performance_indicator) errors.push("performance_indicator is required for generated questions.");
  if (!question.question_type) errors.push("question_type is required.");
  if (!question.explanation) errors.push("explanation is required.");
  const textBlock = [
    question.question_text,
    question.explanation,
    ...question.options.map(option => option.text)
  ].join(" ").toLowerCase();
  const bannedHits = state.bannedWords.filter(term => {
    const normalized = String(term || "").trim().toLowerCase();
    return normalized && textBlock.includes(normalized);
  });
  if (bannedHits.length) errors.push(`banned term detected: ${bannedHits.slice(0, 3).join(", ")}.`);
  const duplicate = activeQuestions().find(questionRow => {
    if (candidateId && questionRow.id === candidateId) return false;
    const sameHash = candidate.question_hash && questionRow.questionHash && candidate.question_hash === questionRow.questionHash;
    const sameText = normalizedQuestionText(questionRow.text) === normalizedQuestionText(question.question_text);
    return sameHash || sameText;
  });
  if (duplicate) errors.push("possible duplicate of an active question.");
  return [...new Set(errors)];
}

function generatedCandidatePayloadFromForm() {
  const form = state.generatedCandidateEditForm;
  const payload = {
    category: form.category.trim(),
    performance_indicator: form.performanceIndicator.trim(),
    question_type: form.questionType.trim() || "Scenario",
    question_text: form.questionText.trim(),
    options: normalizeOptions(form.options),
    correct_option_id: normalizeCorrectOptionId(form.correctOptionId),
    explanation: form.explanation.trim(),
    difficulty: normalizeDifficulty(form.difficulty),
    tags: filterUploadTopicTags(form.tags),
    updated_at: new Date().toISOString()
  };
  const errors = generatedCandidateValidationErrors({
    ...payload,
    partition_keys: [payload.category],
    question_hash: state.generatedCandidates.find(item => item.id === state.selectedGeneratedCandidateId)?.question_hash || ""
  }, state.selectedGeneratedCandidateId);
  payload.validation_status = errors.length ? "Needs Review" : "Valid";
  payload.validation_errors = errors;
  if (errors.length && !["Rejected", "Published"].includes(state.generatedCandidates.find(item => item.id === state.selectedGeneratedCandidateId)?.review_status)) {
    payload.review_status = "Needs Edit";
  }
  return { payload, errors };
}

async function saveGeneratedCandidateEdits() {
  if (!requireAdminPermission("edit generated question candidates")) return;
  if (!state.selectedGeneratedCandidateId) {
    state.generatedCandidateEditStatus = "Select a generated candidate first.";
    render();
    return;
  }
  const { payload, errors } = generatedCandidatePayloadFromForm();
  state.generatedCandidateEditStatus = errors.length
    ? `Saving candidate with review warnings: ${errors.join(" ")}`
    : "Saving generated candidate edits...";
  render();
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("generated_question_candidates")
      .update(payload)
      .eq("id", state.selectedGeneratedCandidateId);
    if (error) throw error;
    await writeAdminAudit("Generated candidate edited", "generated_question_candidate", state.selectedGeneratedCandidateId, errors.length ? "Saved with validation warnings" : "Validated", { validation_errors: errors });
    state.generatedCandidateEditStatus = errors.length
      ? "Saved candidate edits. Resolve validation warnings before publishing."
      : "Saved candidate edits.";
    await loadGeneratedQuestionCandidates(client);
    const updated = state.generatedCandidates.find(item => item.id === state.selectedGeneratedCandidateId);
    if (updated) hydrateGeneratedCandidateEditForm(updated);
  } catch (error) {
    state.generatedCandidateEditStatus = `Could not save candidate: ${supabaseErrorMessage(error)}`;
  }
  render();
}

async function updateGeneratedCandidateReviewStatus(id, reviewStatus) {
  if (!requireAdminPermission("review generated question candidates")) return;
  const candidate = state.generatedCandidates.find(item => item.id === id);
  if (!candidate) return;
  if (candidate.review_status === "Published") {
    state.generatedCandidateStatus = "Published candidates cannot be changed from this queue.";
    render();
    return;
  }
  const validationErrors = generatedCandidateValidationErrors(candidate, id);
  if (reviewStatus === "Approved" && validationErrors.length) {
    state.generatedCandidateStatus = `Cannot approve yet: ${validationErrors.join(" ")}`;
    try {
      const client = await supabaseClient();
      const { error } = await client
        .from("generated_question_candidates")
        .update({
          validation_status: "Needs Review",
          validation_errors: validationErrors,
          review_status: "Needs Edit",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;
      await loadGeneratedQuestionCandidates(client);
    } catch (error) {
      state.generatedCandidateStatus = `${state.generatedCandidateStatus} Could not save validation warnings: ${supabaseErrorMessage(error)}`;
    }
    render();
    return;
  }
  state.generatedCandidateStatus = `Marking candidate ${reviewStatus}...`;
  render();
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("generated_question_candidates")
      .update({
        review_status: reviewStatus,
        validation_status: validationErrors.length ? "Needs Review" : "Valid",
        validation_errors: validationErrors,
        reviewed_by: state.user?.id || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    if (error) throw error;
    await updateGeneratedBatchStatusFromCandidates(client, candidate.batch_job_id);
    await writeAdminAudit("Generated candidate review status changed", "generated_question_candidate", id, reviewStatus, {});
    state.generatedCandidateStatus = reviewStatus === "Approved"
      ? "Candidate approved by one admin/owner and is eligible for publishing."
      : `Candidate marked ${reviewStatus}.`;
    await Promise.all([
      loadGeneratedQuestionBatches(client),
      loadGeneratedQuestionCandidates(client)
    ]);
  } catch (error) {
    state.generatedCandidateStatus = `Could not update candidate: ${supabaseErrorMessage(error)}`;
  }
  render();
}

async function publishGeneratedQuestionCandidate(id) {
  if (!requireAdminPermission("publish generated questions")) return;
  const candidate = state.generatedCandidates.find(item => item.id === id);
  if (!candidate) return;
  if (candidate.review_status !== "Approved") {
    state.generatedCandidateStatus = "Approve the candidate before publishing it.";
    render();
    return;
  }
  if (candidate.validation_status !== "Valid") {
    state.generatedCandidateStatus = "Only valid candidates can be published. Edit the candidate until validation passes.";
    render();
    return;
  }
  if (!candidate.reviewed_at) {
    state.generatedCandidateStatus = "Publish requires one recorded admin/owner approval first.";
    render();
    return;
  }
  state.generatedCandidateStatus = "Publishing generated question...";
  render();
  try {
    const client = await supabaseClient();
    const { data, error } = await client.rpc("publish_generated_question", {
      p_candidate_id: id
    });
    if (error) throw error;
    await writeAdminAudit("Generated candidate published", "generated_question_candidate", id, "Published to questions", { published_question_id: data });
    state.generatedCandidateStatus = "Published generated question to the live question bank.";
    await Promise.all([
      loadGeneratedQuestionBatches(client),
      loadGeneratedQuestionCandidates(client)
    ]);
    await loadSupabaseBank({ background: true });
  } catch (error) {
    state.generatedCandidateStatus = `Could not publish candidate: ${supabaseErrorMessage(error)}. Make sure publish_generated_question is installed in Supabase.`;
  }
  render();
}

async function handleGeneratedCandidateAction(id, action) {
  const candidate = state.generatedCandidates.find(item => item.id === id);
  if (!candidate) {
    state.generatedCandidateStatus = "Generated candidate was not found. Reload proposed questions and try again.";
    render();
    return;
  }
  state.selectedGeneratedCandidateId = id;
  hydrateGeneratedCandidateEditForm(candidate);
  if (action === "edit") {
    state.generatedCandidateEditStatus = `Editing generated candidate ${id}.`;
    render();
    setTimeout(() => document.getElementById("generated-candidate-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    return;
  }
  if (action === "approve") {
    await updateGeneratedCandidateReviewStatus(id, "Approved");
    return;
  }
  if (action === "needs-edit") {
    state.generatedCandidateEditStatus = "Candidate marked Needs Edit. Use the editor below to make corrections.";
    await updateGeneratedCandidateReviewStatus(id, "Needs Edit");
    setTimeout(() => document.getElementById("generated-candidate-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    return;
  }
  if (action === "reject") {
    await updateGeneratedCandidateReviewStatus(id, "Rejected");
    return;
  }
  if (action === "publish") {
    await publishGeneratedQuestionCandidate(id);
    return;
  }
  state.generatedCandidateStatus = `Unknown candidate action: ${action}.`;
  render();
}

async function refreshAdminControlData() {
  if (!requireAdminPermission("load administrator data")) return;
  state.adminControlsLoading = true;
  state.adminControlStatus = "Loading administrator data from Supabase...";
  render();
  try {
    const client = await supabaseClient();
    const loaders = [
      ["profiles", loadAdminProfiles],
      ["owner count", loadOwnerCount],
      ["name reviews", loadNameReviews],
      ["banned terms", loadBannedTerms],
      ["broadcasts", loadBroadcasts],
      ["governance", loadGovernanceVotes],
      ["audit logs", loadAdminAuditLogs],
      ["blueprint versions", loadBlueprintVersions],
      ["duplicate reviews", loadDuplicateReviews],
      ["generated batches", loadGeneratedQuestionBatches],
      ["generated candidates", loadGeneratedQuestionCandidates]
    ];
    const results = await Promise.all(loaders.map(async ([label, loader]) => {
      try {
        await loader(client);
        return null;
      } catch (error) {
        return `${label}: ${error.message}`;
      }
    }));
    const failures = results.filter(Boolean);
    state.adminControlStatus = failures.length
      ? `Some admin data could not load. Run admin-controls.sql. ${failures.join("; ")}`
      : "Administrator data loaded from Supabase.";
  } catch (error) {
    state.adminControlStatus = `Could not load administrator data: ${error.message}`;
  }
  state.adminControlsLoading = false;
  render();
}

async function setUserSuspension(userId, days) {
  if (!requireAdminPermission("moderate user accounts")) return;
  const profile = state.adminProfiles.find(item => item.user_id === userId);
  if (!profile) return;
  const restoring = days === 0;
  const reason = restoring ? "Restored through admin portal" : `${days}-day suspension through admin portal`;
  try {
    const client = await supabaseClient();
    const suspendUntil = restoring ? null : new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await client.rpc("admin_set_user_suspension", {
      target_user_id_value: userId,
      suspend_until: suspendUntil,
      reason_value: reason
    });
    if (error) throw error;
    state.adminControlStatus = restoring
      ? `Restored ${profile.display_name || userId}.`
      : `Suspended ${profile.display_name || userId} for ${days} days.`;
    await loadAdminProfiles(client);
    await loadAdminAuditLogs(client);
  } catch (error) {
    state.adminControlStatus = `Moderation action failed: ${error.message}`;
  }
  render();
}

async function reviewFlaggedName(id, decision) {
  if (!requireAdminPermission("review display names")) return;
  const review = state.nameReviews.find(item => item.id === id);
  if (!review) return;
  let replacement = null;
  if (decision === "Modified") {
    replacement = String(review.replacement_name || review.submitted_name || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
    if (!replacement) {
      state.adminControlStatus = "Enter a replacement name before choosing Modify.";
      render();
      return;
    }
  }
  try {
    const client = await supabaseClient();
    const { error } = await client.rpc("admin_review_name", {
      review_id_value: id,
      decision_value: decision,
      replacement_value: replacement
    });
    if (error) throw error;
    state.adminControlStatus = `Name review marked ${decision}.`;
    await loadNameReviews(client);
    await loadAdminProfiles(client);
    await loadAdminAuditLogs(client);
  } catch (error) {
    state.adminControlStatus = `Name review failed: ${error.message}`;
  }
  render();
}

function setNameReviewReplacement(id, value) {
  const review = state.nameReviews.find(item => item.id === id);
  if (review) review.replacement_name = value;
}

async function queueAdminBroadcast() {
  if (!requireAdminPermission("send notification broadcasts")) return;
  const title = state.broadcastTitle.trim();
  const message = state.broadcastMessage.trim();
  if (!title || !message) {
    state.broadcastStatus = "Add both a title and message.";
    render();
    return;
  }
  state.broadcastStatus = "Queueing broadcast...";
  render();
  try {
    const client = await supabaseClient();
    const { data, error } = await client.rpc("admin_queue_broadcast", {
      audience_value: state.broadcastAudience,
      title_value: title,
      message_value: message
    });
    if (error) throw error;
    state.broadcastStatus = `Broadcast ${data} queued and distributed to in-app notifications.`;
    await loadBroadcasts(client);
    await loadAdminAuditLogs(client);
  } catch (error) {
    state.broadcastStatus = `Broadcast failed: ${error.message}`;
  }
  render();
}

function updateReportStatus(id, status) {
  if (!requireAdminPermission("review reported questions")) return;
  const actionLabels = {
    Valid: "Moved to correction queue",
    Invalid: "Dismissed as invalid",
    Spam: "Marked as spam",
    Fixed: "Marked fixed",
    "Work In Progress": "Marked work in progress"
  };
  state.reportQueue = state.reportQueue.map(report => {
    if (report.id !== id) return report;
    const isSelectedAction = report.status === status;
    if (isSelectedAction) {
      return {
        ...report,
        status: "Open",
        action: "",
        priority: report.previousPriority || (report.priority === "Resolved" ? "1 report" : report.priority),
        updatedAt: new Date().toLocaleString()
      };
    }
    return {
      ...report,
      status,
      action: actionLabels[status] || status,
      previousPriority: report.priority === "Resolved" ? report.previousPriority : report.priority,
      priority: ["Fixed", "Invalid", "Spam"].includes(status) ? "Resolved" : report.priority,
      updatedAt: new Date().toLocaleString()
    };
  });
  const updated = state.reportQueue.find(report => report.id === id);
  state.reportActionStatus = updated
    ? updated.status === "Open"
      ? `Cleared report action: ${updated.question}`
      : `${updated.action}: ${updated.question}`
    : "Report action completed.";
  persistReportQueue();
  render();
  if (updated && hasSupabaseConfig() && isUuid(updated.id)) {
    updateSupabaseQuestionReport(updated)
      .then(async () => {
        await writeAdminAudit("Question report status updated", "question_report", updated.id, updated.action || updated.status, { status: updated.status });
        state.reportActionStatus = `${state.reportActionStatus} Saved to Supabase.`;
        render();
      })
      .catch(error => {
        state.reportActionStatus = `Local status updated. Supabase update failed: ${error.message}`;
        render();
      });
  }
}

function editSelectedBlueprint() {
  const blueprint = selectedBlueprint();
  if (!blueprint) return;
  state.blueprintForm = {
    level: blueprint.level,
    category: blueprint.category,
    version: blueprint.version,
    reason: state.blueprintForm.reason || "Blueprint distribution update",
    distribution: Object.entries(blueprint.distribution).map(([topic, count]) => `${topic}: ${count}`).join("\n")
  };
  state.blueprintStatus = `Loaded ${blueprint.name} into the create form.`;
  render();
}

function blueprintQuestionSet(bank, blueprint) {
  const activeBank = bank.filter(question => question.lifecycleState !== "Retired");
  if (!blueprint) {
    return activeBank
      .filter(question => !state.selected.difficulties.length || state.selected.difficulties.includes(question.difficulty))
      .filter(question => !state.selected.topics.length || state.selected.topics.every(topic => questionMatchesTopic(question, topic)));
  }
  const selectedQuestions = [];
  const used = new Set();
  Object.entries(blueprint.distribution).forEach(([topic, count]) => {
    const matching = activeBank.filter(question => questionMatchesTopic(question, topic) && !used.has(question.text));
    matching.slice(0, count).forEach(question => {
      used.add(question.text);
      selectedQuestions.push(question);
    });
  });
  return selectedQuestions.length ? selectedQuestions : activeBank.slice(0, state.selected.count);
}

function prototypeQuestionFillPool(bank, excludeEasy = false) {
  const activeBank = bank.filter(question => question.lifecycleState !== "Retired");
  const eligibleBank = activeBank.filter(question => !excludeEasy || question.difficulty !== "Easy");
  const difficultyMatches = eligibleBank.filter(question => !state.selected.difficulties.length || state.selected.difficulties.includes(question.difficulty));
  return difficultyMatches.length ? difficultyMatches : eligibleBank.length ? eligibleBank : activeBank;
}

function fillQuestionSetForPrototype(primaryQuestions, bank, requestedCount, seedText, excludeEasy = false) {
  const targetCount = Math.max(1, Number(requestedCount) || 50);
  const filled = [...primaryQuestions];
  if (filled.length >= targetCount) return filled.slice(0, targetCount);
  const fallbackPool = prototypeQuestionFillPool(bank, excludeEasy);
  if (!fallbackPool.length) return filled;
  const used = new Set(filled.map(questionKey));
  const uniqueFallback = seededShuffle(fallbackPool, `${seedText}:prototype-fill`)
    .filter(question => !used.has(questionKey(question)));
  uniqueFallback.forEach(question => {
    if (filled.length < targetCount) filled.push(question);
  });
  let repeatRound = 0;
  while (filled.length < targetCount && repeatRound < targetCount) {
    const repeatPool = seededShuffle(fallbackPool, `${seedText}:prototype-repeat:${repeatRound}`);
    repeatPool.forEach(question => {
      if (filled.length < targetCount) filled.push({ ...question });
    });
    repeatRound += 1;
  }
  return filled.slice(0, targetCount);
}

function testIdRecordFromSelection(mode = "Test") {
  const id = testId();
  const createdAt = new Date().toISOString();
  return {
    id,
    mode,
    category: state.selected.category,
    difficulties: [...state.selected.difficulties],
    topics: [...state.selected.topics],
    questionCount: Number(state.selected.count) || 50,
    poolTimestamp: currentPoolTimestamp(),
    createdAt
  };
}

function saveTestIdRecord(record) {
  state.testIds[record.id] = record;
  persistTestIds();
  state.testIdLookup.input = record.id;
  state.testIdLookup.selectedId = record.id;
  if (hasSupabaseConfig()) {
    saveSupabaseTestId(record)
      .then(() => {
        state.testIdLookup.status = `Saved Test ID ${record.id} to Supabase.`;
        if (state.route === "testid" || state.route === "results") render();
      })
      .catch(error => {
        state.testIdLookup.status = `Saved Test ID locally. Supabase save failed: ${error.message}`;
        if (state.route === "testid" || state.route === "results") render();
      });
  }
}

function questionUpdatedAt(question) {
  const raw = question.updatedAt || question.updated_at || question.modifiedAt || question.modified_at || question.createdAt || question.created_at;
  const time = Date.parse(raw || "");
  return Number.isFinite(time) ? time : 0;
}

function testIdAvailablePool(record) {
  if (!record) return [];
  return activeQuestions()
    .filter(question => question.lifecycleState !== "Retired")
    .filter(question => !record.category || record.category === "Mixed" || questionMatchesCategory(question, record.category))
    .filter(question => !record.difficulties?.length || record.difficulties.includes(question.difficulty))
    .filter(question => !record.topics?.length || record.topics.some(topic => questionMatchesTopic(question, topic)));
}

function testIdPool(record, count = record.questionCount) {
  const filtered = testIdAvailablePool(record);
  const shuffled = seededShuffle(filtered, `${record.id}:${record.poolTimestamp}`);
  return shuffled.slice(0, Math.max(1, Number(count) || record.questionCount || 50));
}

function testIdHasUpdates(record) {
  const poolTime = Date.parse(record.poolTimestamp || record.createdAt || "");
  if (!Number.isFinite(poolTime)) return false;
  return testIdPool(record).some(question => questionUpdatedAt(question) > poolTime);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsString(value) {
  return JSON.stringify(String(value ?? "")).replace(/</g, "\\u003c");
}

function normalizeTopicName(value) {
  return String(value || "")
    .replace(/Product\/\s+Service/gi, "Product/Service")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(tag => String(tag).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function filterUploadTopicTags(value) {
  const allowedTags = new Map(allTopicTags().map(tag => [normalizeTopicName(tag).toLowerCase(), normalizeTopicName(tag)]));
  const filtered = [];
  const used = new Set();
  parseTags(value).forEach(tag => {
    const normalizedKey = normalizeTopicName(tag).toLowerCase();
    const allowedTag = allowedTags.get(normalizedKey);
    if (!allowedTag || used.has(normalizedKey)) return;
    filtered.push(allowedTag);
    used.add(normalizedKey);
  });
  return filtered;
}

function normalizeOptions(options) {
  let source = options;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = splitOptionText(source);
    }
  }
  const optionList = Array.isArray(source)
    ? source
    : optionValuesFromObject(source);
  return optionList.map((option, index) => {
    const id = typeof option === "object" && option ? option.id : "ABCD"[index];
    const text = typeof option === "object" && option ? option.text : option;
    return { id: String(id || "ABCD"[index]).toUpperCase(), text: String(text || "").trim() };
  }).slice(0, 4);
}

function optionValuesFromObject(source) {
  if (!source || typeof source !== "object") return [];
  return [
    source.A, source.B, source.C, source.D,
    source.a, source.b, source.c, source.d,
    source.optionA, source.optionB, source.optionC, source.optionD,
    source.option_a, source.option_b, source.option_c, source.option_d,
    source.OptionA, source.OptionB, source.OptionC, source.OptionD
  ].filter(value => value !== undefined);
}

function normalizeCorrectOptionId(value) {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
  const optionMatch = compact.match(/^option([a-d])$/);
  if (optionMatch) return optionMatch[1].toUpperCase();
  const letterMatch = compact.match(/^([a-d])$/);
  if (letterMatch) return letterMatch[1].toUpperCase();
  return raw.toUpperCase();
}

function normalizeDifficulty(value) {
  const raw = String(value || "").trim();
  const compact = raw.toLowerCase();
  if (compact === "e" || compact === "easy") return "Easy";
  if (compact === "m" || compact === "medium") return "Medium";
  if (compact === "h" || compact === "hard") return "Hard";
  return raw;
}

function splitOptionText(value) {
  const text = String(value || "").trim();
  const labeledMatches = [...text.matchAll(/(?:^|\s)([A-D])[\.)]\s+([\s\S]*?)(?=\s+[A-D][\.)]\s+|$)/gi)];
  if (labeledMatches.length >= 4) {
    return labeledMatches
      .slice(0, 4)
      .map(match => ({ id: match[1].toUpperCase(), text: match[2].trim() }));
  }
  return text
    .split(/\s*\|\s*|\r?\n+/)
    .map(option => option.trim())
    .filter(Boolean);
}

function buildQuestionPayloadFromForm() {
  const form = state.uploadForm;
  return {
    partition_key: form.partitionKey.trim(),
    performance_indicator: form.performanceIndicator.trim(),
    question_type: form.questionType.trim(),
    question_text: form.questionText.trim(),
    options: normalizeOptions(form.options),
    correct_option_id: normalizeCorrectOptionId(form.correctOptionId),
    explanation: form.explanation.trim(),
    difficulty: normalizeDifficulty(form.difficulty),
    tags: filterUploadTopicTags(form.tags),
    status: "Unseen",
    seen_count: 0
  };
}

function normalizeQuestionPayload(raw) {
  const mapped = mapSupabaseQuestion(raw);
  return {
    partition_key: raw.partition_key || raw.partitionKey || raw.category || mapped.category,
    performance_indicator: raw.performance_indicator || raw.performanceIndicator || raw.topic || mapped.topic,
    question_type: raw.question_type || raw.questionType || "Multiple Choice",
    question_text: raw.question_text || raw.questionText || raw.text || raw.question || mapped.text,
    options: normalizeOptions(raw.options?.length ? raw.options : mapped.options),
    correct_option_id: normalizeCorrectOptionId(raw.correct_option_id || raw.correctOptionId || raw.answer || mapped.answer || ""),
    explanation: raw.explanation || mapped.explanation || "",
    difficulty: normalizeDifficulty(raw.difficulty || mapped.difficulty),
    tags: filterUploadTopicTags(raw.tags?.length ? raw.tags : [mapped.category, mapped.topic, mapped.difficulty]),
    status: "Unseen",
    seen_count: 0
  };
}

function validateQuestionPayload(question) {
  const errors = [];
  if (!question.partition_key) errors.push("partition_key is required.");
  if (!question.question_text) errors.push("question_text is required.");
  question.difficulty = normalizeDifficulty(question.difficulty);
  if (!["Easy", "Medium", "Hard"].includes(question.difficulty)) errors.push("difficulty must be Easy, Medium, Hard, e, m, or h.");
  if (!["A", "B", "C", "D"].includes(normalizeCorrectOptionId(question.correct_option_id))) errors.push("correct_option_id must be A, B, C, D, or optionA-optionD.");
  if (!Array.isArray(question.options) || question.options.length !== 4) errors.push("options must contain exactly four choices.");
  question.options.forEach((option, index) => {
    if (option.id !== "ABCD"[index]) errors.push(`option ${index + 1} id must be ${"ABCD"[index]}.`);
    if (!option.text) errors.push(`option ${option.id || index + 1} text is required.`);
  });
  if (!Array.isArray(question.tags)) errors.push("tags must be an array or comma-separated list.");
  if (Array.isArray(question.tags) && question.tags.length === 0) errors.push("at least one tag must match the website topic tags.");
  return errors;
}

async function supabaseHeaders() {
  const { anonKey } = state.supabaseConfig;
  const client = await supabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sign in with an authorized Supabase account before changing question data.");
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    Accept: "application/json"
  };
}

function hasSupabaseConfig() {
  return Boolean(state.supabaseConfig.url && state.supabaseConfig.anonKey);
}

function testIdToSupabaseRow(record) {
  return {
    id: record.id,
    mode: record.mode || "Test",
    category: record.category,
    difficulties: record.difficulties || [],
    topic_tags: record.topics || [],
    question_count: Number(record.questionCount) || 1,
    pool_timestamp: record.poolTimestamp,
    created_at: record.createdAt
  };
}

function testIdToLegacySupabaseRow(record) {
  const row = testIdToSupabaseRow(record);
  delete row.mode;
  return row;
}

function mapSupabaseTestId(row) {
  return {
    id: row.id,
    mode: row.mode || "Test",
    category: row.category,
    difficulties: row.difficulties || [],
    topics: row.topic_tags || [],
    questionCount: Number(row.question_count || 1),
    poolTimestamp: row.pool_timestamp,
    createdAt: row.created_at
  };
}

async function saveSupabaseTestId(record) {
  if (!hasSupabaseConfig()) throw new Error("Supabase is not connected.");
  const client = await supabaseClient();
  let { error } = await client
    .from("test_ids")
    .upsert(testIdToSupabaseRow(record), { onConflict: "id" });
  if (error && error.code === "42703" && String(error.message || "").includes("mode")) {
    ({ error } = await client
      .from("test_ids")
      .upsert(testIdToLegacySupabaseRow(record), { onConflict: "id" }));
  }
  if (error) throw error;
}

async function fetchSupabaseTestId(id) {
  if (!hasSupabaseConfig()) throw new Error("Supabase is not connected.");
  const client = await supabaseClient();
  let { data, error } = await client
    .from("test_ids")
    .select("id,mode,category,difficulties,topic_tags,question_count,pool_timestamp,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code === "42703" && String(error.message || "").includes("mode")) {
    ({ data, error } = await client
      .from("test_ids")
      .select("id,category,difficulties,topic_tags,question_count,pool_timestamp,created_at")
      .eq("id", id)
      .maybeSingle());
  }
  if (error) throw error;
  return data ? mapSupabaseTestId(data) : null;
}

function reportToSupabaseRow(report) {
  const snapshot = report.questionSnapshot || {};
  return {
    id: isUuid(report.id) ? report.id : undefined,
    question_id: isUuid(report.questionId || snapshot.id) ? report.questionId || snapshot.id : null,
    test_id: report.testId || null,
    reason: report.reason || "Other",
    status: report.status || "Open",
    reporter_id: state.user?.id || null,
    report_snapshot: {
      question: report.question,
      userComments: report.userComments || "",
      topic: report.topic,
      difficulty: report.difficulty,
      questionSnapshot: snapshot
    },
    admin_note: report.action || null,
    updated_at: new Date().toISOString()
  };
}

function mapSupabaseReport(row) {
  const snapshot = row.report_snapshot || {};
  const questionSnapshotValue = snapshot.questionSnapshot || {};
  return {
    id: row.id,
    priority: "1 report",
    reason: row.reason || "Other",
    userComments: snapshot.userComments || "",
    question: snapshot.question || questionSnapshotValue.questionText || "Reported question",
    questionId: row.question_id || questionSnapshotValue.id || "",
    questionSnapshot: questionSnapshotValue,
    status: row.status || "Open",
    testId: row.test_id || "",
    topic: snapshot.topic || questionSnapshotValue.performanceIndicator || "",
    difficulty: snapshot.difficulty || questionSnapshotValue.difficulty || "",
    action: row.admin_note || "",
    reportedAt: formatDateTime(row.created_at),
    updatedAt: row.updated_at ? formatDateTime(row.updated_at) : ""
  };
}

async function insertSupabaseQuestionReport(report) {
  if (!hasSupabaseConfig()) throw new Error("Supabase is not connected.");
  const client = await supabaseClient();
  const row = reportToSupabaseRow(report);
  delete row.id;
  const { data, error } = await client
    .from("question_reports")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return mapSupabaseReport(data);
}

async function loadSupabaseQuestionReports() {
  if (!hasSupabaseConfig() || !isAdminRole()) return;
  const client = await supabaseClient();
  const { data, error } = await client
    .from("question_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.reportQueue = (data || []).map(mapSupabaseReport);
  persistReportQueue();
  state.reportActionStatus = `Loaded ${state.reportQueue.length} report${state.reportQueue.length === 1 ? "" : "s"} from Supabase.`;
}

async function updateSupabaseQuestionReport(report) {
  if (!hasSupabaseConfig() || !isUuid(report.id)) return;
  const client = await supabaseClient();
  const row = reportToSupabaseRow(report);
  delete row.id;
  const { error } = await client
    .from("question_reports")
    .update(row)
    .eq("id", report.id);
  if (error) throw error;
}

async function refreshReportQueueFromSupabase() {
  if (!requireAdminPermission("load reported questions")) return;
  if (!hasSupabaseConfig()) {
    state.reportActionStatus = "Connect Supabase to load the shared report queue.";
    render();
    return;
  }
  state.reportActionStatus = "Loading reports from Supabase...";
  render();
  try {
    await loadSupabaseQuestionReports();
  } catch (error) {
    state.reportActionStatus = `Could not load Supabase reports: ${error.message}`;
  }
  render();
}

async function insertSupabaseQuestions(questions) {
  const { url, anonKey, table } = state.supabaseConfig;
  if (!url || !anonKey || !table) throw new Error("Add a Project URL, anon key, and table name first.");

  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(table)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: await supabaseHeaders(),
    body: JSON.stringify(questions)
  });
  const responseText = await response.text();
  if (!response.ok) {
    let detail = responseText;
    try {
      const parsed = JSON.parse(responseText);
      detail = parsed.message || parsed.details || responseText;
    } catch {}
    throw new Error(`Supabase insert returned ${response.status}: ${detail}`);
  }
  return responseText ? JSON.parse(responseText) : [];
}

async function saveAdminQuestion() {
  if (!requireAdminPermission("upload questions")) return;
  const payload = buildQuestionPayloadFromForm();
  const errors = validateQuestionPayload(payload);
  if (errors.length) {
    state.uploadStatus = `Validation failed: ${errors.join(" ")}`;
    render();
    return;
  }

  state.uploadStatus = "Saving question to Supabase...";
  render();
  try {
    const inserted = await insertSupabaseQuestions([payload]);
    state.uploadStatus = `Saved ${inserted.length || 1} question to Supabase.`;
    await writeAdminAudit("Question uploaded", "question", inserted[0]?.id || null, null, { partition_key: payload.partition_key });
    await loadSupabaseBank();
  } catch (error) {
    state.uploadStatus = error.message;
    render();
  }
}

async function bulkUploadSupabaseQuestions() {
  if (!requireAdminPermission("bulk upload questions")) return;
  let parsed;
  try {
    parsed = JSON.parse(state.bulkUploadText);
  } catch (error) {
    state.uploadStatus = `Bulk JSON is invalid: ${error.message}`;
    render();
    return;
  }

  const rawQuestions = Array.isArray(parsed) ? parsed : [parsed];
  const questions = rawQuestions.map(normalizeQuestionPayload);
  const errors = questions.flatMap((question, index) =>
    validateQuestionPayload(question).map(error => `Row ${index + 1}: ${error}`)
  );
  if (errors.length) {
    state.uploadStatus = `Bulk validation failed: ${errors.join(" ")}`;
    render();
    return;
  }

  state.uploadStatus = `Uploading ${questions.length} question${questions.length === 1 ? "" : "s"} to Supabase...`;
  render();
  try {
    const inserted = await insertSupabaseQuestions(questions);
    state.uploadStatus = `Uploaded ${inserted.length || questions.length} question${questions.length === 1 ? "" : "s"} to Supabase.`;
    await writeAdminAudit("Bulk question upload", "question_batch", null, null, { question_count: questions.length });
    await loadSupabaseBank();
  } catch (error) {
    state.uploadStatus = error.message;
    render();
  }
}

function mapSupabaseQuestion(row) {
  const normalizedOptions = normalizeOptions(
    row.options ?? optionValuesFromObject(row)
  );
  const optionText = normalizedOptions.map(option => option.text);
  const tags = parseTags(row.tags);
  return {
    id: row.id || row.partition_key || row.partitionKey || crypto.randomUUID?.() || testId(),
    text: row.question_text || row.questionText || row.text || row.question || "",
    topic: row.topic || row.topic_tag || tags.find(tag => !categories.includes(tag) && !difficulties.includes(normalizeDifficulty(tag))) || tags[0] || "General",
    category: row.partition_key || row.partitionKey || row.category || row.category_tag || tags.find(tag => categories.includes(tag)) || "Marketing",
    difficulty: normalizeDifficulty(row.difficulty || tags.find(tag => difficulties.includes(normalizeDifficulty(tag))) || "Medium"),
    options: optionText.slice(0, 4),
    answer: normalizeCorrectOptionId(row.correct_option_id || row.correctOptionId || row.answer || row.correctAnswer || "A"),
    explanation: row.explanation || "",
    tags,
    status: row.status || row.seen_status || "Unseen",
    lifecycleState: row.lifecycle_state || row.lifecycleState || "Active",
    seenCount: Number(row.seen_count ?? row.seenCount ?? 0),
    questionHash: row.question_hash || row.questionHash || "",
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || row.modified_at || row.modifiedAt || row.created_at || row.createdAt || ""
  };
}

function validateSupabaseRow(row, index) {
  const mapped = mapSupabaseQuestion(row);
  const reasons = [];
  if (!mapped.text) reasons.push("missing question_text");
  if (mapped.options.length !== 4) reasons.push(`expected 4 options, found ${mapped.options.length}`);
  if (mapped.options.some(option => !option)) reasons.push("one or more options are blank");
  if (!["A", "B", "C", "D"].includes(normalizeCorrectOptionId(mapped.answer))) reasons.push("correct_option_id must be A, B, C, D, or optionA-optionD");
  if (!["Easy", "Medium", "Hard"].includes(mapped.difficulty)) reasons.push("difficulty must be Easy, Medium, Hard, e, m, or h");
  if (!mapped.category) reasons.push("missing partition_key");
  return {
    valid: reasons.length === 0,
    question: { ...mapped, answer: normalizeCorrectOptionId(mapped.answer) },
    issue: {
      row: index + 1,
      id: row.id || row.question_hash || row.partition_key || "unknown",
      question: mapped.text || "(blank question_text)",
      reasons: reasons.join("; ")
    }
  };
}

let sharedSupabaseClient = null;
let sharedSupabaseClientKey = "";
let authStateSubscription = null;

function supabaseClientKey() {
  const { url, anonKey } = state.supabaseConfig;
  return `${url || ""}|${anonKey || ""}`;
}

function resetSupabaseClientIfConfigChanged() {
  const nextKey = supabaseClientKey();
  if (sharedSupabaseClient && sharedSupabaseClientKey && sharedSupabaseClientKey !== nextKey) {
    authStateSubscription?.unsubscribe?.();
    authStateSubscription = null;
    sharedSupabaseClient = null;
    sharedSupabaseClientKey = "";
  }
}

function saveSupabaseConfig() {
  resetSupabaseClientIfConfigChanged();
  localStorage.setItem("lift-supabase", JSON.stringify(state.supabaseConfig));
  state.questionBankAutoLoadKey = "";
  if (state.user) scheduleQuestionBankAutoLoad(state.user);
}

function isFileMode() {
  return window.location.protocol === "file:";
}

function openLocalServer() {
  const config = state.supabaseConfig?.url && state.supabaseConfig?.anonKey
    ? `#supabase-config=${encodeURIComponent(btoa(JSON.stringify(state.supabaseConfig)))}`
    : "";
  window.location.href = `http://127.0.0.1:4173/${config}`;
}

function appRedirectUrl(hash = "") {
  const base = window.location.origin && window.location.origin !== "null"
    ? `${window.location.origin}${window.location.pathname}`
    : window.location.href.split("#")[0];
  return `${base}${hash}`;
}

function supabaseOAuthCallbackUrl() {
  const url = state.supabaseConfig.url || "";
  return url ? `${url.replace(/\/$/, "")}/auth/v1/callback` : "https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback";
}

function setGoogleLinkPending(value) {
  if (value) localStorage.setItem("lift-google-link-pending", "1");
  else localStorage.removeItem("lift-google-link-pending");
}

function googleLinkPending() {
  return localStorage.getItem("lift-google-link-pending") === "1";
}

function applySupabaseConfigFromUrl() {
  const match = window.location.hash.match(/supabase-config=([^&]+)/);
  if (!match) return false;
  try {
    const config = JSON.parse(atob(decodeURIComponent(match[1])));
    state.supabaseConfig = {
      ...state.supabaseConfig,
      url: config.url || state.supabaseConfig.url,
      anonKey: config.anonKey || state.supabaseConfig.anonKey,
      table: config.table || state.supabaseConfig.table || "questions"
    };
    saveSupabaseConfig();
    state.authStatus = "Supabase settings imported into the local server version.";
    window.history.replaceState({}, document.title, window.location.href.split("#")[0]);
    return true;
  } catch {
    state.authStatus = "Could not import Supabase settings from the URL.";
    return false;
  }
}

let supabaseLibraryPromise = null;

function loadSupabaseLibrary() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  if (supabaseLibraryPromise) return supabaseLibraryPromise;
  supabaseLibraryPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      supabaseLibraryPromise = null;
      reject(new Error("Supabase Auth library took too long to load. Check the internet connection and try again."));
    }, 8000);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => {
      clearTimeout(timeoutId);
      window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error("Supabase Auth library loaded, but createClient was unavailable."));
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      supabaseLibraryPromise = null;
      reject(new Error("Could not load the Supabase Auth library."));
    };
    document.head.appendChild(script);
  });
  return supabaseLibraryPromise;
}

async function supabaseClient() {
  if (isFileMode()) throw new Error("Open the local server version to use login: http://127.0.0.1:4173/");
  const supabaseLibrary = await loadSupabaseLibrary();
  const { url, anonKey } = state.supabaseConfig;
  if (!url || !anonKey) throw new Error("Add your Supabase Project URL and anon key in Question Bank settings first.");
  const nextKey = supabaseClientKey();
  if (sharedSupabaseClient && sharedSupabaseClientKey === nextKey) return sharedSupabaseClient;
  authStateSubscription?.unsubscribe?.();
  authStateSubscription = null;
  sharedSupabaseClient = supabaseLibrary.createClient(url, anonKey);
  sharedSupabaseClientKey = nextKey;
  return sharedSupabaseClient;
}

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function supabaseErrorMessage(error) {
  return [
    error.message,
    error.code ? `code ${error.code}` : "",
    error.details || "",
    error.hint ? `Hint: ${error.hint}` : ""
  ].filter(Boolean).join(" ");
}

function friendlyAuthError(error) {
  const message = supabaseErrorMessage(error);
  if (/manual linking is disabled/i.test(message)) {
    return "Google account linking reached Supabase, but Manual Linking is disabled in Supabase Auth settings. Enable manual identity linking in Supabase, then try Connect Google again.";
  }
  if (/missing sub claim/i.test(message)) {
    return "Google returned a token without the OpenID subject claim. Confirm the Google provider scopes include openid email profile, then try again.";
  }
  return message || "Authentication failed.";
}

function roleFromUser(user) {
  const metadataRole = user?.app_metadata?.role;
  if (["admin", "owner"].includes(metadataRole)) return metadataRole;
  return "student";
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function secureToken(length = 32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => alphabet[byte % alphabet.length]).join("");
}

async function ensureSupabaseProfile(user) {
  if (!user || !hasSupabaseConfig()) return null;
  const client = await supabaseClient();
  let { data: existing, error: selectError } = await client
    .from("profiles")
    .select("role,account_tier,display_name,phone,suspended_until,owner_privileges_suspended,owner_privileges_suspended_at,owner_privileges_restored_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (selectError?.code === "42703" && /account_tier/i.test(selectError.message || "")) {
    const fallback = await client
      .from("profiles")
      .select("role,account_type,display_name,phone,suspended_until")
      .eq("user_id", user.id)
      .maybeSingle();
    existing = fallback.data ? { ...fallback.data, account_tier: fallback.data.account_type, owner_privileges_suspended: false } : fallback.data;
    selectError = fallback.error;
  } else if (selectError?.code === "42703" && /owner_privileges/i.test(selectError.message || "")) {
    const fallback = await client
      .from("profiles")
      .select("role,account_tier,display_name,phone,suspended_until")
      .eq("user_id", user.id)
      .maybeSingle();
    existing = fallback.data ? { ...fallback.data, owner_privileges_suspended: false } : fallback.data;
    selectError = fallback.error;
  }
  if (selectError) throw selectError;
  if (existing) return existing;
  let { data, error } = await client
    .from("profiles")
    .insert({
      user_id: user.id,
      display_name: displayNameFromUser(user),
      phone: state.accountSettings.phone || "",
      role: "student",
      account_tier: state.account,
      updated_at: new Date().toISOString()
    })
    .select("role,account_tier,display_name,phone,suspended_until,owner_privileges_suspended,owner_privileges_suspended_at,owner_privileges_restored_at")
    .single();
  if (error?.code === "42703" && /account_tier/i.test(error.message || "")) {
    const fallback = await client
      .from("profiles")
      .insert({
        user_id: user.id,
        display_name: displayNameFromUser(user),
        phone: state.accountSettings.phone || "",
        role: "student",
        account_type: state.account,
        updated_at: new Date().toISOString()
      })
      .select("role,account_type,display_name,phone,suspended_until")
      .single();
    data = fallback.data ? { ...fallback.data, account_tier: fallback.data.account_type, owner_privileges_suspended: false } : fallback.data;
    error = fallback.error;
  } else if (error?.code === "42703" && /owner_privileges/i.test(error.message || "")) {
    const fallback = await client
      .from("profiles")
      .insert({
        user_id: user.id,
        display_name: displayNameFromUser(user),
        phone: state.accountSettings.phone || "",
        role: "student",
        account_tier: state.account,
        updated_at: new Date().toISOString()
      })
      .select("role,account_tier,display_name,phone,suspended_until")
      .single();
    data = fallback.data ? { ...fallback.data, owner_privileges_suspended: false } : fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return data;
}

async function applyUserRole(user) {
  if (!user) {
    setRole("student", false, "signed out");
    return;
  }
  let profile = null;
  try {
    profile = await ensureSupabaseProfile(user);
  } catch (error) {
    const metadataRole = roleFromUser(user);
    const metadataIsStaff = ["admin", "owner"].includes(metadataRole);
    setRole(metadataRole, metadataIsStaff, metadataIsStaff ? "Supabase app metadata" : "profile unavailable");
    state.roleStatus = metadataIsStaff
      ? `${roleLabel(metadataRole)} permissions loaded from trusted Supabase app metadata. Profile lookup failed: ${error.message}`
      : `Standard permissions active. Supabase profile verification failed: ${error.message}`;
    return;
  }
  const profileRole = ["student", "admin", "owner"].includes(profile?.role) ? profile.role : "student";
  const metadataRole = roleFromUser(user);
  const role = profileRole !== "student" ? profileRole : metadataRole;
  state.ownerPrivilegesSuspended = Boolean(profile?.owner_privileges_suspended);
  state.ownerPrivilegeForm.status = state.ownerPrivilegesSuspended
    ? "Owner privileges are suspended for this account. Enter your password to restore them."
    : "Owner privileges are active. Enter your password to suspend them.";
  if (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) {
    const suspendedUntil = formatDateTime(profile.suspended_until);
    const client = await supabaseClient();
    await client.auth.signOut();
    state.user = null;
    resetSignedOutAccountState();
    setRole("student", false, "suspended account");
    state.authStatus = `This account is suspended until ${suspendedUntil}.`;
    state.roleStatus = "Account permissions are disabled during suspension.";
    return;
  }
  setRole(role, true, profileRole !== "student" ? "Supabase profile" : "Supabase authentication");
  if (profile?.account_tier) state.account = profile.account_tier;
  state.accountSettings.email = user.email || state.accountSettings.email;
  state.accountSettings.pendingEmail = user.user_metadata?.pending_email || state.accountSettings.pendingEmail || "";
  if (state.accountSettings.pendingEmail === user.email) state.accountSettings.pendingEmail = "";
  state.accountSettings.displayName = profile?.display_name || displayNameFromUser(user) || state.accountSettings.displayName || "";
  state.accountSettings.phone = profile?.phone || state.accountSettings.phone || "";
  state.roleStatus = state.ownerPrivilegesSuspended
    ? "Administrator permissions verified by Supabase. Owner privileges are currently suspended."
    : `${roleLabel(role)} permissions verified by Supabase.`;
}

async function saveAccountSettings() {
  if (!state.user) {
    state.accountSettings.status = "Sign in before saving account settings.";
    render();
    return;
  }
  try {
    const client = await supabaseClient();
    const nextEmail = state.accountSettings.email.trim();
    const nextDisplayName = state.accountSettings.displayName.trim();
    const nextPhone = state.accountSettings.phone.trim();
    if (!nextEmail) throw new Error("Email cannot be blank.");
    if (state.accountSettings.pendingEmail && nextEmail === state.user.email) {
      state.accountSettings.pendingEmail = "";
    }
    if (nextEmail && nextEmail !== state.user.email) {
      const { data, error } = await withTimeout(client.auth.updateUser({
        email: nextEmail,
        data: { pending_email: nextEmail }
      }), 8000, "Email update");
      if (error) throw error;
      state.user = data.user || state.user;
      state.accountSettings.pendingEmail = nextEmail;
      state.authStatus = "Email update requested. Check the new email address for the confirmation link.";
    }
    let { error: profileError } = await client
      .from("profiles")
      .update({
        display_name: nextDisplayName,
        phone: nextPhone,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", state.user.id);
    if (profileError) throw profileError;
    state.accountSettings.email = state.user.email || state.accountSettings.email;
    state.accountSettings.displayName = nextDisplayName;
    state.accountSettings.phone = nextPhone;
    state.accountSettings.status = state.accountSettings.pendingEmail
      ? `Profile saved. Email change pending confirmation for ${state.accountSettings.pendingEmail}.`
      : "Saved account settings to Supabase.";
  } catch (error) {
    state.accountSettings.status = `Could not save account settings: ${error.message}`;
  }
  render();
}

async function writeAdminAudit(action, resourceType, resourceId = null, reason = null, metadata = {}) {
  if (!isAdminRole() || !hasSupabaseConfig()) return;
  const client = await supabaseClient();
  const { error } = await client.rpc("write_admin_audit", {
    action_name: action,
    resource_type_name: resourceType,
    resource_id_value: resourceId,
    reason_value: reason,
    metadata_value: metadata
  });
  if (error) throw error;
}

async function saveBlueprintVersionToSupabase(blueprint, reason) {
  if (!isAdminRole()) throw new Error("Administrator or Owner access is required.");
  const changeReason = String(reason || "").trim();
  if (!changeReason) throw new Error("A blueprint change reason is required.");
  const client = await supabaseClient();
  const { error } = await client.from("blueprint_versions").upsert({
    blueprint_name: blueprint.name,
    cluster: blueprint.cluster,
    level: blueprint.level,
    category: blueprint.category,
    version: blueprint.version,
    distribution: blueprint.distribution,
    total_questions: blueprint.totalQuestions,
    status: "Active",
    change_reason: changeReason,
    created_by: state.user.id
  }, { onConflict: "blueprint_name,version" });
  if (error) throw error;
  await writeAdminAudit("Blueprint version saved", "blueprint", blueprint.name, changeReason, { version: blueprint.version });
  await loadBlueprintVersions(client);
}

async function loadBlueprintVersions(clientArg) {
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("blueprint_versions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  state.blueprintVersions = data || [];
}

async function restoreBlueprintVersion(id) {
  if (!requireAdminPermission("restore blueprint versions")) return;
  const version = state.blueprintVersions.find(item => item.id === id);
  if (!version) return;
  const blueprint = createBlueprint(
    version.cluster,
    version.level,
    version.category,
    version.distribution || {},
    version.version
  );
  state.customBlueprints = state.customBlueprints.filter(item => item.name !== blueprint.name);
  state.customBlueprints.push(blueprint);
  persistCustomBlueprints();
  applyBlueprint(blueprint);
  state.blueprintStatus = `Restored ${blueprint.name} version ${blueprint.version}.`;
  try {
    const client = await supabaseClient();
    const { error } = await client.from("blueprint_versions").update({ status: "Rolled Back" }).eq("id", id);
    if (error) throw error;
    await writeAdminAudit("Blueprint version restored", "blueprint_version", id, version.change_reason, { blueprint: blueprint.name });
    await loadBlueprintVersions(client);
  } catch (error) {
    state.blueprintStatus = `Restored locally. Supabase status update failed: ${error.message}`;
  }
  render();
}

function normalizedQuestionWords(value) {
  return new Set(String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(word => word.length > 2));
}

function questionSimilarity(left, right) {
  const a = normalizedQuestionWords(left);
  const b = normalizedQuestionWords(right);
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter(word => b.has(word)).length;
  return Math.round((shared / new Set([...a, ...b]).size) * 100);
}

async function reviewBulkDuplicates() {
  if (!requireAdminPermission("review duplicate questions")) return;
  try {
    const parsed = JSON.parse(state.bulkUploadText);
    const candidates = (Array.isArray(parsed) ? parsed : [parsed]).map(normalizeQuestionPayload);
    state.duplicateReviews = candidates.map((candidate, index) => {
      const matches = activeQuestions()
        .map(question => ({ question, similarity: questionSimilarity(candidate.question_text, question.text) }))
        .sort((a, b) => b.similarity - a.similarity);
      const best = matches[0];
      return {
        id: `local-${index}`,
        candidate,
        candidateText: candidate.question_text,
        matchingQuestionId: best?.question?.id || "",
        matchingText: best?.question?.text || "No close match",
        similarity: best?.similarity || 0,
        status: "Pending"
      };
    }).filter(review => review.similarity >= 35);
    state.uploadStatus = state.duplicateReviews.length
      ? `Found ${state.duplicateReviews.length} possible duplicate${state.duplicateReviews.length === 1 ? "" : "s"}.`
      : "No likely duplicates found.";
  } catch (error) {
    state.uploadStatus = `Duplicate review failed: ${error.message}`;
  }
  render();
}

async function resolveDuplicateReview(id, action) {
  if (!requireAdminPermission("resolve duplicate questions")) return;
  const review = state.duplicateReviews.find(item => item.id === id);
  if (!review) return;
  review.status = action;
  try {
    const client = await supabaseClient();
    if (isUuid(id)) {
      const { error } = await client.from("duplicate_question_reviews").update({
        status: action,
        reviewed_by: state.user.id,
        reviewed_at: new Date().toISOString()
      }).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await client.from("duplicate_question_reviews").insert({
        candidate_hash: await sha256Hex(review.candidateText),
        candidate_question: review.candidate,
        matching_question_id: isUuid(review.matchingQuestionId) ? review.matchingQuestionId : null,
        similarity: review.similarity,
        status: action,
        reviewed_by: state.user.id,
        reviewed_at: new Date().toISOString()
      });
      if (error) throw error;
    }
    if (action === "Edit") {
      state.uploadForm = {
        partitionKey: review.candidate.partition_key,
        performanceIndicator: review.candidate.performance_indicator || "",
        questionType: review.candidate.question_type || "Multiple Choice",
        questionText: review.candidate.question_text,
        options: normalizeOptions(review.candidate.options).map(option => option.text),
        correctOptionId: normalizeCorrectOptionId(review.candidate.correct_option_id),
        explanation: review.candidate.explanation || "",
        difficulty: review.candidate.difficulty,
        tags: parseTags(review.candidate.tags).join(", ")
      };
    }
    await writeAdminAudit(`Duplicate review ${action.toLowerCase()}`, "duplicate_question", review.matchingQuestionId || id, null, { similarity: review.similarity });
    state.uploadStatus = `Duplicate candidate marked ${action}.`;
  } catch (error) {
    state.uploadStatus = `Could not save duplicate decision: ${error.message}`;
  }
  render();
}

async function resendPendingEmailChange() {
  if (!state.user || !state.accountSettings.pendingEmail) {
    state.accountSettings.status = "No pending email change to resend.";
    render();
    return;
  }
  try {
    const client = await supabaseClient();
    const pendingEmail = state.accountSettings.pendingEmail;
    const { data, error } = await withTimeout(client.auth.updateUser({
      email: pendingEmail,
      data: { pending_email: pendingEmail }
    }), 8000, "Email confirmation resend");
    if (error) throw error;
    state.user = data.user || state.user;
    state.accountSettings.status = `Confirmation link resent to ${pendingEmail}.`;
  } catch (error) {
    state.accountSettings.status = `Could not resend confirmation: ${friendlyAuthError(error)}`;
  }
  render();
}

async function cancelPendingEmailChange() {
  if (!state.accountSettings.pendingEmail) {
    state.accountSettings.status = "No pending email change to cancel.";
    render();
    return;
  }
  const cancelledEmail = state.accountSettings.pendingEmail;
  state.accountSettings.pendingEmail = "";
  state.accountSettings.email = state.user?.email || state.accountSettings.email;
  try {
    if (state.user && hasSupabaseConfig()) {
      const client = await supabaseClient();
      const { data, error } = await client.auth.updateUser({
        data: { pending_email: null }
      });
      if (error) throw error;
      state.user = data.user || state.user;
    }
    state.accountSettings.status = `Cancelled pending email change to ${cancelledEmail}.`;
  } catch (error) {
    state.accountSettings.status = `Cancelled locally. Supabase metadata update failed: ${friendlyAuthError(error)}`;
  }
  render();
}

function setMembershipTier(tier) {
  state.account = tier;
  state.accountSettings.status = `${tier === "premium" ? "Premium" : "Free"} membership selected.`;
  saveUserPreferences();
  if (state.user) {
    saveAccountSettings();
    return;
  }
  render();
}

function subscriptionIsPremium(subscription = state.billing.subscription) {
  return ["active", "trialing"].includes(String(subscription?.status || "").toLowerCase());
}

function syncAccountFromSubscription(subscription = state.billing.subscription) {
  if (subscription) {
    state.account = subscriptionIsPremium(subscription) ? "premium" : "free";
  } else if (state.billing.checked) {
    state.account = "free";
  }
}

function mapSubscriptionRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id || "",
    status: row.status || "inactive",
    priceId: row.price_id || "",
    subscriptionId: row.stripe_subscription_id || "",
    customerId: row.stripe_customer_id || "",
    currentPeriodStart: row.current_period_start || "",
    currentPeriodEnd: row.current_period_end || "",
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    updatedAt: row.updated_at || ""
  };
}

async function loadSubscriptionStatus(clientArg) {
  if (!state.user) {
    state.billing.subscription = null;
    state.billing.status = "Billing is local until sign-in.";
    return;
  }
  const client = clientArg || await supabaseClient();
  const { data, error } = await client
    .from("subscriptions")
    .select("user_id,stripe_customer_id,stripe_subscription_id,status,price_id,current_period_start,current_period_end,cancel_at_period_end,updated_at")
    .eq("user_id", state.user.id)
    .maybeSingle();
  if (error) throw error;
  state.billing.subscription = mapSubscriptionRow(data);
  state.billing.checked = true;
  if (state.billing.subscription) {
    syncAccountFromSubscription();
    state.billing.status = subscriptionIsPremium()
      ? "Premium subscription is active."
      : `Subscription status: ${state.billing.subscription.status}.`;
  } else {
    state.account = "free";
    state.billing.status = "No active Stripe subscription found.";
  }
}

async function refreshBillingStatus() {
  try {
    if (!state.user) throw new Error("Sign in before checking billing.");
    state.billing.loading = true;
    state.billing.status = "Checking subscription status...";
    render();
    await loadSubscriptionStatus();
    state.billing.loading = false;
  } catch (error) {
    state.billing.loading = false;
    state.billing.status = `Could not load billing status: ${supabaseErrorMessage(error)}`;
  }
  render();
}

async function reconcileBillingAfterCheckout() {
  if (!state.user) return;
  state.billing.loading = true;
  const retryDelays = [0, 1000, 2000, 4000, 6000];

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt]) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    }

    try {
      state.billing.status = attempt
        ? `Payment received. Waiting for subscription synchronization (${attempt + 1}/${retryDelays.length})...`
        : "Payment received. Synchronizing subscription...";
      render();
      await loadSubscriptionStatus();
      if (subscriptionIsPremium()) {
        state.billing.loading = false;
        state.billing.status = "Premium subscription is active.";
        render();
        return;
      }
    } catch (error) {
      if (attempt === retryDelays.length - 1) {
        state.billing.loading = false;
        state.billing.status = `Checkout completed, but subscription synchronization could not be confirmed: ${supabaseErrorMessage(error)}`;
        render();
        return;
      }
    }
  }

  state.billing.loading = false;
  state.billing.status = "Checkout completed. Stripe synchronization is still processing; use Refresh Status in a moment.";
  render();
}

async function invokeSupabaseFunction(functionName, body, expiredMessage = "Your login session has expired. Sign in again before continuing.") {
  const client = await supabaseClient();
  let { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;

  let session = sessionData?.session;
  const expiresSoon = session?.expires_at && (session.expires_at * 1000) < Date.now() + 60000;
  if (session && expiresSoon) {
    const refreshResult = await client.auth.refreshSession();
    if (refreshResult.error) throw refreshResult.error;
    session = refreshResult.data?.session;
  }

  if (!session?.access_token) {
    throw new Error(expiredMessage);
  }

  const functionUrl = `${state.supabaseConfig.url.replace(/\/$/, "")}/functions/v1/${functionName}`;
  const response = await withTimeout(fetch(functionUrl, {
    method: "POST",
    headers: {
      apikey: state.supabaseConfig.anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body || {})
  }), 20000, functionName);

  const responseText = await response.text();
  let payload = {};
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = { message: responseText };
  }

  if (!response.ok) {
    const detail = payload.error || payload.message || response.statusText || "Unknown server error";
    throw new Error(`${functionName} returned ${response.status}: ${detail}`);
  }

  return payload;
}

async function invokeBillingFunction(functionName, body) {
  return invokeSupabaseFunction(functionName, body, "Your login session has expired. Sign in again before opening checkout.");
}

function checkoutReturnUrl(status) {
  return appRedirectUrl(`?checkout=${encodeURIComponent(status)}`);
}

async function startCheckout() {
  try {
    if (!state.user) throw new Error("Sign in before upgrading.");
    state.billing.loading = true;
    state.billing.status = "Opening secure Stripe Checkout...";
    render();
    const data = await invokeBillingFunction(state.billing.checkoutFunction, {
      success_url: checkoutReturnUrl("success"),
      successUrl: checkoutReturnUrl("success"),
      cancel_url: checkoutReturnUrl("cancel"),
      cancelUrl: checkoutReturnUrl("cancel"),
      source: "lift-off-exams"
    });
    const url = data.url || data.checkout_url || data.checkoutUrl;
    if (!url) throw new Error("Checkout function did not return a Stripe Checkout URL.");
    window.location.href = url;
  } catch (error) {
    state.billing.loading = false;
    state.billing.status = `Could not open checkout: ${supabaseErrorMessage(error)}`;
    render();
  }
}

function upgradeForPremium(feature = "Premium") {
  if (!state.user) {
    state.authStatus = `Sign in or create an account to upgrade for ${feature}.`;
    setRoute("login");
    return;
  }
  startCheckout();
}

async function openCustomerPortal() {
  try {
    if (!state.user) throw new Error("Sign in before opening billing management.");
    state.billing.loading = true;
    state.billing.status = "Opening Stripe billing portal...";
    render();
    const portalReturnUrl = appRedirectUrl("?billing=portal");
    const data = await invokeBillingFunction(state.billing.portalFunction, {
      return_url: portalReturnUrl,
      returnUrl: portalReturnUrl,
      source: "lift-off-exams"
    });
    const url = data.url || data.portal_url || data.portalUrl;
    if (!url) throw new Error("Customer portal function did not return a Stripe portal URL.");
    window.location.href = url;
  } catch (error) {
    state.billing.loading = false;
    state.billing.status = `Could not open billing portal: ${supabaseErrorMessage(error)}`;
    render();
  }
}

function applyCheckoutReturnFromUrl() {
  const url = new URL(window.location.href);
  const checkoutStatus = url.searchParams.get("checkout");
  const billingReturn = url.searchParams.get("billing");
  if (!checkoutStatus && billingReturn !== "portal") return false;
  url.searchParams.delete("checkout");
  url.searchParams.delete("billing");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  state.route = "settings";
  if (billingReturn === "portal") {
    state.billing.status = "Returned from Stripe. Refreshing subscription status...";
    if (state.user) refreshBillingStatus();
  } else {
    state.billing.status = checkoutStatus === "success"
      ? "Checkout completed. Refreshing subscription status..."
      : "Checkout was cancelled. Your plan was not changed.";
    if (checkoutStatus === "success" && state.user) reconcileBillingAfterCheckout();
  }
  return true;
}

async function connectGoogleIdentity() {
  try {
    if (!state.user) throw new Error("Sign in before connecting Google.");
    const client = await supabaseClient();
    const redirectTo = appRedirectUrl();
    if (!client.auth.linkIdentity) throw new Error("This Supabase Auth client does not expose identity linking. Use Google login, or update Supabase JS.");
    setGoogleLinkPending(true);
    const { error } = await client.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile",
        queryParams: {
          prompt: "select_account"
        }
      }
    });
    if (error) {
      setGoogleLinkPending(false);
      throw error;
    }
    state.accountSettings.status = "Opening Google account connection.";
  } catch (error) {
    state.accountSettings.status = friendlyAuthError(error);
  }
  render();
}

async function startGoogleAuth(intent = "login") {
  try {
    state.authStatus = intent === "signup" ? "Opening Google sign-up..." : "Opening Google sign-in...";
    render();
    const client = await supabaseClient();
    const inviteHash = state.teamAccounts.acceptingInviteToken ? `#team-invite=${encodeURIComponent(state.teamAccounts.acceptingInviteToken)}` : "";
    const { error } = await withTimeout(client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: appRedirectUrl(inviteHash),
        scopes: "openid email profile",
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    }), 12000, "Supabase Google sign-in");
    if (error) throw error;
  } catch (error) {
    state.authStatus = `${error.message} Google also requires this redirect URI in Google Cloud: ${supabaseOAuthCallbackUrl()}`;
    render();
  }
}

function scheduleUserRoleRefresh(user) {
  if (!user) {
    setRole("student", false, "signed out");
    return;
  }
  const metadataRole = roleFromUser(user);
  const metadataIsStaff = ["admin", "owner"].includes(metadataRole);
  setRole(metadataRole, metadataIsStaff, metadataIsStaff ? "Supabase app metadata" : "verification pending");
  state.roleStatus = metadataIsStaff
    ? `${roleLabel()} permissions loaded from trusted Supabase app metadata. Checking profile...`
    : "Standard permissions active while the Supabase profile is verified.";
  withTimeout(applyUserRole(user), 5000, "Supabase profile check")
    .then(() => {
      if (state.user?.id !== user.id) return;
      render();
    })
    .catch(error => {
      if (state.user?.id !== user.id) return;
      if (!metadataIsStaff) setRole("student", false, "profile verification failed");
      state.roleStatus = metadataIsStaff
        ? `${roleLabel()} permissions remain verified by Supabase app metadata. Profile check failed: ${error.message}`
        : `Admin permissions are unavailable because Supabase profile verification failed: ${error.message}`;
      render();
    });
}

async function createAdminAccessLinkRecord(email, requestedRole) {
  if (!hasSupabaseConfig()) throw new Error("Connect Supabase before creating tokenized invite records.");
  const token = secureToken(40);
  const tokenHash = await sha256Hex(token);
  const client = await supabaseClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("admin_access_links")
    .insert({
      email,
      token_hash: tokenHash,
      requested_role: requestedRole,
      status: requestedRole === "owner" ? "Pending Owner Approval" : "Pending Owner Approval",
      created_by: state.user?.id || null,
      expires_at: expiresAt
    })
    .select("id,email,requested_role,status,expires_at")
    .single();
  if (error) throw error;
  const link = `${window.location.origin}${window.location.pathname}#admin-access=${token}`;
  return { record: data, link };
}

function setRole(role, verified = false, source = "") {
  state.role = ["student", "admin", "owner"].includes(role) ? role : "student";
  state.roleVerified = Boolean(verified);
  localStorage.removeItem("lift-role");
  state.roleStatus = `${roleLabel()} permissions ${state.roleVerified ? "verified" : "restricted"}${source ? ` by ${source}` : ""}.`;
}

function roleLabel(role = state.role) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Administrator";
  return "Standard user";
}

function authEntryRoute() {
  return ["landing", "login", "signup", "supabase-setup"].includes(state.route);
}

function displayNameFromUser(user) {
  return user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "";
}

function profileDisplayName() {
  return state.accountSettings.displayName?.trim()
    || displayNameFromUser(state.user)
    || state.user?.email?.split("@")[0]
    || (state.account === "premium" ? "Premium account" : "Free account");
}

function resetSignedOutAccountState() {
  state.accountSettings = {
    displayName: "",
    email: state.authForm.email || "",
    phone: "",
    pendingEmail: "",
    status: "Account settings are local until sign-in."
  };
  state.deletionRequest = null;
  state.deletionForm = {
    confirmText: "",
    reason: "",
    status: "No deletion request is active."
  };
  state.ownerPrivilegesSuspended = false;
  state.ownerPrivilegeForm = {
    password: "",
    status: "Owner privilege suspension is inactive."
  };
  state.billing.subscription = null;
  state.billing.loading = false;
  state.billing.checked = false;
  state.billing.status = "Billing is local until sign-in.";
}

function isAdminRole() {
  return Boolean(state.user?.id && state.roleVerified && (state.role === "admin" || state.role === "owner"));
}

function isOwnerRole() {
  return Boolean(state.user?.id && state.roleVerified && state.role === "owner");
}

function activeOwnerCount() {
  if (Number.isFinite(state.ownerCount)) return state.ownerCount;
  const owners = state.adminProfiles.filter(profile =>
    profile.role === "owner" && (!profile.suspended_until || new Date(profile.suspended_until) < new Date())
  ).length;
  return owners || (isOwnerRole() ? 1 : 0);
}

function requireAdminPermission(action = "open admin tools") {
  if (isAdminRole()) return true;
  state.roleStatus = `Standard users cannot ${action}.`;
  setRoute("dashboard");
  return false;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function mergeUserQuestionStatuses() {
  activeQuestions().forEach(question => {
    if (!isUuid(question.id)) return;
    const saved = state.userQuestionStatuses[question.id];
    if (!saved) {
      question.status = state.user ? "Unseen" : question.status || "Unseen";
      question.seenCount = state.user ? 0 : Number(question.seenCount || 0);
      return;
    }
    question.status = saved.status || "Unseen";
    question.seenCount = Number(saved.seen_count ?? saved.seenCount ?? 0);
    question.lastSeenAt = saved.last_seen_at || saved.lastSeenAt || null;
  });
}

async function loadUserQuestionStatuses() {
  if (!state.user) {
    state.userQuestionStatuses = {};
    mergeUserQuestionStatuses();
    state.questionStatusStatus = "Question statuses are local until sign-in.";
    state.questionStatusesLoading = false;
    state.questionStatusLoadedKey = "";
    return;
  }
  const ids = activeQuestionStatusIds();
  const loadKey = questionStatusLoadKey();
  if (!ids.length) {
    state.userQuestionStatuses = {};
    mergeUserQuestionStatuses();
    state.questionStatusStatus = "Signed in. Saved question statuses appear after loading Supabase questions.";
    state.questionStatusLoadedKey = loadKey;
    return;
  }
  try {
    const client = await supabaseClient();
    const { data, error } = await client
      .from("user_question_status")
      .select("question_id,status,seen_count,last_seen_at")
      .eq("user_id", state.user.id)
      .in("question_id", ids);
    if (error) throw error;
    state.userQuestionStatuses = Object.fromEntries((data || []).map(row => [row.question_id, row]));
    mergeUserQuestionStatuses();
    state.questionStatusStatus = `Loaded ${data?.length || 0} saved question status row${data?.length === 1 ? "" : "s"}.`;
    state.questionStatusLoadedKey = loadKey;
  } catch (error) {
    state.questionStatusStatus = `Could not load saved question statuses: ${error.message}`;
  }
}

function requestUserQuestionStatuses() {
  if (!state.user) {
    state.questionStatusStatus = "Question statuses are local until sign-in.";
    return;
  }
  const loadKey = questionStatusLoadKey();
  if (!loadKey || state.questionStatusLoadedKey === loadKey || state.questionStatusesLoading) return;
  state.questionStatusesLoading = true;
  state.questionStatusStatus = "Loading saved question statuses...";
  state.questionStatusLoadPromise = loadUserQuestionStatuses()
    .finally(() => {
      state.questionStatusesLoading = false;
      state.questionStatusLoadPromise = null;
      if (["questionbank", "search", "generator", "infinite", "testid", "test"].includes(state.route)) render();
    });
}

async function upsertUserQuestionStatuses(rows) {
  if (!state.user || !rows.length) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_question_status")
      .upsert(rows, { onConflict: "user_id,question_id" });
    if (error) throw error;
    rows.forEach(row => {
      state.userQuestionStatuses[row.question_id] = row;
    });
    state.questionStatusStatus = `Saved ${rows.length} question status update${rows.length === 1 ? "" : "s"}.`;
  } catch (error) {
    state.questionStatusStatus = `Could not save question statuses: ${error.message}`;
  }
}

function userPreferencesPayload() {
  return {
    user_id: state.user.id,
    theme: state.theme,
    account_tier: state.account,
    selected_settings: {
      selected: state.selected,
      testIdLookup: {
        premiumCount: state.testIdLookup.premiumCount,
        timer: state.testIdLookup.timer,
        customTimerMinutes: state.testIdLookup.customTimerMinutes,
        studyMode: state.testIdLookup.studyMode,
        randomizeOrder: state.testIdLookup.randomizeOrder
      },
      onboarding: state.onboarding,
      hardcore: state.hardcore
    },
    notification_settings: state.notificationSettings || {},
    updated_at: new Date().toISOString()
  };
}

async function saveUserPreferences() {
  if (!state.user) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_preferences")
      .upsert(userPreferencesPayload(), { onConflict: "user_id" });
    if (error) throw error;
    state.userDataStatus = "Saved user preferences to Supabase.";
  } catch (error) {
    state.userDataStatus = `Could not save user preferences: ${error.message}`;
  }
}

async function loadUserPreferences(client) {
  const { data, error } = await client
    .from("user_preferences")
    .select("theme,account_tier,selected_settings,notification_settings")
    .eq("user_id", state.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    await saveUserPreferences();
    return;
  }
  state.theme = data.theme || state.theme;
  state.account = data.account_tier || state.account;
  document.documentElement.dataset.theme = state.theme;
  const settings = data.selected_settings || {};
  if (settings.selected) state.selected = { ...state.selected, ...settings.selected };
  if (settings.testIdLookup) state.testIdLookup = { ...state.testIdLookup, ...settings.testIdLookup };
  if (settings.onboarding) {
    state.onboarding = { ...state.onboarding, ...settings.onboarding };
    localStorage.setItem("lift-onboarding", JSON.stringify(state.onboarding));
  }
  if (settings.hardcore) state.hardcore = { ...state.hardcore, ...settings.hardcore };
  if (!state.pausedSession && settings.pausedSession) {
    state.pausedSession = settings.pausedSession;
    state.resumeAvailable = true;
  }
  state.notificationSettings = data.notification_settings || state.notificationSettings || {};
}

function activeSessionRow(snapshot) {
  return {
    user_id: state.user.id,
    session_type: "paused_test",
    test_id: snapshot.test.id,
    mode: snapshot.test.mode,
    current_index: Number(snapshot.current || 0),
    question_count: snapshot.test.questions.length,
    timer_seconds_remaining: snapshot.test.timerSeconds ?? null,
    session_state: snapshot,
    saved_at: snapshot.savedAt,
    updated_at: new Date().toISOString()
  };
}

function pausedSessionFromRow(row) {
  if (!row?.session_state) return null;
  return {
    ...row.session_state,
    savedAt: row.saved_at || row.session_state.savedAt
  };
}

async function savePausedSessionToSupabase(snapshot) {
  if (!state.user || !snapshot) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_active_sessions")
      .upsert(activeSessionRow(snapshot), { onConflict: "user_id,session_type" });
    if (error) throw error;
    state.userDataStatus = "Saved paused session to Supabase.";
  } catch (error) {
    state.userDataStatus = `Paused session saved locally. Supabase save failed: ${error.message}`;
  }
}

async function loadPausedSession(client) {
  const { data, error } = await client
    .from("user_active_sessions")
    .select("session_state,saved_at")
    .eq("user_id", state.user.id)
    .eq("session_type", "paused_test")
    .maybeSingle();
  if (error) throw error;
  state.pausedSession = pausedSessionFromRow(data);
  state.resumeAvailable = Boolean(state.pausedSession);
}

async function clearPausedSessionFromSupabase() {
  if (!state.user) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_active_sessions")
      .delete()
      .eq("user_id", state.user.id)
      .eq("session_type", "paused_test");
    if (error) throw error;
    state.userDataStatus = "Cleared paused session from Supabase.";
  } catch (error) {
    state.userDataStatus = `Paused session cleared locally. Supabase clear failed: ${error.message}`;
  }
}

function activeSessionSnapshot() {
  if (!state.test) return null;
  const remainingSeconds = timerRemainingSeconds();
  const elapsedSecondsBeforeStart = testElapsedSeconds();
  return {
    test: {
      ...state.test,
      timerSeconds: remainingSeconds === null ? state.test.timerSeconds : remainingSeconds,
      startedAt: Date.now(),
      elapsedSecondsBeforeStart,
      elapsedSeconds: undefined,
      completedAt: undefined
    },
    answers: state.answers,
    current: state.current,
    timerHidden: state.timerHidden,
    strikeCount: state.strikeCount,
    gradedAnswers: state.gradedAnswers,
    testNotice: state.testNotice,
    testEndReason: state.testEndReason,
    reportFormOpen: false,
    savedAt: new Date().toISOString()
  };
}

function pauseCurrentTest() {
  const snapshot = activeSessionSnapshot();
  if (!snapshot) {
    setRoute(inviteAwareDashboardRoute());
    return;
  }
  state.pausedSession = snapshot;
  state.resumeAvailable = true;
  state.userDataStatus = state.user ? "Saving paused session to Supabase..." : "Paused session saved locally.";
  savePausedSessionToSupabase(snapshot);
  setRoute("dashboard");
}

function resumePausedSession() {
  const session = state.pausedSession;
  if (!session?.test?.questions?.length) {
    state.resumeAvailable = false;
    state.userDataStatus = "No paused session is available.";
    render();
    return;
  }
  state.test = session.test;
  if (state.test.timerSeconds) state.test.startedAt = Date.now();
  state.answers = session.answers || {};
  state.current = Math.min(Number(session.current || 0), state.test.questions.length - 1);
  state.timerHidden = Boolean(session.timerHidden);
  state.strikeCount = Number(session.strikeCount || 0);
  state.gradedAnswers = session.gradedAnswers || {};
  state.testNotice = session.testNotice || "";
  state.testEndReason = session.testEndReason || "";
  state.reportFormOpen = false;
  setRoute("test");
  startTimerLoop();
}

function clearPausedSession() {
  state.pausedSession = null;
  state.resumeAvailable = false;
  clearPausedSessionFromSupabase();
}

function historyToSupabaseRow(entry) {
  return {
    user_id: state.user.id,
    test_id: entry.id,
    mode: entry.mode || "Test",
    completed_at: entry.completedAt || new Date().toISOString(),
    correct: Number(entry.correct || 0),
    total: Number(entry.total || 0),
    percent: Number(entry.percent || 0),
    topics: entry.topics || [],
    category: entry.category || null,
    difficulty: entry.difficulty || null,
    blueprint: entry.blueprint || null,
    question_count: Number(entry.questionCount || entry.total || 0),
    metadata: {
      displayDate: entry.date || "",
      testEndReason: entry.testEndReason || ""
    }
  };
}

function historyFromSupabaseRow(row) {
  const completed = row.completed_at ? new Date(row.completed_at) : new Date();
  return {
    id: row.test_id,
    mode: row.mode,
    date: completed.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    completedAt: row.completed_at,
    correct: row.correct,
    total: row.total,
    percent: row.percent,
    topics: row.topics || [],
    category: row.category || "",
    difficulty: row.difficulty || "",
    blueprint: row.blueprint || "",
    questionCount: row.question_count || row.total || 0,
    testEndReason: row.metadata?.testEndReason || ""
  };
}

async function saveUserTestHistory(entry) {
  if (!state.user || !entry) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_test_history")
      .upsert(historyToSupabaseRow(entry), { onConflict: "user_id,test_id" });
    if (error) throw error;
    state.userDataStatus = "Saved test history to Supabase.";
  } catch (error) {
    state.userDataStatus = `Could not save test history: ${error.message}`;
  }
}

async function loadUserTestHistory(client) {
  const { data, error } = await client
    .from("user_test_history")
    .select("test_id,mode,completed_at,correct,total,percent,topics,category,difficulty,blueprint,question_count,metadata")
    .eq("user_id", state.user.id)
    .order("completed_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  if (data?.length) {
    state.scoreHistory = data.map(historyFromSupabaseRow);
    state.completedTestIds = state.scoreHistory.map(entry => entry.id);
  }
}

function statRowsFromState() {
  if (!state.user) return [];
  return [
    ...state.topicStats.map(stat => ({
      user_id: state.user.id,
      stat_type: "topic",
      label: stat.topic,
      correct: Number(stat.correct || 0),
      unsure: 0,
      total: Number(stat.total || 0),
      updated_at: new Date().toISOString()
    })),
    ...state.difficultyStats.map(stat => ({
      user_id: state.user.id,
      stat_type: "difficulty",
      label: stat.difficulty,
      correct: Number(stat.correct || 0),
      unsure: 0,
      total: Number(stat.total || 0),
      updated_at: new Date().toISOString()
    })),
    ...state.confidenceStats.map(stat => ({
      user_id: state.user.id,
      stat_type: "confidence",
      label: stat.topic,
      correct: 0,
      unsure: Number(stat.unsure || 0),
      total: Number(stat.total || 0),
      updated_at: new Date().toISOString()
    }))
  ];
}

async function saveUserPerformanceStats() {
  if (!state.user) return;
  const rows = statRowsFromState();
  if (!rows.length) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_topic_stats")
      .upsert(rows, { onConflict: "user_id,stat_type,label" });
    if (error) throw error;
    state.userDataStatus = "Saved analytics to Supabase.";
  } catch (error) {
    state.userDataStatus = `Could not save analytics: ${error.message}`;
  }
}

async function loadUserPerformanceStats(client) {
  const { data, error } = await client
    .from("user_topic_stats")
    .select("stat_type,label,correct,unsure,total")
    .eq("user_id", state.user.id);
  if (error) throw error;
  if (!data?.length) return;
  state.topicStats = data
    .filter(row => row.stat_type === "topic")
    .map(row => ({ topic: row.label, correct: row.correct, total: row.total }));
  state.difficultyStats = data
    .filter(row => row.stat_type === "difficulty")
    .map(row => ({ difficulty: row.label, correct: row.correct, total: row.total }));
  state.confidenceStats = data
    .filter(row => row.stat_type === "confidence")
    .map(row => ({ topic: row.label, unsure: row.unsure, total: row.total }));
}

function customBlueprintToSupabaseRow(blueprint) {
  return {
    user_id: state.user.id,
    name: blueprint.name,
    cluster: blueprint.cluster,
    level: blueprint.level,
    category: blueprint.category,
    version: blueprint.version || "2026.1",
    distribution: blueprint.distribution || {},
    total_questions: Number(blueprint.totalQuestions || 0),
    updated_at: new Date().toISOString()
  };
}

function customBlueprintFromSupabaseRow(row) {
  return createBlueprint(row.cluster, row.level, row.category, row.distribution || {}, row.version || "2026.1");
}

async function saveUserCustomBlueprints() {
  if (!state.user) return;
  try {
    const client = await supabaseClient();
    const { error: deleteError } = await client
      .from("user_custom_blueprints")
      .delete()
      .eq("user_id", state.user.id);
    if (deleteError) throw deleteError;
    if (state.customBlueprints.length) {
      const { error } = await client
        .from("user_custom_blueprints")
        .upsert(state.customBlueprints.map(customBlueprintToSupabaseRow), { onConflict: "user_id,name" });
      if (error) throw error;
    }
    state.userDataStatus = "Saved custom blueprints to Supabase.";
  } catch (error) {
    state.userDataStatus = `Could not save custom blueprints: ${error.message}`;
  }
}

async function loadUserCustomBlueprints(client) {
  const { data, error } = await client
    .from("user_custom_blueprints")
    .select("name,cluster,level,category,version,distribution,total_questions")
    .eq("user_id", state.user.id)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  if (data) {
    state.customBlueprints = data.map(customBlueprintFromSupabaseRow);
    localStorage.setItem("lift-custom-blueprints", JSON.stringify(state.customBlueprints));
    state.blueprintStatus = data.length
      ? `${data.length} custom blueprint${data.length === 1 ? "" : "s"} loaded from Supabase.`
      : "No custom blueprint created.";
  }
}

function deletionRequestFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    recoverableUntil: row.recoverable_until,
    finalWarningAt: row.final_warning_at,
    reason: row.reason || "",
    cancelledAt: row.cancelled_at || null
  };
}

async function loadAccountDeletionRequest(client) {
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("id,status,requested_at,recoverable_until,final_warning_at,reason,cancelled_at")
    .eq("user_id", state.user.id)
    .in("status", ["Requested", "Final warning sent"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  state.deletionRequest = deletionRequestFromRow(data);
  state.deletionForm.status = state.deletionRequest
    ? `Deletion requested. Recovery is available until ${formatDateTime(state.deletionRequest.recoverableUntil)}.`
    : "No deletion request is active.";
}

async function requestAccountDeletion() {
  if (!state.user) {
    state.deletionForm.status = "Sign in before requesting account deletion.";
    render();
    return;
  }
  if (!isUuid(state.user.id)) {
    state.deletionForm.status = "Supabase account id is not available yet. Sign out and back in, then try again.";
    render();
    return;
  }
  if (state.deletionForm.confirmText.trim().toUpperCase() !== "DELETE") {
    state.deletionForm.status = "Type DELETE to confirm the deletion request.";
    render();
    return;
  }
  if (!hasSupabaseConfig()) {
    state.deletionForm.status = "Connect Supabase before requesting account deletion.";
    render();
    return;
  }
  const now = Date.now();
  const recoverableUntil = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();
  const finalWarningAt = new Date(now + 83 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const client = await supabaseClient();
    const payload = {
      user_id: state.user.id,
      status: "Requested",
      reason: state.deletionForm.reason.trim(),
      recoverable_until: recoverableUntil,
      final_warning_at: finalWarningAt
    };
    const existing = state.deletionRequest && !state.deletionRequest.localOnly ? state.deletionRequest : null;
    const request = existing
      ? client
        .from("account_deletion_requests")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", state.user.id)
      : client
        .from("account_deletion_requests")
        .insert(payload);
    const { error } = await request;
    if (error) throw error;
    await loadAccountDeletionRequest(client);
    state.deletionForm.confirmText = "";
    state.deletionForm.status = "Deletion request saved to Supabase.";
  } catch (error) {
    state.deletionForm.status = `Supabase deletion request failed: ${supabaseErrorMessage(error)}`;
  }
  render();
}

async function cancelAccountDeletion() {
  if (!state.deletionRequest) {
    state.deletionForm.status = "No deletion request is active.";
    render();
    return;
  }
  if (state.deletionRequest.localOnly || !state.user) {
    state.deletionRequest = null;
    state.deletionForm.status = "Local deletion request cancelled.";
    render();
    return;
  }
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("account_deletion_requests")
      .update({
        status: "Cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", state.deletionRequest.id)
      .eq("user_id", state.user.id);
    if (error) throw error;
    state.deletionRequest = null;
    state.deletionForm.status = "Deletion request cancelled.";
  } catch (error) {
    state.deletionForm.status = `Could not cancel deletion request: ${error.message}`;
  }
  render();
}

async function refreshAdminDeletionQueue() {
  if (!requireAdminPermission("review account deletion requests")) return;
  if (!hasSupabaseConfig()) {
    state.adminDeletionStatus = "Connect Supabase before loading deletion requests.";
    render();
    return;
  }
  state.adminDeletionStatus = "Loading account deletion requests...";
  render();
  try {
    const client = await supabaseClient();
    const { data, error } = await client
      .from("account_deletion_requests")
      .select("id,user_id,status,reason,requested_at,recoverable_until,final_warning_at,cancelled_at,completed_at,updated_at")
      .in("status", ["Requested", "Final warning sent", "Cancelled", "Completed"])
      .order("requested_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    state.adminDeletionQueue = data || [];
    state.adminDeletionStatus = `Loaded ${state.adminDeletionQueue.length} deletion request${state.adminDeletionQueue.length === 1 ? "" : "s"}.`;
  } catch (error) {
    state.adminDeletionStatus = `Could not load deletion requests: ${error.message}`;
  }
  render();
}

async function updateAdminDeletionRequest(id, action) {
  if (!isOwnerRole()) {
    state.adminDeletionStatus = "Owner access is required for deletion execution actions.";
    render();
    return;
  }
  const request = state.adminDeletionQueue.find(item => item.id === id);
  if (!request) {
    state.adminDeletionStatus = "Deletion request not found.";
    render();
    return;
  }
  if (action === "Completed") {
    await executeAccountDeletionRequest(id);
    return;
  }
  const now = new Date().toISOString();
  const updates = {
    updated_at: now,
    execution_note: action
  };
  if (action === "Final warning sent") updates.status = "Final warning sent";
  if (action === "Cancelled") {
    updates.status = "Cancelled";
    updates.cancelled_at = now;
  }
  if (action === "Completed") {
    updates.status = "Completed";
    updates.completed_at = now;
  }
  try {
    const client = await supabaseClient();
    if (action === "Final warning sent") await createFinalWarningNotification(client, request);
    const { error } = await client
      .from("account_deletion_requests")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
    state.adminDeletionQueue = state.adminDeletionQueue.map(item => item.id === id ? { ...item, ...updates } : item);
    state.adminDeletionStatus = action === "Final warning sent"
      ? `Final warning queued for ${request.user_id}.`
      : `${action}: ${request.user_id}`;
    auditEvents.unshift([new Date().toLocaleString(), state.user?.email || roleLabel(), `Account deletion ${action}`, request.user_id, request.id]);
  } catch (error) {
    state.adminDeletionStatus = `Could not update deletion request: ${error.message}`;
  }
  render();
}

async function executeAccountDeletionRequest(id) {
  if (!isOwnerRole()) {
    state.adminDeletionStatus = "Owner access is required to execute account deletion.";
    render();
    return;
  }
  const request = state.adminDeletionQueue.find(item => item.id === id);
  if (!request) {
    state.adminDeletionStatus = "Deletion request not found.";
    render();
    return;
  }
  if (request.status !== "Final warning sent") {
    state.adminDeletionStatus = "Send the final warning before executing account deletion.";
    render();
    return;
  }
  state.adminDeletionStatus = `Executing account deletion for ${request.user_id}...`;
  render();
  try {
    const result = await invokeSupabaseFunction("execute-account-deletion", {
      request_id: id
    }, "Your login session has expired. Sign in again before executing deletion.");
    state.adminDeletionQueue = state.adminDeletionQueue.map(item => item.id === id
      ? {
        ...item,
        status: "Completed",
        completed_at: new Date().toISOString(),
        execution_note: "Auth user deleted"
      }
      : item);
    state.adminDeletionStatus = `Account deletion executed for ${result.deleted_user_id || request.user_id}.`;
    auditEvents.unshift([new Date().toLocaleString(), state.user?.email || roleLabel(), "Account deletion executed", request.user_id, request.id]);
    await refreshAdminDeletionQueue();
  } catch (error) {
    const message = error.message || "Unknown Edge Function error";
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      state.adminDeletionStatus = "Could not execute deletion: the browser could not reach the Edge Function. Redeploy execute-account-deletion with verify_jwt=false, then confirm SERVICE_ROLE_KEY is set.";
    } else if (message.includes("404")) {
      state.adminDeletionStatus = "Could not execute deletion: deploy the execute-account-deletion Edge Function for this Supabase project.";
    } else {
      state.adminDeletionStatus = `Could not execute deletion: ${message}`;
    }
  }
  render();
}

async function checkAccountDeletionFunction() {
  state.adminDeletionStatus = "Checking account deletion Edge Function...";
  render();
  try {
    const result = await invokeSupabaseFunction("execute-account-deletion", {
      diagnostic: true,
      request_id: "diagnostic"
    }, "Your login session has expired. Sign in again before checking deletion execution.");
    state.adminDeletionStatus = result?.ok
      ? "Account deletion Edge Function is reachable and authenticated."
      : "Account deletion Edge Function responded, but did not return ok.";
  } catch (error) {
    const message = error.message || "Unknown Edge Function error";
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      state.adminDeletionStatus = "Deletion function check failed: browser could not reach the Edge Function. Redeploy with verify_jwt=false and confirm CORS is active.";
    } else {
      state.adminDeletionStatus = `Deletion function check failed: ${message}`;
    }
  }
  render();
}

function deletionWarningMessage(request) {
  return `Final warning: your Lift Off Exams account is scheduled for permanent deletion after ${formatDateTime(request.recoverable_until)}. Cancel the deletion request from Recovery before that date to keep your account.`;
}

async function createFinalWarningNotification(client, request) {
  const message = deletionWarningMessage(request);
  const { error } = await client
    .from("user_notifications")
    .insert({
      user_id: request.user_id,
      type: "account_deletion_final_warning",
      title: "Final account deletion warning",
      message,
      delivery_status: "Queued",
      metadata: {
        deletion_request_id: request.id,
        recoverable_until: request.recoverable_until
      }
    });
  if (error) throw error;
}

async function loadUserNotifications(client) {
  const { data, error } = await client
    .from("user_notifications")
    .select("id,type,title,message,delivery_status,read_at,created_at,metadata")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  state.userNotifications = data || [];
  state.notificationStatus = `Loaded ${state.userNotifications.length} account notification${state.userNotifications.length === 1 ? "" : "s"}.`;
}

async function markNotificationRead(id) {
  state.userNotifications = state.userNotifications.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item);
  render();
  if (!state.user || !hasSupabaseConfig()) return;
  try {
    const client = await supabaseClient();
    const { error } = await client
      .from("user_notifications")
      .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", state.user.id);
    if (error) throw error;
  } catch (error) {
    state.notificationStatus = `Could not mark notification read: ${error.message}`;
    render();
  }
}

async function loadOptionalUserData(label, loader, client) {
  try {
    await withTimeout(loader(client), 4500, label);
    return { label, ok: true };
  } catch (error) {
    return { label, ok: false, message: error.message };
  }
}

async function loadUserDataFromSupabase() {
  if (!state.user || state.userDataLoading) return;
  state.userDataLoading = true;
  state.userDataStatus = "Loading user history and settings from Supabase...";
  try {
    const client = await supabaseClient();
    const results = await Promise.all([
      loadOptionalUserData("preferences", loadUserPreferences, client),
      loadOptionalUserData("billing", loadSubscriptionStatus, client),
      loadOptionalUserData("test history", loadUserTestHistory, client),
      loadOptionalUserData("analytics", loadUserPerformanceStats, client),
      loadOptionalUserData("custom blueprints", loadUserCustomBlueprints, client),
      loadOptionalUserData("paused session", loadPausedSession, client),
      loadOptionalUserData("notifications", loadUserNotifications, client),
      loadOptionalUserData("account deletion", loadAccountDeletionRequest, client)
    ]);
    syncAccountFromSubscription();
    const failed = results.filter(result => !result.ok);
    state.userDataStatus = failed.length
      ? `Signed in. Optional Supabase sync skipped: ${failed.map(result => `${result.label} (${result.message})`).join("; ")}`
      : "Loaded user history, billing, analytics, settings, and blueprints from Supabase.";
  } catch (error) {
    state.userDataStatus = `Signed in. Optional user-data sync failed: ${error.message}`;
  } finally {
    state.userDataLoading = false;
    render();
  }
}

function scheduleUserDataRefresh(user) {
  if (!user) {
    state.userDataStatus = "User history and settings are local until sign-in.";
    return;
  }
  loadUserDataFromSupabase();
}

function scheduleQuestionBankAutoLoad(user) {
  if (!user || !hasSupabaseConfig()) return;
  const key = `${user.id || user.email || "user"}:${state.supabaseConfig.url}:${state.supabaseConfig.table}`;
  if (state.questionBankAutoLoadKey === key || state.questionBankAutoLoadPromise) return;
  state.questionBankAutoLoadKey = key;
  state.supabaseStatus = "Signed in. Loading question bank from Supabase...";
  state.questionBankAutoLoadPromise = loadSupabaseBank({ background: true })
    .catch(error => {
      state.supabaseStatus = `Automatic question bank load failed: ${supabaseErrorMessage(error)}`;
      if (["dashboard", "admin", "generator", "infinite", "search"].includes(state.route)) render();
    })
    .finally(() => {
      state.questionBankAutoLoadPromise = null;
    });
}

function saveCompletedUserData(entry) {
  if (!state.user) return;
  saveUserTestHistory(entry);
  saveUserPerformanceStats();
  saveUserPreferences();
}

async function loginUser() {
  try {
    state.authStatus = "Signing in...";
    render();
    const client = await supabaseClient();
    const { data, error } = await withTimeout(client.auth.signInWithPassword({
      email: state.authForm.email.trim(),
      password: state.authForm.password
    }), 12000, "Supabase sign-in");
    if (error) throw error;
    state.user = data.user;
    scheduleUserRoleRefresh(data.user);
    state.userQuestionStatuses = {};
    mergeUserQuestionStatuses();
    state.authStatus = `Signed in as ${data.user.email}.`;
    state.questionStatusStatus = "Signed in. Question statuses will load when needed.";
    state.userDataStatus = "Signed in. Optional Supabase history/settings sync is running in the background.";
    state.questionStatusLoadedKey = "";
    scheduleUserDataRefresh(data.user);
    scheduleQuestionBankAutoLoad(data.user);
    setRoute(inviteAwareDashboardRoute());
  } catch (error) {
    state.authStatus = error.message;
    render();
  }
}

async function signupUser() {
  try {
    state.authStatus = "Creating account...";
    render();
    const client = await supabaseClient();
    const { data, error } = await withTimeout(client.auth.signUp({
      email: state.authForm.email.trim(),
      password: state.authForm.password,
      options: {
        data: { display_name: state.authForm.displayName.trim() }
      }
    }), 12000, "Supabase sign-up");
    if (error) throw error;
    state.user = data.user;
    scheduleUserRoleRefresh(data.user);
    state.userQuestionStatuses = {};
    mergeUserQuestionStatuses();
    state.authStatus = data.session
      ? `Signed in as ${data.user.email}.`
      : "Account created. Check email if confirmation is enabled.";
    state.questionStatusStatus = "Signed in. Question statuses will load when needed.";
    state.userDataStatus = "Signed in. Optional Supabase history/settings sync is running in the background.";
    state.questionStatusLoadedKey = "";
    scheduleUserDataRefresh(data.user);
    scheduleQuestionBankAutoLoad(data.user);
    setRoute("dashboard");
  } catch (error) {
    state.authStatus = error.message;
    render();
  }
}

async function loginWithGoogle() {
  return startGoogleAuth(state.route === "signup" ? "signup" : "login");
}

function recoveryRedirectUrl() {
  return appRedirectUrl("#password-reset");
}

function forgotPassword() {
  state.passwordRecovery.email = state.authForm.email.trim() || state.passwordRecovery.email;
  state.passwordRecovery.status = "Enter your account email to receive a password reset link.";
  setRoute("recovery");
}

function changePassword() {
  state.passwordRecovery.newPassword = "";
  state.passwordRecovery.confirmPassword = "";
  state.passwordRecovery.status = state.user
    ? "Enter a new password for your signed-in account."
    : "Use the email recovery link first, then enter a new password.";
  setRoute("password-reset");
}

async function sendPasswordResetEmail() {
  try {
    const email = state.passwordRecovery.email.trim();
    if (!email) throw new Error("Enter the email address for your account.");
    state.passwordRecovery.status = "Sending password reset email...";
    render();
    const client = await supabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: recoveryRedirectUrl()
    });
    if (error) throw error;
    state.passwordRecovery.status = `Password reset link sent to ${email}. Open the email link to create a new password.`;
    render();
  } catch (error) {
    state.passwordRecovery.status = error.message;
    render();
  }
}

async function updateRecoveryPassword() {
  try {
    const newPassword = state.passwordRecovery.newPassword;
    const confirmPassword = state.passwordRecovery.confirmPassword;
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
    state.passwordRecovery.status = "Updating password...";
    render();
    const client = await supabaseClient();
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    state.user = data.user || state.user;
    scheduleUserRoleRefresh(state.user);
    state.authStatus = state.user ? `Signed in as ${state.user.email}.` : "Password updated.";
    state.passwordRecovery.newPassword = "";
    state.passwordRecovery.confirmPassword = "";
    state.passwordRecovery.status = "Password updated. You can now use the new password.";
    window.history.replaceState({}, document.title, window.location.href.split("#")[0]);
    setRoute("dashboard");
  } catch (error) {
    state.passwordRecovery.status = error.message;
    render();
  }
}

async function logoutUser() {
  try {
    const client = await supabaseClient();
    await client.auth.signOut();
  } catch {}
  state.user = null;
  resetSignedOutAccountState();
  scheduleUserRoleRefresh(null);
  state.userQuestionStatuses = {};
  state.questionStatusesLoading = false;
  state.questionStatusLoadedKey = "";
  state.questionStatusLoadPromise = null;
  state.questionBankAutoLoadKey = "";
  state.questionBankAutoLoadPromise = null;
  scheduleUserDataRefresh(null);
  mergeUserQuestionStatuses();
  state.authStatus = "Signed out.";
  setRoute("landing");
}

function oauthHashParams() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.includes("access_token=")) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

function oauthErrorFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.includes("error")) return "";
  const params = new URLSearchParams(hash);
  return params.get("error_description") || params.get("error") || "";
}

function clearSensitiveAuthHash() {
  if (window.location.hash.includes("access_token=")) {
    window.history.replaceState({}, document.title, window.location.href.split("#")[0]);
  }
}

function applySignedInSession(user, statusPrefix = "Signed in as") {
  state.user = user || null;
  if (state.user) state.accountSettings.email = state.user.email || "";
  else resetSignedOutAccountState();
  scheduleUserRoleRefresh(state.user);
  state.userQuestionStatuses = {};
  mergeUserQuestionStatuses();
  state.authStatus = state.user ? `${statusPrefix} ${state.user.email}.` : "Not signed in.";
  if (state.user?.app_metadata?.providers?.includes("google")) state.accountSettings.status = "Google account is connected.";
  state.questionStatusStatus = state.user ? "Signed in. Question statuses will load when needed." : "Question statuses are local until sign-in.";
  state.userDataStatus = state.user ? "Signed in. Optional Supabase history/settings sync is running in the background." : "User history and settings are local until sign-in.";
  state.questionStatusLoadedKey = "";
  scheduleUserDataRefresh(state.user);
  scheduleQuestionBankAutoLoad(state.user);
}

function googleProviderConnected(user = state.user) {
  return Boolean(user?.app_metadata?.providers?.includes("google"));
}

async function finishGoogleLinkReturn(client) {
  const { data, error } = await withTimeout(client.auth.getUser(), 8000, "Google link verification");
  if (error) throw error;
  const user = data.user || state.user;
  if (!user) throw new Error("Google returned, but no signed-in user was found.");
  applySignedInSession(user, "Signed in as");
  clearSensitiveAuthHash();
  setGoogleLinkPending(false);
  state.accountSettings.status = googleProviderConnected(user)
    ? "Google account linked to this profile."
    : "Returned from Google, but Supabase does not show Google linked yet. Try signing out and back in, or check provider scopes.";
  state.route = "settings";
}

async function loadAuthSession() {
  try {
    const { url, anonKey } = state.supabaseConfig;
    if (!url || !anonKey) return;
    const client = await supabaseClient();
    const hashError = oauthErrorFromHash();
    if (hashError) {
      setGoogleLinkPending(false);
      clearSensitiveAuthHash();
      throw new Error(hashError);
    }
    const oauthTokens = oauthHashParams();
    if (oauthTokens) {
      if (googleLinkPending()) {
        await finishGoogleLinkReturn(client);
      } else {
        const { data: oauthData, error: oauthError } = await withTimeout(client.auth.setSession({
          access_token: oauthTokens.accessToken,
          refresh_token: oauthTokens.refreshToken
        }), 8000, "Google session restore");
        if (oauthError) throw oauthError;
        clearSensitiveAuthHash();
        applySignedInSession(oauthData.session?.user || oauthData.user, "Connected with Google as");
        if (state.user) {
          state.accountSettings.status = "Google account connected.";
          state.route = inviteAwareDashboardRoute();
        }
      }
    }
    const { data } = await withTimeout(client.auth.getSession(), 6000, "Supabase session restore");
    if (!state.user) applySignedInSession(data.session?.user || null);
    applyCheckoutReturnFromUrl();
    const recoveryRoute = applyRecoveryRouteFromUrl();
    if (state.user && !recoveryRoute && authEntryRoute()) state.route = inviteAwareDashboardRoute();
    authStateSubscription?.unsubscribe?.();
    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      applySignedInSession(session?.user || null);
      if (event === "PASSWORD_RECOVERY") {
        state.passwordRecovery.status = "Create a new password for this account.";
        state.route = "password-reset";
      } else if (state.user && authEntryRoute()) {
        state.route = inviteAwareDashboardRoute();
      }
      render();
    });
    authStateSubscription = authListener?.subscription || null;
    render();
  } catch (error) {
    state.authStatus = error.message;
    render();
  }
}

function scheduleAuthSessionRestore() {
  const restoreSession = () => loadAuthSession();
  setTimeout(restoreSession, 100);
}

async function loadSupabaseBank(options = {}) {
  const background = Boolean(options.background);
  const { url, anonKey, table } = state.supabaseConfig;
  if (!url || !anonKey || !table) {
    state.supabaseStatus = "Add a Project URL, anon key, and table name first.";
    state.supabaseImportIssues = [];
    if (!background) render();
    return;
  }

  state.supabaseStatus = "Loading all Supabase question rows...";
  state.supabaseImportIssues = [];
  if (!background) render();

  try {
    const pageSize = 1000;
    let from = 0;
    let rows = [];
    while (true) {
      const to = from + pageSize - 1;
      const endpoint = `${url.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(table)}?select=*&order=created_at.asc`;
      const response = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
          Range: `${from}-${to}`,
          Prefer: "count=exact"
        }
      });
      if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
      const page = await response.json();
      rows = rows.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    const checked = rows.map(validateSupabaseRow);
    const mapped = checked.filter(result => result.valid).map(result => result.question);
    const issues = checked.filter(result => !result.valid).map(result => result.issue);
    state.supabaseImportIssues = issues;
    state.supabaseLastLoad = {
      totalRows: rows.length,
      validRows: mapped.length,
      skippedRows: issues.length
    };
    if (!mapped.length) throw new Error(`No valid questions found. ${rows.length} rows returned, ${issues.length} skipped.`);
    state.questionBank = mapped;
    state.questionStatusLoadedKey = "";
    await loadUserQuestionStatuses();
    mergeUserQuestionStatuses();
    state.bankSource = `Supabase: ${table}`;
    state.supabaseStatus = `Connected. Loaded ${mapped.length} of ${rows.length} rows${issues.length ? `; skipped ${issues.length}.` : "."}`;
  } catch (error) {
    state.questionBank = sampleQuestions;
    state.questionStatusLoadedKey = "";
    state.bankSource = "Sample bank";
    state.supabaseLastLoad = {
      totalRows: 0,
      validRows: sampleQuestions.length,
      skippedRows: state.supabaseImportIssues.length
    };
    state.supabaseStatus = `${error.message}. Using sample questions.`;
  }
  if (!background || ["dashboard", "admin", "generator", "infinite", "search"].includes(state.route)) render();
}

function startTest(mode = "Test", options = {}) {
  const bank = activeQuestions();
  const blueprint = selectedBlueprint();
  const record = options.testIdRecord || null;
  if (!record) pruneSelectedTopicsForBlueprint(blueprint);
  const modeCount = mode === "Quiz" ? 20 : mode === "Test" ? Math.min(100, Number(state.selected.count) || 50) : Number(state.selected.count) || 50;
  const requestedCount = options.questionCount || (record ? record.questionCount : modeCount);
  const originalCount = state.selected.count;
  state.selected.count = requestedCount;
  const testRecord = record || testIdRecordFromSelection(mode);
  const shouldStoreTestId = !record && ["Test", "Quiz"].includes(mode);
  let generatedQuestions = record
    ? testIdPool(record, requestedCount)
    : shouldStoreTestId
      ? testIdPool(testRecord, requestedCount)
      : blueprintQuestionSet(bank, blueprint);
  if (record && options.randomizeOrder) {
    generatedQuestions = seededShuffle(generatedQuestions, `${record.id}:retake-random:${Date.now()}`);
  }
  state.selected.count = originalCount;
  let usedPrototypeFallback = false;
  if (!record && generatedQuestions.length === 0) {
    const activeBank = bank.filter(question => question.lifecycleState !== "Retired");
    generatedQuestions = activeBank.filter(question => !state.selected.difficulties.length || state.selected.difficulties.includes(question.difficulty));
    if (!generatedQuestions.length) generatedQuestions = activeBank;
    usedPrototypeFallback = generatedQuestions.length > 0;
    if (usedPrototypeFallback && shouldStoreTestId) {
      testRecord.category = "Mixed";
      testRecord.topics = [];
      if (!generatedQuestions.some(question => testRecord.difficulties.includes(question.difficulty))) {
        testRecord.difficulties = [];
      }
    }
  }
  const questionSet = state.hardcore.enabled || mode === "Hardcore Run"
    ? generatedQuestions.filter(q => q.difficulty !== "Easy")
    : generatedQuestions;
  if (!record && questionSet.length === 0 && generatedQuestions.length) {
    generatedQuestions = bank.filter(question => question.lifecycleState !== "Retired");
  }
  if (record && questionSet.length === 0) {
    state.testIdLookup.status = "This Test ID is valid, but no matching active questions are loaded for its category, difficulty, and topic tags.";
    setRoute("testid");
    return;
  }
  const availableQuestionSet = questionSet.length ? questionSet : generatedQuestions;
  const expandedQuestionSet = !record
    ? fillQuestionSetForPrototype(availableQuestionSet, bank, requestedCount, testRecord.id, state.hardcore.enabled || mode === "Hardcore Run")
    : availableQuestionSet;
  const finalQuestionSet = expandedQuestionSet.slice(0, Math.max(1, Number(requestedCount) || expandedQuestionSet.length || 1));
  if (shouldStoreTestId && finalQuestionSet.length < testRecord.questionCount) testRecord.questionCount = finalQuestionSet.length;
  if (shouldStoreTestId) saveTestIdRecord(testRecord);
  state.test = {
    id: testRecord.id,
    mode,
    category: testRecord.category,
    difficulty: testRecord.difficulties.join(", "),
    topics: [...testRecord.topics],
    blueprint: record ? "Test ID metadata" : blueprint?.name || "Manual tags",
    blueprintVersion: record ? "" : blueprint?.version || "",
    poolTimestamp: testRecord.poolTimestamp,
    createdAt: testRecord.createdAt,
    questions: finalQuestionSet.length ? finalQuestionSet : bank.slice(0, Math.max(1, Number(requestedCount) || 1)),
    continuous: isContinuousRunMode(mode),
    continuousBatchSize: Math.max(10, Math.min(50, Number(requestedCount) || 25)),
    continuousRounds: 0,
    timerSeconds: mode === "Quiz" ? null : options.timerSeconds !== undefined ? options.timerSeconds : selectedTimerSeconds(),
    studyMode: options.studyMode || (state.account === "premium" ? state.selected.studyMode : "Standard"),
    startedAt: Date.now(),
    elapsedSecondsBeforeStart: 0
  };
  state.answers = {};
  state.current = 0;
  state.timerHidden = false;
  state.strikeCount = 0;
  state.gradedAnswers = {};
  state.testNotice = "";
  state.testEndReason = "";
  state.generationNotice = usedPrototypeFallback
    ? `Test generated from the available question bank because the selected tags do not have enough matching questions yet.`
    : !record && ["Test", "Quiz"].includes(mode) && finalQuestionSet.length < requestedCount
    ? `Test generated with ${finalQuestionSet.length} matching question${finalQuestionSet.length === 1 ? "" : "s"} while the question bank is still being completed.`
    : "Test generated.";
  state.allowShorterGeneration = false;
  setRoute("test");
  startTimerLoop();
}

function startDemoTest() {
  stopTimerLoop();
  const demoQuestions = sampleQuestions.map(question => ({ ...question }));
  const createdAt = new Date().toISOString();
  state.test = {
    id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
    mode: "Demo Test",
    category: "Business Administration Core",
    difficulty: "Mixed",
    topics: [...new Set(demoQuestions.map(question => question.topic).filter(Boolean))],
    blueprint: "Sample demo questions",
    blueprintVersion: "Demo",
    poolTimestamp: currentPoolTimestamp(),
    createdAt,
    questions: demoQuestions,
    timerSeconds: null,
    studyMode: "Standard",
    startedAt: Date.now(),
    elapsedSecondsBeforeStart: 0
  };
  state.answers = {};
  state.current = 0;
  state.timerHidden = false;
  state.strikeCount = 0;
  state.gradedAnswers = {};
  state.testNotice = "";
  state.testEndReason = "";
  state.generationNotice = "Demo test loaded.";
  state.allowShorterGeneration = false;
  setRoute("test");
}

function generateShorterTest(mode = "Test") {
  state.allowShorterGeneration = true;
  startTest(mode);
}

function strikeLimit() {
  if (state.hardcore.strikes === "One-Strike Mode") return 1;
  if (state.hardcore.strikes === "Three-Strike Mode") return 3;
  return 2;
}

function isContinuousRunMode(mode = state.test?.mode) {
  return ["Infinite Run", "Hardcore Run"].includes(mode);
}

function isHardcoreRun() {
  return state.test?.mode === "Hardcore Run";
}

function testDifficultyList(test = state.test) {
  return String(test?.difficulty || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function continuousQuestionPool() {
  if (!state.test) return [];
  const difficultiesForRun = testDifficultyList();
  const topicsForRun = state.test.topics || [];
  const filtered = activeQuestions()
    .filter(question => question.lifecycleState !== "Retired")
    .filter(question => !state.test.category || questionMatchesCategory(question, state.test.category))
    .filter(question => !difficultiesForRun.length || difficultiesForRun.includes(question.difficulty))
    .filter(question => !topicsForRun.length || topicsForRun.every(topic => questionMatchesTopic(question, topic)))
    .filter(question => !isHardcoreRun() || question.difficulty !== "Easy");
  return filtered.length
    ? filtered
    : activeQuestions().filter(question => question.lifecycleState !== "Retired" && (!isHardcoreRun() || question.difficulty !== "Easy"));
}

function appendContinuousQuestions(minimum = 20) {
  if (!state.test || !isContinuousRunMode() || !minimum) return 0;
  const pool = continuousQuestionPool();
  if (!pool.length) return 0;
  const existingKeys = new Set(state.test.questions.map(questionKey));
  let appended = [];
  let round = Number(state.test.continuousRounds || 0);
  while (appended.length < minimum && round < Number(state.test.continuousRounds || 0) + 5) {
    const shuffled = seededShuffle(pool, `${state.test.id}:continuous:${round}`);
    const fresh = shuffled.filter(question => !existingKeys.has(questionKey(question)));
    const source = fresh.length ? fresh : shuffled;
    source.forEach(question => {
      if (appended.length >= minimum) return;
      appended.push(question);
      existingKeys.add(questionKey(question));
    });
    round += 1;
    if (!source.length) break;
  }
  state.test.continuousRounds = round;
  state.test.questions.push(...appended);
  return appended.length;
}

function scoredQuestions() {
  if (!state.test) return [];
  if (!isContinuousRunMode()) return state.test.questions;
  const lastVisitedIndex = Math.min(state.current, state.test.questions.length - 1);
  return state.test.questions.slice(0, lastVisitedIndex + 1);
}

function selectAnswer(questionIndex, answer) {
  state.answers[questionIndex] = answer;
  state.testNotice = "";
  render();
}

function toggleReportForm() {
  state.reportFormOpen = !state.reportFormOpen;
  if (!state.reportFormOpen) state.reportComments = "";
  render();
}

function gradeHardcoreAnswer(questionIndex) {
  if (!isHardcoreRun() || state.gradedAnswers[questionIndex]) return true;
  const answer = state.answers[questionIndex];
  if (!answer) {
    state.testNotice = "Select an answer before continuing in Hardcore Mode.";
    render();
    return false;
  }
  const question = state.test.questions[questionIndex];
  if (answer !== question.answer) state.strikeCount += 1;
  state.gradedAnswers[questionIndex] = true;
  if (state.strikeCount >= strikeLimit()) {
    state.testEndReason = `Hardcore run ended at ${state.strikeCount}/${strikeLimit()} strikes.`;
    completeTest();
    return false;
  }
  state.testNotice = "";
  return true;
}

function nextQuestion() {
  if (!gradeHardcoreAnswer(state.current)) return;
  if (isContinuousRunMode() && state.current >= state.test.questions.length - 2) {
    appendContinuousQuestions(state.test.continuousBatchSize || 20);
  }
  state.current += 1;
  state.reportFormOpen = false;
  state.reportComments = "";
  render();
}

function submitCurrentTest() {
  if (!gradeHardcoreAnswer(state.current)) return;
  completeTest();
}

function completeTest() {
  stopTimerLoop();
  if (state.test) {
    state.test.completedAt = Date.now();
    state.test.elapsedSeconds = testElapsedSeconds(state.test);
  }
  recordCompletedTest();
  clearPausedSession();
  setRoute("results");
}

function score() {
  if (!state.test) return { correct: 0, total: 0, percent: 0, unsure: 0 };
  const questionsForScore = scoredQuestions();
  const total = questionsForScore.length;
  let correct = 0;
  let unsure = 0;
  questionsForScore.forEach((q, i) => {
    const given = state.answers[i];
    if (given === "IDK") unsure++;
    if (given === q.answer) correct++;
  });
  return { correct, total, unsure, percent: total ? Math.round((correct / total) * 100) : 0 };
}

function isDiagnosticTest(test = state.test) {
  return String(test?.mode || "").toLowerCase().includes("diagnostic");
}

function questionAnalyticsTopics(question) {
  return [...new Set([question.topic, ...(question.tags || [])].filter(Boolean).map(normalizeTopicName))];
}

function questionTopicTagsForResults(question) {
  const allowed = new Set(allTopicTags());
  const tags = questionAnalyticsTopics(question).filter(topic => allowed.has(topic));
  return tags.length ? tags : [normalizeTopicName(question.topic || question.category || "Untagged")];
}

function optionTextForAnswer(question, answer) {
  const letter = normalizeCorrectOptionId(answer);
  const index = "ABCD".indexOf(letter);
  if (index < 0 || !Array.isArray(question.options)) return "";
  const option = question.options[index];
  if (option && typeof option === "object") return option.text || option.value || "";
  return String(option || "");
}

function completedQuestionReviewItems() {
  const questions = state.test ? scoredQuestions() : sampleQuestions;
  const items = questions.map((question, index) => {
    const submitted = state.answers[index] || "";
    const correct = submitted === question.answer;
    return {
      question,
      originalIndex: index,
      submitted,
      correct,
      missed: !submitted || submitted === "IDK" || !correct
    };
  });
  if (!isDiagnosticTest()) return items;
  return items.sort((a, b) => Number(b.missed) - Number(a.missed) || a.originalIndex - b.originalIndex);
}

function currentTestTopicStats() {
  if (!state.test) return [];
  const stats = new Map();
  scoredQuestions().forEach((question, index) => {
    const submitted = state.answers[index];
    const correct = submitted === question.answer;
    questionTopicTagsForResults(question).forEach(topic => {
      const row = stats.get(topic) || { topic, correct: 0, total: 0 };
      row.total += 1;
      if (correct) row.correct += 1;
      stats.set(topic, row);
    });
  });
  return [...stats.values()].sort((a, b) => {
    const ap = a.total ? a.correct / a.total : 0;
    const bp = b.total ? b.correct / b.total : 0;
    return ap - bp || b.total - a.total || a.topic.localeCompare(b.topic);
  });
}

function questionKey(question) {
  return String(question.id || question.text || "").trim();
}

function updateQuestionAttemptStatus(question, answer) {
  const key = questionKey(question);
  const nextStatus = !answer || answer === "IDK"
    ? "Seen"
    : answer === question.answer
      ? "Answered correctly"
      : "Answered incorrectly";
  const touched = new Set();
  question.status = nextStatus;
  question.seenCount = Number(question.seenCount || 0) + 1;
  touched.add(question);
  activeQuestions().forEach(bankQuestion => {
    if (questionKey(bankQuestion) === key && !touched.has(bankQuestion)) {
      bankQuestion.status = nextStatus;
      bankQuestion.seenCount = Number(bankQuestion.seenCount || 0) + 1;
      touched.add(bankQuestion);
    }
  });
  if (!state.user || !isUuid(question.id)) return null;
  return {
    user_id: state.user.id,
    question_id: question.id,
    status: nextStatus,
    seen_count: Number(question.seenCount || 1),
    last_seen_at: new Date().toISOString()
  };
}

function recordCompletedTest() {
  if (!state.test || state.completedTestIds.includes(state.test.id)) return;
  const s = score();
  const questionsForRecord = scoredQuestions();
  state.completedTestIds.push(state.test.id);
  const completedEntry = {
    id: state.test.id,
    mode: state.test.mode,
    date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    completedAt: new Date().toISOString(),
    elapsedSeconds: testElapsedSeconds(),
    correct: s.correct,
    total: s.total,
    percent: s.percent,
    topics: [...state.test.topics],
    category: state.test.category,
    difficulty: state.test.difficulty,
    blueprint: state.test.blueprint,
    questionCount: questionsForRecord.length,
    testEndReason: state.testEndReason
  };
  state.scoreHistory.push(completedEntry);
  const statusRows = [];
  questionsForRecord.forEach((question, index) => {
    const answer = state.answers[index];
    const isCorrect = answer === question.answer;
    const isUnsure = answer === "IDK";
    const statusRow = updateQuestionAttemptStatus(question, answer);
    if (statusRow) statusRows.push(statusRow);
    let difficultyStat = state.difficultyStats.find(item => item.difficulty === question.difficulty);
    if (!difficultyStat) {
      difficultyStat = { difficulty: question.difficulty || "Unknown", correct: 0, total: 0 };
      state.difficultyStats.push(difficultyStat);
    }
    difficultyStat.total += 1;
    if (isCorrect) difficultyStat.correct += 1;
    questionAnalyticsTopics(question).forEach(topic => {
      let stat = state.topicStats.find(item => item.topic === topic);
      if (!stat) {
        stat = { topic, correct: 0, total: 0 };
        state.topicStats.push(stat);
      }
      stat.total += 1;
      if (isCorrect) stat.correct += 1;
      let confidenceStat = state.confidenceStats.find(item => item.topic === topic);
      if (!confidenceStat) {
        confidenceStat = { topic, unsure: 0, total: 0 };
        state.confidenceStats.push(confidenceStat);
      }
      confidenceStat.total += 1;
      if (isUnsure) confidenceStat.unsure += 1;
    });
  });
  upsertUserQuestionStatuses(statusRows);
  saveCompletedUserData(completedEntry);
}

function persistTeamAccounts() {
  localStorage.setItem("lift-team-accounts", JSON.stringify(state.teamAccounts));
}

function localTeamId(prefix = "TEAM") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function teamInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function teamInviteLink(token) {
  return appRedirectUrl(`#team-invite=${encodeURIComponent(token)}`);
}

function findLocalTeamInviteByToken(token) {
  return state.teamAccounts.invites.find(invite => invite.token === token || invite.link === teamInviteLink(token)) || null;
}

function teamInvites(teamId = selectedTeam()?.id) {
  return state.teamAccounts.invites.filter(invite => invite.team_id === teamId);
}

function inviteAwareDashboardRoute() {
  return state.teamAccounts.acceptingInviteToken ? "team-invite" : "dashboard";
}

function selectedTeam() {
  return state.teamAccounts.teams.find(team => team.id === state.teamAccounts.selectedTeamId)
    || state.teamAccounts.teams[0]
    || null;
}

function setSelectedTeam(teamId) {
  state.teamAccounts.selectedTeamId = teamId;
  persistTeamAccounts();
  render();
}

function teamMemberships(teamId = selectedTeam()?.id) {
  return state.teamAccounts.memberships.filter(member => member.team_id === teamId);
}

function teamAssignments(teamId = selectedTeam()?.id) {
  return state.teamAccounts.assignments.filter(assignment => assignment.team_id === teamId);
}

function teamAssignmentRecipients(assignmentId) {
  return state.teamAccounts.assignmentRecipients.filter(recipient => recipient.assignment_id === assignmentId);
}

function teamStudents(teamId = selectedTeam()?.id) {
  return teamMemberships(teamId).filter(member =>
    member.role === "student" && !["removed", "suspended"].includes(member.status || "")
  );
}

function selectedAssignmentRecipientIds(teamId = selectedTeam()?.id) {
  const availableIds = new Set(teamStudents(teamId).map(member => member.id));
  return (state.teamAccounts.assignmentForm.recipientIds || []).filter(id => availableIds.has(id));
}

function toggleAssignmentRecipient(membershipId) {
  const selected = new Set(state.teamAccounts.assignmentForm.recipientIds || []);
  if (selected.has(membershipId)) selected.delete(membershipId);
  else selected.add(membershipId);
  state.teamAccounts.assignmentForm.recipientIds = [...selected];
  persistTeamAccounts();
  render();
}

function selectAllAssignmentRecipients() {
  state.teamAccounts.assignmentForm.recipientIds = teamStudents().map(member => member.id);
  persistTeamAccounts();
  render();
}

function currentTeamActorRole(teamId = selectedTeam()?.id) {
  const userId = state.user?.id || "";
  const userEmail = state.user?.email || "";
  const membership = teamMemberships(teamId).find(member =>
    (userId && member.user_id === userId) || (userEmail && member.email === userEmail)
  );
  return membership?.role || "";
}

function canManageSelectedTeam() {
  return ["team_admin", "co_admin"].includes(currentTeamActorRole()) || isAdminRole();
}

function normalizeTeamRoleLabel(role, label) {
  const clean = String(label || "").trim();
  if (clean) return clean;
  if (role === "team_admin") return "Administrator";
  if (role === "co_admin") return "Co-Administrator";
  return "Student";
}

function createTeamAccountLocal(teamData = {}) {
  const now = new Date().toISOString();
  const team = {
    id: teamData.id || localTeamId("TEAM"),
    name: teamData.name,
    status: teamData.status || "active",
    created_by: teamData.created_by || state.user?.id || null,
    billing_owner_user_id: teamData.billing_owner_user_id || state.user?.id || null,
    created_at: teamData.created_at || now,
    updated_at: teamData.updated_at || now,
    localOnly: Boolean(teamData.localOnly)
  };
  const adminMembership = {
    id: teamData.membershipId || localTeamId("MEM"),
    team_id: team.id,
    user_id: state.user?.id || null,
    email: state.user?.email || state.authForm.email || "",
    display_name: profileDisplayName(),
    role: "team_admin",
    role_label: "Administrator",
    status: "active",
    created_at: now,
    updated_at: now,
    localOnly: Boolean(teamData.localOnly)
  };
  state.teamAccounts.teams = [team, ...state.teamAccounts.teams.filter(item => item.id !== team.id)];
  if (!state.teamAccounts.memberships.some(member => member.team_id === team.id && member.role === "team_admin")) {
    state.teamAccounts.memberships.unshift(adminMembership);
  }
  state.teamAccounts.selectedTeamId = team.id;
  persistTeamAccounts();
  return team;
}

async function refreshTeamAccountsFromSupabase() {
  if (!state.user) {
    state.teamAccounts.status = "Sign in to load team accounts from Supabase.";
    render();
    return;
  }
  try {
    const client = await supabaseClient();
    const { data: teams, error: teamsError } = await client
      .from("teams")
      .select("id,name,status,billing_owner_user_id,created_by,created_at,updated_at")
      .order("updated_at", { ascending: false });
    if (teamsError) throw teamsError;
    const teamIds = (teams || []).map(team => team.id);
    let memberships = [];
    let assignments = [];
    let assignmentRecipients = [];
    let invites = [];
    if (teamIds.length) {
      const { data: memberRows, error: memberError } = await client
        .from("team_memberships")
        .select("id,team_id,user_id,email,display_name,role,role_label,status,created_at,updated_at")
        .in("team_id", teamIds);
      if (memberError) throw memberError;
      memberships = memberRows || [];
      const { data: assignmentRows, error: assignmentError } = await client
        .from("team_assignments")
        .select("id,team_id,title,description,assignment_type,test_id,blueprint_snapshot,assignment_settings,due_at,attempt_limit,status,created_by,created_at,updated_at")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false });
      if (assignmentError) throw assignmentError;
      assignments = assignmentRows || [];
      const assignmentIds = assignments.map(assignment => assignment.id);
      if (assignmentIds.length) {
        const { data: recipientRows, error: recipientError } = await client
          .from("team_assignment_recipients")
          .select("id,assignment_id,membership_id,status,assigned_by,assigned_at,completed_at")
          .in("assignment_id", assignmentIds);
        if (recipientError) throw recipientError;
        assignmentRecipients = recipientRows || [];
      }
      let { data: inviteRows, error: inviteError } = await client
        .from("team_invites")
        .select("id,team_id,email,role,role_label,status,created_by,accepted_by,expires_at,accepted_at,email_sent_at,send_count,last_send_error,created_at,updated_at")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false });
      if (inviteError?.code === "42703") {
        ({ data: inviteRows, error: inviteError } = await client
          .from("team_invites")
          .select("id,team_id,email,role,role_label,status,created_by,accepted_by,expires_at,accepted_at,created_at,updated_at")
          .in("team_id", teamIds)
          .order("created_at", { ascending: false }));
      }
      if (inviteError) throw inviteError;
      invites = inviteRows || [];
    }
    state.teamAccounts.teams = teams || [];
    state.teamAccounts.memberships = memberships;
    state.teamAccounts.assignments = assignments;
    state.teamAccounts.assignmentRecipients = [
      ...state.teamAccounts.assignmentRecipients.filter(recipient => recipient.localOnly && !assignments.some(assignment => assignment.id === recipient.assignment_id)),
      ...assignmentRecipients
    ];
    const existingInvites = state.teamAccounts.invites;
    state.teamAccounts.invites = [
      ...existingInvites.filter(invite => invite.localOnly && !teamIds.includes(invite.team_id)),
      ...invites.map(invite => {
        const existing = existingInvites.find(item => item.id === invite.id);
        return existing?.link ? { ...invite, token: existing.token, link: existing.link } : invite;
      })
    ];
    if (!state.teamAccounts.selectedTeamId && state.teamAccounts.teams.length) state.teamAccounts.selectedTeamId = state.teamAccounts.teams[0].id;
    if (state.teamAccounts.selectedTeamId && !state.teamAccounts.teams.some(team => team.id === state.teamAccounts.selectedTeamId)) {
      state.teamAccounts.selectedTeamId = state.teamAccounts.teams[0]?.id || "";
    }
    state.teamAccounts.status = `Loaded ${state.teamAccounts.teams.length} team account${state.teamAccounts.teams.length === 1 ? "" : "s"} from Supabase.`;
    persistTeamAccounts();
  } catch (error) {
    state.teamAccounts.status = `Could not load team accounts: ${supabaseErrorMessage(error)}`;
  }
  render();
}

async function createTeamAccount() {
  const name = state.teamAccounts.form.name.trim();
  if (!name) {
    state.teamAccounts.status = "Enter a team account name.";
    render();
    return;
  }
  state.teamAccounts.status = "Creating team account...";
  render();
  if (state.user && hasSupabaseConfig()) {
    try {
      const client = await supabaseClient();
      const { data: team, error } = await client
        .from("teams")
        .insert({
          name,
          billing_owner_user_id: state.user.id,
          created_by: state.user.id,
          status: "active"
        })
        .select("id,name,status,billing_owner_user_id,created_by,created_at,updated_at")
        .single();
      if (error) throw error;
      const { data: membership, error: memberError } = await client
        .from("team_memberships")
        .insert({
          team_id: team.id,
          user_id: state.user.id,
          email: state.user.email,
          display_name: profileDisplayName(),
          role: "team_admin",
          role_label: "Administrator",
          status: "active",
          created_by: state.user.id
        })
        .select("id")
        .single();
      if (memberError) throw memberError;
      createTeamAccountLocal({ ...team, membershipId: membership.id });
      state.teamAccounts.status = `Created ${team.name} in Supabase.`;
    } catch (error) {
      const team = createTeamAccountLocal({ name, localOnly: true });
      state.teamAccounts.status = `Created ${team.name} locally. Supabase create failed: ${supabaseErrorMessage(error)}`;
    }
  } else {
    const team = createTeamAccountLocal({ name, localOnly: true });
    state.teamAccounts.status = `Created ${team.name} locally. Sign in and connect Supabase for shared team storage.`;
  }
  persistTeamAccounts();
  render();
}

async function addTeamMember() {
  const team = selectedTeam();
  if (!team) {
    state.teamAccounts.status = "Create or select a team before adding members.";
    render();
    return;
  }
  if (!canManageSelectedTeam()) {
    state.teamAccounts.status = "Only team administrators and co-administrators can add members.";
    render();
    return;
  }
  const email = state.teamAccounts.memberForm.email.trim().toLowerCase();
  if (!email) {
    state.teamAccounts.status = "Enter the member email.";
    render();
    return;
  }
  const role = state.teamAccounts.memberForm.role;
  const roleLabel = normalizeTeamRoleLabel(role, state.teamAccounts.memberForm.roleLabel);
  const token = teamInviteToken();
  const invite = {
    id: localTeamId("INV"),
    team_id: team.id,
    email,
    role,
    role_label: roleLabel,
    token,
    link: teamInviteLink(token),
    status: "pending",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: state.user?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    localOnly: true
  };
  const member = {
    id: localTeamId("MEM"),
    team_id: team.id,
    user_id: null,
    email,
    display_name: state.teamAccounts.memberForm.displayName.trim() || email.split("@")[0],
    role,
    role_label: roleLabel,
    status: "invited",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    localOnly: true
  };
  state.teamAccounts.memberships = [member, ...state.teamAccounts.memberships.filter(item => !(item.team_id === team.id && item.email === email))];
  state.teamAccounts.invites = [invite, ...state.teamAccounts.invites.filter(item => !(item.team_id === team.id && item.email === email && item.status === "pending"))];
  state.teamAccounts.memberForm.email = "";
  state.teamAccounts.memberForm.displayName = "";
  state.teamAccounts.status = `Created invite for ${member.display_name} as ${roleLabel}. Copy the invite link below.`;
  persistTeamAccounts();
  render();
  if (state.user && hasSupabaseConfig() && isUuid(team.id)) {
    try {
      const client = await supabaseClient();
      const { data, error } = await client
        .from("team_memberships")
        .insert({
          team_id: team.id,
          email,
          display_name: member.display_name,
          role,
          role_label: roleLabel,
          status: "invited",
          created_by: state.user.id
        })
        .select("id,created_at,updated_at")
        .single();
      if (error) throw error;
      const tokenHash = await sha256Hex(token);
      const { data: inviteRow, error: inviteError } = await client
        .from("team_invites")
        .insert({
          team_id: team.id,
          email,
          role,
          role_label: roleLabel,
          token_hash: tokenHash,
          status: "pending",
          created_by: state.user.id,
          expires_at: invite.expires_at
        })
        .select("id,status,created_at,updated_at,expires_at")
        .single();
      if (inviteError) throw inviteError;
      state.teamAccounts.memberships = state.teamAccounts.memberships.map(item => item.id === member.id ? { ...item, ...data, localOnly: false } : item);
      state.teamAccounts.invites = state.teamAccounts.invites.map(item => item.id === invite.id ? { ...item, ...inviteRow, token, link: invite.link, localOnly: false } : item);
      state.teamAccounts.status = `Invite created for ${member.display_name} in Supabase. Copy the invite link below.`;
      persistTeamAccounts();
      render();
      await sendTeamInviteEmail(inviteRow.id, { auto: true });
    } catch (error) {
      state.teamAccounts.status = `Invite saved locally. Supabase invite failed: ${supabaseErrorMessage(error)}`;
      render();
    }
  }
}

function copyTeamInviteLink(link) {
  if (!link) {
    state.teamAccounts.status = "This loaded invite does not have a raw token link available. Create a new invite to generate a copyable link.";
    render();
    return;
  }
  navigator.clipboard?.writeText(link);
  state.teamAccounts.status = "Invite link copied.";
  render();
}

function teamInviteEmailSubject(invite) {
  const team = state.teamAccounts.teams.find(item => item.id === invite.team_id);
  return `You're invited to ${team?.name || "a Lift Off Exams team"}`;
}

function teamInviteEmailBody(invite) {
  const team = state.teamAccounts.teams.find(item => item.id === invite.team_id);
  return [
    `You have been invited to join ${team?.name || "a Lift Off Exams team"} as ${invite.role_label || "Student"}.`,
    "",
    "Open this invite link to accept:",
    invite.link || "",
    "",
    "Lift Off Exams"
  ].join("\n");
}

function openTeamInviteEmailDraft(inviteId) {
  const invite = state.teamAccounts.invites.find(item => item.id === inviteId);
  if (!invite?.link) {
    state.teamAccounts.status = "This invite does not have a raw link available. Create a new invite before emailing it.";
    render();
    return;
  }
  const href = `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(teamInviteEmailSubject(invite))}&body=${encodeURIComponent(teamInviteEmailBody(invite))}`;
  window.location.href = href;
  state.teamAccounts.status = "Opened an email draft with the invite link.";
  render();
}

async function sendTeamInviteEmail(inviteId, options = {}) {
  const invite = state.teamAccounts.invites.find(item => item.id === inviteId);
  if (!invite) {
    state.teamAccounts.status = "Invite record was not found.";
    render();
    return;
  }
  if (!invite.link) {
    state.teamAccounts.status = "This loaded invite cannot be emailed because the raw token link is unavailable. Reinvite the user to generate a new link.";
    render();
    return;
  }
  if (!hasSupabaseConfig() || !isUuid(invite.id)) {
    if (!options.auto) openTeamInviteEmailDraft(invite.id);
    else {
      state.teamAccounts.status = "Invite created locally. Copy the link or connect Supabase to send email.";
      render();
    }
    return;
  }
  state.teamAccounts.status = `Sending invite email to ${invite.email}...`;
  render();
  try {
    const result = await invokeSupabaseFunction("send-team-invite", {
      invite_id: invite.id,
      invite_link: invite.link,
      app_url: appRedirectUrl()
    }, "Your login session has expired. Sign in again before sending team invites.");
    const now = result.email_sent_at || new Date().toISOString();
    state.teamAccounts.invites = state.teamAccounts.invites.map(item =>
      item.id === invite.id
        ? { ...item, email_sent_at: now, send_count: Number(item.send_count || 0) + 1, last_send_error: "" }
        : item
    );
    state.teamAccounts.status = `Invite email sent to ${invite.email}.`;
    persistTeamAccounts();
  } catch (error) {
    state.teamAccounts.invites = state.teamAccounts.invites.map(item =>
      item.id === invite.id ? { ...item, last_send_error: supabaseErrorMessage(error) } : item
    );
    state.teamAccounts.status = `Invite link works, but email sending failed: ${supabaseErrorMessage(error)}. Deploy send-team-invite or copy the link manually.`;
  }
  render();
}

async function acceptTeamInvite() {
  const token = state.teamAccounts.acceptingInviteToken;
  if (!token) {
    state.teamAccounts.inviteStatus = "No invite token was found in this link.";
    render();
    return;
  }
  if (!state.user) {
    state.authStatus = "Sign in or create an account before accepting this team invite.";
    state.route = "login";
    render();
    return;
  }
  state.teamAccounts.inviteStatus = "Accepting team invitation...";
  render();
  if (hasSupabaseConfig()) {
    try {
      const client = await supabaseClient();
      const { data, error } = await client.rpc("accept_team_invite", {
        p_token_hash: await sha256Hex(token)
      });
      if (error) throw error;
      const accepted = Array.isArray(data) ? data[0] : data;
      state.teamAccounts.inviteStatus = "Invitation accepted. Loading team account...";
      if (accepted?.team_id) state.teamAccounts.selectedTeamId = accepted.team_id;
      window.history.replaceState({}, document.title, window.location.href.split("#")[0]);
      state.teamAccounts.acceptingInviteToken = "";
      await refreshTeamAccountsFromSupabase();
      state.route = "teams";
      render();
      return;
    } catch (error) {
      state.teamAccounts.inviteStatus = `Supabase invite acceptance failed: ${supabaseErrorMessage(error)}`;
    }
  }
  const localInvite = findLocalTeamInviteByToken(token);
  if (!localInvite) {
    render();
    return;
  }
  const now = new Date().toISOString();
  localInvite.status = "accepted";
  localInvite.accepted_by = state.user.id;
  localInvite.accepted_at = now;
  localInvite.updated_at = now;
  state.teamAccounts.memberships = state.teamAccounts.memberships.map(member =>
    member.team_id === localInvite.team_id && member.email === localInvite.email
      ? { ...member, user_id: state.user.id, status: "active", updated_at: now }
      : member
  );
  state.teamAccounts.selectedTeamId = localInvite.team_id;
  state.teamAccounts.acceptingInviteToken = "";
  state.teamAccounts.status = "Team invitation accepted locally.";
  state.teamAccounts.inviteStatus = "Team invitation accepted.";
  persistTeamAccounts();
  window.history.replaceState({}, document.title, window.location.href.split("#")[0]);
  setRoute("teams");
}

async function createTeamAssignment() {
  const team = selectedTeam();
  if (!team) {
    state.teamAccounts.status = "Create or select a team before creating assignments.";
    render();
    return;
  }
  if (!canManageSelectedTeam()) {
    state.teamAccounts.status = "Only team administrators and co-administrators can create assignments.";
    render();
    return;
  }
  const title = state.teamAccounts.assignmentForm.title.trim();
  if (!title) {
    state.teamAccounts.status = "Enter an assignment title.";
    render();
    return;
  }
  const recipientIds = selectedAssignmentRecipientIds(team.id);
  if (!recipientIds.length) {
    state.teamAccounts.status = "Select at least one student recipient before creating an assignment.";
    render();
    return;
  }
  const blueprint = selectedBlueprint() || currentOnboardingBlueprint();
  const assignment = {
    id: localTeamId("ASN"),
    team_id: team.id,
    title,
    description: "Baseline team assignment",
    assignment_type: state.teamAccounts.assignmentForm.testId.trim() ? "test_id" : "blueprint_snapshot",
    test_id: state.teamAccounts.assignmentForm.testId.trim().toUpperCase() || null,
    blueprint_snapshot: blueprint ? {
      name: blueprint.name,
      category: blueprint.category,
      level: blueprint.level,
      distribution: blueprint.distribution,
      totalQuestions: blueprint.totalQuestions
    } : null,
    assignment_settings: {
      questionCount: onboardingQuestionCount(),
      timer: state.selected.timer,
      studyMode: state.selected.studyMode,
      lockedSettings: ["category", "difficulty", "topicTags"]
    },
    due_at: state.teamAccounts.assignmentForm.dueDate || null,
    attempt_limit: Math.max(1, Number(state.teamAccounts.assignmentForm.attemptLimit) || 1),
    status: "assigned",
    created_by: state.user?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    localOnly: true
  };
  const recipientRows = recipientIds.map(membershipId => ({
    id: localTeamId("REC"),
    assignment_id: assignment.id,
    membership_id: membershipId,
    status: "not_started",
    assigned_by: state.user?.id || null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    localOnly: true
  }));
  state.teamAccounts.assignments.unshift(assignment);
  state.teamAccounts.assignmentRecipients = [...recipientRows, ...state.teamAccounts.assignmentRecipients];
  state.teamAccounts.assignmentForm.recipientIds = [];
  state.teamAccounts.status = `Created assignment: ${assignment.title} for ${recipientRows.length} student${recipientRows.length === 1 ? "" : "s"}.`;
  persistTeamAccounts();
  render();
  if (state.user && hasSupabaseConfig() && isUuid(team.id)) {
    try {
      const client = await supabaseClient();
      const { data, error } = await client
        .from("team_assignments")
        .insert({
          team_id: team.id,
          title: assignment.title,
          description: assignment.description,
          assignment_type: assignment.assignment_type,
          test_id: assignment.test_id,
          blueprint_snapshot: assignment.blueprint_snapshot,
          assignment_settings: assignment.assignment_settings,
          due_at: assignment.due_at,
          attempt_limit: assignment.attempt_limit,
          status: assignment.status,
          created_by: state.user.id
        })
        .select("id,created_at,updated_at")
        .single();
      if (error) throw error;
      const supabaseRecipientIds = recipientIds.filter(id => isUuid(id));
      let savedRecipients = [];
      if (supabaseRecipientIds.length) {
        const { data: recipientData, error: recipientError } = await client
          .from("team_assignment_recipients")
          .insert(supabaseRecipientIds.map(membershipId => ({
            assignment_id: data.id,
            membership_id: membershipId,
            status: "not_started",
            assigned_by: state.user.id
          })))
          .select("id,assignment_id,membership_id,status,assigned_by,assigned_at,completed_at");
        if (recipientError) throw recipientError;
        savedRecipients = recipientData || [];
      }
      state.teamAccounts.assignments = state.teamAccounts.assignments.map(item => item.id === assignment.id ? { ...item, ...data, localOnly: false } : item);
      state.teamAccounts.assignmentRecipients = [
        ...state.teamAccounts.assignmentRecipients.filter(item => item.assignment_id !== assignment.id),
        ...recipientRows.map(row => {
          const saved = savedRecipients.find(item => item.membership_id === row.membership_id);
          return saved ? saved : { ...row, assignment_id: data.id };
        })
      ];
      const skipped = recipientIds.length - savedRecipients.length;
      state.teamAccounts.status = skipped > 0
        ? `Created ${assignment.title} in Supabase. ${skipped} local recipient${skipped === 1 ? "" : "s"} will sync after membership records exist in Supabase.`
        : `Created and assigned ${assignment.title} in Supabase.`;
      persistTeamAccounts();
      render();
    } catch (error) {
      state.teamAccounts.status = `Assignment saved locally. Supabase create failed: ${supabaseErrorMessage(error)}`;
      render();
    }
  }
}

function teamInviteAcceptancePage() {
  const token = state.teamAccounts.acceptingInviteToken;
  const localInvite = token ? findLocalTeamInviteByToken(token) : null;
  const localTeam = localInvite ? state.teamAccounts.teams.find(team => team.id === localInvite.team_id) : null;
  app.innerHTML = `
    <section class="hero">
      <div class="card panel" style="width:min(620px,100%);">
        <div class="brand">${logoMarkup()}</div>
        <h1 class="page-title">Team Invitation</h1>
        <p class="muted">Join a Lift Off Exams team account to receive assigned practice and shared progress tracking.</p>
        <div class="notice" style="margin:14px 0;">${escapeHtml(state.teamAccounts.inviteStatus)}</div>
        <table class="table compact-table">
          <tr><th>Team</th><td>${escapeHtml(localTeam?.name || "Supabase team invite")}</td></tr>
          <tr><th>Email</th><td>${escapeHtml(localInvite?.email || state.user?.email || "Sign in with the invited email")}</td></tr>
          <tr><th>Role</th><td>${escapeHtml(localInvite?.role_label || "Assigned by team administrator")}</td></tr>
          <tr><th>Status</th><td><span class="status ${localInvite?.status === "accepted" ? "good" : "gold"}">${escapeHtml(localInvite?.status || "pending")}</span></td></tr>
        </table>
        <div class="actions" style="margin-top:16px;">
          ${state.user ? `<button class="button primary" onclick="acceptTeamInvite()">Accept Invitation</button>` : `
            <button class="button primary" onclick="setRoute('login')">Log In To Accept</button>
            <button class="button" onclick="setRoute('signup')">Create Account</button>
          `}
          <button class="button" onclick="setRoute('${state.user ? "teams" : "landing"}')">${state.user ? "Open Teams" : "Back"}</button>
        </div>
      </div>
    </section>
  `;
}

function layout(title, content) {
  const navItems = [
    ["dashboard", "Dashboard"],
    ["practice-setup", "Practice Setup"],
    ["teams", "Teams"],
    ["generator", "Generate"],
    ["infinite", "Infinite"],
    ["analytics", "Analytics"],
    ["history", "History"],
    ["search", "Search"],
    ["exports", "Exports"],
    ["settings", "Settings"],
    ["recovery", "Recovery"],
    ...(isAdminRole() ? [["admin", "Admin"]] : [])
  ];
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">${logoMarkup()}</div>
        <nav class="nav" aria-label="Primary">
          ${navItems.map(([route, label]) => `<button class="${state.route === route ? "active" : ""}" onclick="setRoute('${route}')">${label}</button>`).join("")}
        </nav>
        <div class="account-strip">
          <div class="split"><strong>${escapeHtml(profileDisplayName())}</strong>${state.user ? `<button class="chip" onclick="logoutUser()">Log Out</button>` : `<button class="chip" onclick="setMembershipTier(state.account === 'premium' ? 'free' : 'premium')">Switch</button>`}</div>
          ${state.user?.email ? `<p class="muted">${escapeHtml(state.user.email)}</p>` : ""}
          <p><span class="status ${isOwnerRole() ? "good" : isAdminRole() ? "gold" : "info"}">${roleLabel()}</span></p>
          <p class="muted">${escapeHtml(state.authStatus)}</p>
          <p class="muted">${escapeHtml(state.roleStatus)}</p>
          <p class="muted">Weekly reset: Monday 12:00 AM</p>
          ${state.resumeAvailable ? `<button class="chip selected" onclick="resumePausedSession()">Resume saved session</button>` : ""}
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div><h1 class="page-title">${title}</h1><p class="muted">Seeded DECA practice with reproducible Test IDs.</p></div>
          <div class="toolbar">
            <button class="button" onclick="setRoute('landing')">Home</button>
            <button class="button" onclick="toggleTheme()">${state.theme === "dark" ? "Light" : "Dark"}</button>
          </div>
        </div>
        ${content}
      </main>
    </div>
  `;
}

function landing() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <div class="brand">${logoMarkup()}</div>
        <h1>Lift Off Exams</h1>
        <p class="tagline">Learn Smarter, Not Harder</p>
        <div class="hero-actions">
          <button type="button" class="button primary" data-action="demo-test" onclick="event.preventDefault(); event.stopPropagation(); startDemoTest();">Take Demo Test</button>
          <button type="button" class="button" data-action="signup">Sign Up</button>
          <button type="button" class="button" data-action="login">Log In</button>
        </div>
      </div>
    </section>
  `;
}

function auth(kind) {
  const fileModeNotice = isFileMode()
    ? `<div class="notice" style="margin-bottom:14px;border-left-color:var(--gold);">
        <strong>Login needs the local server version.</strong>
        <p class="muted">Supabase authentication works from <code>http://127.0.0.1:4173/</code>, not from the direct file view.</p>
        <button type="button" class="button primary" data-action="open-local-server">Open Local Server</button>
      </div>`
    : "";
  const configStatus = state.supabaseConfig.url && state.supabaseConfig.anonKey
    ? `<p class="status good">Supabase settings are saved for this site address.</p>`
    : `<div class="notice" style="margin-bottom:14px;border-left-color:var(--gold);">
        <strong>Supabase settings are not saved for this site address.</strong>
        <p class="muted">The local server and file view have separate browser storage. Add your Project URL and anon key before email login. You do not need to load the question bank first.</p>
        <button type="button" class="button" data-action="supabase-settings">Open Supabase Settings</button>
      </div>`;
  app.innerHTML = `
    <section class="hero">
      <button type="button" class="button admin-entry-button" onclick="setRoute('admin')">Admin Portal</button>
      <div class="card panel" style="width:min(460px,100%);">
        <div class="brand">${logoMarkup()}</div>
        <h1 class="page-title">${kind === "login" ? "Log In" : "Create Account"}</h1>
        ${fileModeNotice}
        ${configStatus}
        <p class="status ${state.authStatus.includes("error") || state.authStatus.includes("Add your") || state.authStatus.includes("Invalid") ? "bad" : "info"}">${escapeHtml(state.authStatus)}</p>
        <div class="form-grid" style="grid-template-columns:1fr;">
          <label class="field">Email <input type="email" value="${escapeHtml(state.authForm.email)}" oninput="state.authForm.email=this.value"></label>
          <label class="field">Password <input type="password" value="${escapeHtml(state.authForm.password)}" oninput="state.authForm.password=this.value"></label>
          ${kind === "signup" ? `<label class="field">Display Name <input value="${escapeHtml(state.authForm.displayName)}" oninput="state.authForm.displayName=this.value"></label>` : ""}
          <button type="button" class="button primary" data-action="${kind === "login" ? "login-submit" : "signup-submit"}">${kind === "login" ? "Log In" : "Create Account"}</button>
          ${kind === "login" ? `<button type="button" class="button" data-action="forgot-password">Forgot Password?</button>` : ""}
          <button type="button" class="button" data-action="google-login">${kind === "signup" ? "Sign Up With Google" : "Continue With Google"}</button>
          <button type="button" class="button" data-action="supabase-settings">Supabase Settings</button>
        </div>
        <div class="notice" style="margin-top:14px;border-left-color:var(--info);">
          <strong>Google OAuth redirect</strong>
          <p class="muted">Google Cloud must list this authorized redirect URI: <code>${escapeHtml(supabaseOAuthCallbackUrl())}</code></p>
          <p class="muted">Supabase Auth redirect URLs should include <code>${escapeHtml(appRedirectUrl())}</code></p>
        </div>
        <p class="muted">Email login uses only the Supabase Project URL and anon key. The question bank can load after sign-in.</p>
      </div>
    </section>
  `;
}

function publicSupabaseSetup() {
  app.innerHTML = `
    <section class="hero">
      <div class="card panel" style="width:min(560px,100%);">
        <div class="brand">${logoMarkup()}</div>
        <h1 class="page-title">Supabase Connection</h1>
        <p class="status ${hasSupabaseConfig() ? "good" : "gold"}">${hasSupabaseConfig() ? "Supabase settings are saved. You can return to login." : "Add these settings before email login."}</p>
        <div class="form-grid" style="grid-template-columns:1fr;">
          <label class="field">Project URL
            <input value="${escapeHtml(state.supabaseConfig.url)}" placeholder="https://your-project.supabase.co" onchange="state.supabaseConfig.url=this.value.trim(); saveSupabaseConfig(); render()">
          </label>
          <label class="field">Anon public key
            <input type="password" value="${escapeHtml(state.supabaseConfig.anonKey)}" placeholder="eyJhbGciOi..." onchange="state.supabaseConfig.anonKey=this.value.trim(); saveSupabaseConfig(); render()">
          </label>
          <label class="field">Questions table name
            <input value="${escapeHtml(state.supabaseConfig.table)}" onchange="state.supabaseConfig.table=this.value.trim() || 'questions'; saveSupabaseConfig(); render()">
          </label>
        </div>
        <div class="actions">
          <button type="button" class="button primary" onclick="saveSupabaseConfig(); state.authStatus='Supabase settings saved. You can sign in now.'; setRoute('login')">Save And Return To Login</button>
          <button type="button" class="button" onclick="setRoute('login')">Back To Login</button>
        </div>
        <div class="notice" style="margin-top:14px;border-left-color:var(--info);">
          <strong>No question upload required</strong>
          <p class="muted">These connection settings are enough for login. The website will try to load the question bank in the background after you sign in, and it will keep using sample questions if the bank is not ready.</p>
        </div>
        <p class="muted">Never paste a Supabase service-role key here. This field is for the anon public key only.</p>
      </div>
    </section>
  `;
}

function onboardingNextActionButton(recommendation) {
  if (recommendation.action === "diagnostic") {
    return `<button class="button primary" onclick="startOnboardingDiagnostic()">Start Diagnostic</button>`;
  }
  if (recommendation.action === "topic") {
    return `<button class="button primary" onclick="startOnboardingPractice(${jsString(recommendation.topic)})">Open Topic Practice</button>`;
  }
  if (recommendation.action === "generator") {
    return `<button class="button primary" onclick="startOnboardingPractice()">Open Generator</button>`;
  }
  return `<button class="button primary" onclick="saveOnboardingPlan()">Save Plan</button>`;
}

function onboardingPanel() {
  const levels = onboardingExamLevels();
  const clusters = onboardingClusters();
  const blueprint = currentOnboardingBlueprint();
  const recommendation = onboardingRecommendation();
  const goalImpact = onboardingGoalImpact();
  const maxQuestionCount = 250;
  const blueprintTopicsPreview = blueprintTopics(blueprint).slice(0, 8);
  const omittedTopicCount = Math.max(0, blueprintTopics(blueprint).length - blueprintTopicsPreview.length);
  return `
    <section class="card panel span-12 onboarding-panel">
      <div class="split">
        <div>
          <h2 class="section-title">Practice Setup</h2>
          <p class="muted">Choose the exam and cluster you are preparing for. Lift Off will use that blueprint to guide your next test.</p>
        </div>
        <span class="status ${state.onboarding.completed ? "good" : "info"}">${state.onboarding.completed ? "Saved" : "New setup"}</span>
      </div>
      <div class="onboarding-grid">
        <div class="onboarding-main">
          <div class="form-grid">
            <label class="field">Exam
              <select onchange="updateOnboardingDraft('examLevel', this.value)">
                ${levels.map(level => `<option value="${escapeHtml(level)}" ${state.onboarding.examLevel === level ? "selected" : ""}>${escapeHtml(level)}</option>`).join("")}
              </select>
            </label>
            <label class="field">Cluster
              <select onchange="updateOnboardingDraft('cluster', this.value)">
                ${clusters.map(cluster => `<option value="${escapeHtml(cluster)}" ${state.onboarding.cluster === cluster ? "selected" : ""}>${escapeHtml(cluster)}</option>`).join("")}
              </select>
            </label>
            <label class="field">Goal
              <select onchange="updateOnboardingDraft('goal', this.value)">
                ${onboardingGoalOptions().map(goal => `<option value="${escapeHtml(goal)}" ${state.onboarding.goal === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </label>
            <label class="field">Questions
              <input type="number" min="1" max="${maxQuestionCount}" value="${onboardingQuestionCount()}" onchange="updateOnboardingQuestionCount(this.value)">
            </label>
            <div class="field">
              <span>Active Blueprint</span>
              <div class="onboarding-blueprint-name">${escapeHtml(blueprint?.name || "No blueprint selected")}</div>
            </div>
          </div>
          <div class="goal-impact">
            <span class="status info">${escapeHtml(state.onboarding.goal)}</span>
            <strong>${escapeHtml(goalImpact.title)}</strong>
            <p class="muted">${escapeHtml(goalImpact.body)}</p>
          </div>
          <div class="onboarding-summary">
            <div class="metric"><span class="muted">Category</span><strong>${escapeHtml(blueprint?.category || "-")}</strong></div>
            <div class="metric"><span class="muted">Questions</span><strong>${onboardingQuestionCount()}</strong></div>
            <div class="metric"><span class="muted">Topics</span><strong>${blueprintTopics(blueprint).length}</strong></div>
          </div>
          <div class="chips onboarding-topic-preview">
            ${blueprintTopicsPreview.map(topic => `<span class="chip">${escapeHtml(topic)}</span>`).join("")}
            ${omittedTopicCount ? `<span class="chip warn">+${omittedTopicCount} more</span>` : ""}
          </div>
          <p class="status info">${escapeHtml(state.onboarding.status)}</p>
          <div class="actions">
            <button class="button primary" onclick="saveOnboardingPlan()">Save Plan</button>
            <button class="button" onclick="startOnboardingDiagnostic()">Start Diagnostic</button>
            <button class="button" onclick="startOnboardingPractice()">Generate Blueprint Test</button>
          </div>
        </div>
        <aside class="recommendation-card">
          <span class="status gold">Recommended next</span>
          <h3>${escapeHtml(recommendation.title)}</h3>
          <p class="muted">${escapeHtml(recommendation.body)}</p>
          ${onboardingNextActionButton(recommendation)}
        </aside>
      </div>
    </section>
  `;
}

function practiceSetupPage() {
  layout("Practice Setup", `
    <div class="grid">
      ${onboardingPanel()}
    </div>
  `);
}

function onboardingDashboardCard() {
  const blueprint = currentOnboardingBlueprint();
  const recommendation = onboardingRecommendation();
  return `
    <section class="card panel span-12">
      <div class="split">
        <div>
          <h2 class="section-title">Practice Setup</h2>
          <p class="muted">${escapeHtml(blueprint?.name || "Choose your exam and cluster")} ${state.onboarding.completed ? "is your active plan." : "is ready to configure."}</p>
        </div>
        <span class="status ${state.onboarding.completed ? "good" : "info"}">${state.onboarding.completed ? "Saved" : "Setup needed"}</span>
      </div>
      <div class="actions">
        <button class="button primary" onclick="setRoute('practice-setup')">Open Practice Setup</button>
        ${onboardingNextActionButton(recommendation)}
      </div>
    </section>
  `;
}

function dashboardEntries() {
  const real = realCompletedScores();
  return {
    real,
    visible: real.length ? real : state.scoreHistory,
    usingExamples: !real.length && state.scoreHistory.length > 0
  };
}

function averagePercent(entries) {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((sum, entry) => sum + Number(entry.percent || 0), 0) / entries.length);
}

function recentWeekEntries(entries) {
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return entries.filter(entry => {
    const time = Date.parse(entry.completedAt || "");
    return Number.isFinite(time) && time >= weekAgo;
  });
}

function dashboardWeakTopics(limit = 4) {
  return state.topicStats
    .filter(stat => Number(stat.total) > 0)
    .map(stat => ({ ...stat, percent: Math.round((stat.correct / stat.total) * 100) }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, limit);
}

function dashboardQuestionStatusTotals() {
  return activeQuestions().reduce((totals, question) => {
    const status = question.status || state.userQuestionStatuses[question.id]?.status || "Unseen";
    totals[status] = (totals[status] || 0) + 1;
    return totals;
  }, {});
}

function dashboardHeroCard() {
  const blueprint = currentOnboardingBlueprint();
  const recommendation = onboardingRecommendation();
  const planLabel = blueprint?.name || "Choose a practice plan";
  return `
    <section class="card panel span-12 dashboard-hero">
      <div class="dashboard-hero-copy">
        <span class="status ${state.onboarding.completed ? "good" : "info"}">${state.onboarding.completed ? "Plan ready" : "Practice setup"}</span>
        <h2>Welcome back, ${escapeHtml(profileDisplayName())}</h2>
        <p class="muted">${escapeHtml(planLabel)}${state.onboarding.completed ? " is active." : " is waiting for setup."} ${escapeHtml(recommendation.body)}</p>
        <div class="actions">
          ${onboardingNextActionButton(recommendation)}
          <button class="button" onclick="setRoute('practice-setup')">Adjust Plan</button>
          ${state.resumeAvailable ? `<button class="button" onclick="resumePausedSession()">Resume Saved Session</button>` : ""}
        </div>
      </div>
      <div class="dashboard-plan-card">
        <span class="muted">Current path</span>
        <strong>${escapeHtml(planLabel)}</strong>
        <span>${onboardingDiagnosticQuestionCount()} question diagnostic</span>
      </div>
    </section>
  `;
}

function dashboardMetricCards() {
  const { real, visible, usingExamples } = dashboardEntries();
  const last = visible[visible.length - 1] || null;
  const statuses = dashboardQuestionStatusTotals();
  const unseen = statuses.Unseen || statuses.unseen || 0;
  const avg = averagePercent(visible);
  const weeklyCount = recentWeekEntries(real).length;
  return `
    <section class="card panel span-3 metric dashboard-metric">
      <span class="muted">Average Score</span>
      <strong>${avg || "--"}${avg ? "%" : ""}</strong>
      <span class="muted">${usingExamples ? "Example trend until your first test" : `${real.length} completed test${real.length === 1 ? "" : "s"}`}</span>
    </section>
    <section class="card panel span-3 metric dashboard-metric">
      <span class="muted">Latest Score</span>
      <strong>${last ? `${last.percent}%` : "--"}</strong>
      <span class="muted">${last ? `${escapeHtml(last.mode)} - ${escapeHtml(last.date)}` : "Take a diagnostic to begin"}</span>
    </section>
    <section class="card panel span-3 metric dashboard-metric">
      <span class="muted">This Week</span>
      <strong>${weeklyCount}</strong>
      <span class="muted">real test${weeklyCount === 1 ? "" : "s"} completed</span>
    </section>
    <section class="card panel span-3 metric dashboard-metric">
      <span class="muted">Unseen Questions</span>
      <strong>${unseen}</strong>
      <span class="muted">${activeQuestions().length} loaded questions</span>
    </section>
  `;
}

function dashboardFocusPanel() {
  const weakTopics = dashboardWeakTopics();
  if (!weakTopics.length) {
    return `
      <section class="card panel span-6">
        <h2 class="section-title">Topic Focus</h2>
        <p class="muted">Take a diagnostic and your weakest topic tags will appear here.</p>
        <button class="button primary" onclick="startOnboardingDiagnostic()">Start Diagnostic</button>
      </section>
    `;
  }
  return `
    <section class="card panel span-6">
      <div class="split"><h2 class="section-title">Topic Focus</h2><button class="chip" onclick="setRoute('analytics')">View Analytics</button></div>
      ${weakTopics.map(topic => `
        <div class="dashboard-topic-row">
          <div>
            <strong>${escapeHtml(topic.topic)}</strong>
            <span class="muted">${topic.correct}/${topic.total} correct</span>
          </div>
          <div class="dashboard-topic-score">
            <span>${topic.percent}%</span>
            <div class="bar"><i style="width:${topic.percent}%"></i></div>
          </div>
        </div>
      `).join("")}
    </section>
  `;
}

function dashboardRecentActivityPanel() {
  const { visible, usingExamples } = dashboardEntries();
  const recent = visible.slice(-4).reverse();
  return `
    <section class="card panel span-6">
      <div class="split"><h2 class="section-title">Recent Activity</h2><button class="chip" onclick="setRoute('history')">Open History</button></div>
      ${usingExamples ? `<p class="status info">Showing example activity until you complete a test.</p>` : ""}
      ${recent.length ? `<div class="dashboard-list">${recent.map(entry => `
        <div class="dashboard-list-row">
          <div><strong>${escapeHtml(entry.mode)}</strong><span class="muted">${escapeHtml(entry.date)} - ${escapeHtml((entry.topics || []).slice(0, 2).join(", ") || entry.category || "Mixed")}</span></div>
          <span class="status ${entry.percent >= 80 ? "good" : entry.percent >= 65 ? "gold" : "bad"}">${entry.percent}%</span>
        </div>
      `).join("")}</div>` : `<p class="muted">No recent tests yet.</p>`}
    </section>
  `;
}

function dashboardStatusPanel() {
  const bankCount = activeQuestions().length;
  return `
    <section class="card panel span-4">
      <h2 class="section-title">Question Bank</h2>
      <p><strong>${bankCount}</strong> active questions</p>
      <p class="muted">${escapeHtml(state.bankSource)}.</p>
      ${isAdminRole() ? `<button class="button" onclick="setAdminPage('question-bank'); setRoute('admin')">Manage Bank</button>` : `<button class="button" onclick="setRoute('search')">Search Questions</button>`}
    </section>
    <section class="card panel span-4">
      <h2 class="section-title">Account</h2>
      <p><span class="status ${isOwnerRole() ? "good" : isAdminRole() ? "gold" : "info"}">${roleLabel()}</span> <span class="status ${state.account === "premium" ? "good" : "gold"}">${state.account === "premium" ? "Premium" : "Free"}</span></p>
      <p class="muted">${escapeHtml(state.roleStatus)}</p>
      <button class="button" onclick="setRoute('settings')">Account Settings</button>
    </section>
    <section class="card panel span-4">
      <h2 class="section-title">Quick Exports</h2>
      <p class="muted">Download results, analytics, and performance history when you need to share progress.</p>
      <button class="button" onclick="setRoute('exports')">Open Exports</button>
    </section>
  `;
}

function dashboardQuickActions() {
  return `
    <section class="span-12 dashboard-actions-section">
      <div class="split"><h2 class="section-title">Quick Actions</h2><span class="status info">${state.bankSource}</span></div>
      <div class="dashboard-action-grid">
        ${actionCard("Generate Test", "Create a blueprint-based practice test with timer and study-mode controls.", "generator", "primary")}
        ${actionCard("Enter Test ID", "Preview or retake a reproducible test from an existing Test ID.", "testid", "")}
        ${actionCard("Infinite Run", "Practice continuously with weak-area focus and optional Hardcore Mode.", "infinite", "")}
        ${actionCard("Analytics", "Review scores, topic accuracy, difficulty trends, and confidence patterns.", "analytics", "")}
      </div>
    </section>
  `;
}

function dashboardUsagePanel() {
  const real = realCompletedScores();
  const weekly = recentWeekEntries(real);
  const testCount = weekly.filter(entry => entry.mode === "Test").length;
  const idCount = weekly.filter(entry => String(entry.mode || "").includes("Test ID")).length;
  const totalCount = weekly.length;
  return state.account === "free" ? `
    <section class="card panel span-12">
      <div class="split"><h2 class="section-title">Weekly Usage</h2><span class="status gold">Free tier</span></div>
      <div class="grid usage">
        ${usageBar("Generated tests", testCount, 3)}
        ${usageBar("Test ID tests", idCount, 7)}
        ${usageBar("Total tests", totalCount, 10)}
      </div>
    </section>` : "";
}

function teamRoleOptions() {
  return [
    ["team_admin", "Administrator"],
    ["co_admin", "Co-Administrator"],
    ["student", "Student"]
  ];
}

function teamAccountsPage() {
  const team = selectedTeam();
  const members = teamMemberships(team?.id);
  const assignments = teamAssignments(team?.id);
  const invites = teamInvites(team?.id);
  const students = teamStudents(team?.id);
  const selectedRecipientIds = new Set(selectedAssignmentRecipientIds(team?.id));
  const adminCount = members.filter(member => member.role === "team_admin").length;
  const coAdminCount = members.filter(member => member.role === "co_admin").length;
  const studentCount = members.filter(member => member.role === "student").length;
  layout("Team Accounts", `
    <div class="grid">
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Team Account Baseline</h2><span class="status info">${escapeHtml(state.teamAccounts.status)}</span></div>
        <p class="muted">Team administrators can manage team members and assignments. Co-administrators can assign work to student accounts while their display label remains customizable.</p>
        <div class="actions">
          <button class="button" onclick="refreshTeamAccountsFromSupabase()">Load Supabase Teams</button>
          <button class="button" onclick="setRoute('settings')">Account Settings</button>
        </div>
      </section>
      <section class="card panel span-4">
        <h2 class="section-title">Create Team</h2>
        <label class="field">Team Name
          <input value="${escapeHtml(state.teamAccounts.form.name)}" oninput="state.teamAccounts.form.name=this.value">
        </label>
        <button class="button primary" onclick="createTeamAccount()">Create Team Account</button>
        <hr>
        <h2 class="section-title">Your Teams</h2>
        <div class="team-list">
          ${state.teamAccounts.teams.length ? state.teamAccounts.teams.map(item => `
            <button class="team-list-item ${team?.id === item.id ? "selected" : ""}" onclick="setSelectedTeam(${jsString(item.id)})">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="muted">${escapeHtml(item.localOnly ? "Local draft" : item.status || "active")}</span>
            </button>
          `).join("") : `<p class="muted">No team accounts created yet.</p>`}
        </div>
      </section>
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">${escapeHtml(team?.name || "No Team Selected")}</h2><span class="status ${team?.localOnly ? "gold" : "good"}">${team ? team.localOnly ? "Local" : "Supabase-ready" : "Empty"}</span></div>
        ${team ? `
          <div class="team-metrics">
            <div class="metric"><span class="muted">Administrators</span><strong>${adminCount}</strong></div>
            <div class="metric"><span class="muted">Co-Administrators</span><strong>${coAdminCount}</strong></div>
            <div class="metric"><span class="muted">Students</span><strong>${studentCount}</strong></div>
          </div>
          <div class="form-grid" style="margin-top:14px;">
            <label class="field">Member Email
              <input type="email" value="${escapeHtml(state.teamAccounts.memberForm.email)}" oninput="state.teamAccounts.memberForm.email=this.value">
            </label>
            <label class="field">Display Name
              <input value="${escapeHtml(state.teamAccounts.memberForm.displayName)}" oninput="state.teamAccounts.memberForm.displayName=this.value">
            </label>
            <label class="field">Permission Role
              <select onchange="state.teamAccounts.memberForm.role=this.value; state.teamAccounts.memberForm.roleLabel=normalizeTeamRoleLabel(this.value, state.teamAccounts.memberForm.roleLabel); render()">
                ${teamRoleOptions().map(([value, label]) => `<option value="${value}" ${state.teamAccounts.memberForm.role === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label class="field">Role Label
              <input value="${escapeHtml(state.teamAccounts.memberForm.roleLabel)}" oninput="state.teamAccounts.memberForm.roleLabel=this.value" placeholder="Coach, Advisor, Officer, Student">
            </label>
          </div>
          <button class="button primary" onclick="addTeamMember()">Add Member / Invite</button>
        ` : `<p class="muted">Create a team to manage administrators, co-administrators, students, and assignments.</p>`}
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Members</h2><span class="status info">${members.length} total</span></div>
        <table class="table">
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
          ${members.length ? members.map(member => `<tr><td>${escapeHtml(member.display_name || "-")}</td><td>${escapeHtml(member.email || "-")}</td><td>${escapeHtml(member.role_label || member.role)}</td><td><span class="status ${member.status === "active" ? "good" : "gold"}">${escapeHtml(member.status || "invited")}</span></td></tr>`).join("") : `<tr><td colspan="4" class="muted">No members yet.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Invite Links</h2><span class="status info">${invites.length} created</span></div>
        <table class="table">
          <tr><th>Email</th><th>Role</th><th>Status</th><th>Link</th></tr>
          ${invites.length ? invites.map(invite => {
            const link = invite.link || "";
            return `<tr>
              <td>${escapeHtml(invite.email || "-")}<br><span class="muted">${invite.expires_at ? `Expires ${escapeHtml(formatDateTime(invite.expires_at))}` : "No expiration loaded"}</span></td>
              <td>${escapeHtml(invite.role_label || invite.role || "Student")}</td>
              <td><span class="status ${invite.status === "accepted" ? "good" : invite.status === "pending" ? "gold" : "info"}">${escapeHtml(invite.status || "pending")}</span></td>
              <td>${link ? `<div class="inline-actions"><input class="code-input" readonly value="${escapeHtml(link)}" onclick="this.select()"><button class="button ghost" onclick='copyTeamInviteLink(${jsString(link)})'>Copy</button><button class="button ghost" onclick='sendTeamInviteEmail(${jsString(invite.id)})'>Send</button></div><span class="muted">${invite.email_sent_at ? `Sent ${escapeHtml(formatDateTime(invite.email_sent_at))}` : invite.last_send_error ? `Last send failed: ${escapeHtml(invite.last_send_error)}` : "Not emailed yet"}</span>` : `<span class="muted">Raw link unavailable after reload. Reinvite to create a new link.</span>`}</td>
            </tr>`;
          }).join("") : `<tr><td colspan="4" class="muted">No invite links created yet.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Create Assignment Shell</h2>
        <div class="form-grid">
          <label class="field">Title
            <input value="${escapeHtml(state.teamAccounts.assignmentForm.title)}" oninput="state.teamAccounts.assignmentForm.title=this.value">
          </label>
          <label class="field">Test ID
            <input value="${escapeHtml(state.teamAccounts.assignmentForm.testId)}" oninput="state.teamAccounts.assignmentForm.testId=this.value.toUpperCase()" placeholder="Optional">
          </label>
          <label class="field">Due Date
            <input type="date" value="${escapeHtml(state.teamAccounts.assignmentForm.dueDate)}" oninput="state.teamAccounts.assignmentForm.dueDate=this.value">
          </label>
          <label class="field">Attempt Limit
            <input type="number" min="1" max="10" value="${escapeHtml(state.teamAccounts.assignmentForm.attemptLimit)}" onchange="state.teamAccounts.assignmentForm.attemptLimit=Math.max(1, Number(this.value)||1); render()">
          </label>
        </div>
        <p class="muted">If no Test ID is entered, this stores the current blueprint/settings snapshot for assignment generation.</p>
        <div class="split" style="margin-top:12px;"><h3 class="section-title">Recipients</h3><button class="chip" onclick="selectAllAssignmentRecipients()">Select All Students</button></div>
        <div class="team-recipient-list">
          ${students.length ? students.map(student => `
            <label class="recipient-row">
              <input type="checkbox" ${selectedRecipientIds.has(student.id) ? "checked" : ""} onchange='toggleAssignmentRecipient(${jsString(student.id)})'>
              <span><strong>${escapeHtml(student.display_name || student.email || "Student")}</strong><br><span class="muted">${escapeHtml(student.email || "-")} - ${escapeHtml(student.status || "active")}</span></span>
            </label>
          `).join("") : `<p class="muted">No student accounts are available yet. Add or invite students before creating assignments.</p>`}
        </div>
        <button class="button primary" onclick="createTeamAssignment()">Create Assignment</button>
      </section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Assignments</h2><span class="status info">${assignments.length} created</span></div>
        <table class="table">
          <tr><th>Title</th><th>Source</th><th>Due</th><th>Attempts</th><th>Status</th></tr>
          ${assignments.length ? assignments.map(assignment => {
            const recipients = teamAssignmentRecipients(assignment.id);
            const completed = recipients.filter(recipient => recipient.status === "submitted").length;
            return `<tr><td>${escapeHtml(assignment.title)}</td><td>${escapeHtml(assignment.test_id || assignment.blueprint_snapshot?.name || "Blueprint snapshot")}</td><td>${assignment.due_at ? escapeHtml(formatDateTime(assignment.due_at)) : "No due date"}</td><td>${recipients.length} recipient${recipients.length === 1 ? "" : "s"}${recipients.length ? `, ${completed} complete` : ""}<br><span class="muted">Attempt limit ${assignment.attempt_limit || 1}</span></td><td><span class="status ${assignment.localOnly ? "gold" : assignment.status === "assigned" ? "good" : "info"}">${escapeHtml(assignment.localOnly ? "Local assignment" : assignment.status || "draft")}</span></td></tr>`;
          }).join("") : `<tr><td colspan="5" class="muted">No assignments created yet.</td></tr>`}
        </table>
      </section>
    </div>
  `);
}

function dashboard() {
  layout("Dashboard", `
    <div class="grid dashboard-grid">
      ${dashboardHeroCard()}
      ${dashboardMetricCards()}
      ${dashboardFocusPanel()}
      ${dashboardRecentActivityPanel()}
      ${dashboardUsagePanel()}
      ${dashboardStatusPanel()}
      ${dashboardQuickActions()}
      ${isAdminRole() ? permissionSummary() : ""}
    </div>
  `);
}

function usageBar(label, used, max) {
  return `<div class="span-4"><div class="split"><strong>${label}</strong><span>${used}/${max}</span></div><div class="bar"><i style="width:${Math.min(100, (used / max) * 100)}%"></i></div></div>`;
}

function actionCard(title, body, route, style) {
  return `<section class="card panel dashboard-action"><h2 class="section-title">${title}</h2><p class="muted">${body}</p><button class="button ${style}" onclick="setRoute('${route}')">${title}</button></section>`;
}

function permissionSummary() {
  const adminPermissions = [
    "Upload questions",
    "Bulk upload questions",
    "Edit and retire questions",
    "Review reports",
    "Manage tags",
    "Generate administrator access links",
    "Send broadcasts",
    "View platform analytics",
    "Manage banned terms"
  ];
  const ownerPermissions = [
    "All Administrator permissions",
    "Create Owner accounts by unanimous Owner approval",
    "Remove Owners by majority Owner approval",
    "Approve Administrator creation",
    "Approve Administrator suspension",
    "Override Administrator actions",
    "View revenue statistics"
  ];
  const standardPermissions = [
    "Generate tests",
    "Retake tests with Test IDs",
    "Take quizzes and infinite runs",
    "Report questions",
    "View scores"
  ];
  const active = isOwnerRole() ? ownerPermissions : isAdminRole() ? adminPermissions : standardPermissions;
  return `
    <section class="card panel span-12">
      <div class="split"><h2 class="section-title">Current Account Role</h2><span class="status ${isOwnerRole() ? "good" : isAdminRole() ? "gold" : "info"}">${roleLabel()}</span></div>
      <p class="muted">${escapeHtml(state.roleStatus)}</p>
      <div class="chips" style="margin-top:12px;">${active.map(permission => `<span class="status info">${permission}</span>`).join("")}</div>
    </section>
  `;
}

function statusClass(status) {
  if (status === "Valid" || status === "Fixed") return "good";
  if (status === "Invalid" || status === "Spam") return "bad";
  if (status === "Warning" || status === "Work In Progress") return "gold";
  return "info";
}

function blueprintSummary(blueprint, coverage = blueprintCoverage(blueprint)) {
  const shortfalls = coverage.shortfalls.slice(0, 4);
  const remaining = coverage.shortfalls.length - shortfalls.length;
  return `
    <p><span class="status ${statusClass(coverage.status)}">${coverage.status}</span> ${blueprint.name}</p>
    <table class="table compact-table">
      <tr><th>Version</th><td>${blueprint.version}</td></tr>
      <tr><th>Category</th><td>${blueprint.category}</td></tr>
      <tr><th>Target</th><td>${blueprint.totalQuestions} questions</td></tr>
      <tr><th>Coverage</th><td>${coverage.coverage}%${shortfalls.length ? ` - Shortfalls: ${shortfalls.join(", ")}${remaining > 0 ? `, +${remaining} more` : ""}` : ""}</td></tr>
    </table>
  `;
}

function blueprintDistributionTable(blueprint) {
  if (!blueprint) return "";
  return `
    <table class="table compact-table">
      <tr><th>Topic</th><th>Count</th></tr>
      ${Object.entries(blueprint.distribution).map(([topic, count]) => `<tr><td>${topic}</td><td>${count}</td></tr>`).join("")}
    </table>
  `;
}

function savedBlueprintSwitcher() {
  if (!state.customBlueprints.length) {
    return `<p class="muted">No saved custom blueprints yet.</p>`;
  }
  return `
    <div class="chips">
      ${state.customBlueprints.map(blueprint => `<button class="chip ${state.selected.blueprint === blueprint.name ? "selected" : ""}" onclick='selectBlueprint(${jsString(blueprint.name)})'>${blueprint.name}</button>`).join("")}
    </div>
    <div class="actions" style="margin-top:10px;">
      ${state.customBlueprints.map(blueprint => `<button class="button" onclick='deleteCustomBlueprint(${jsString(blueprint.name)})'>Delete ${blueprint.name}</button>`).join("")}
    </div>
  `;
}

function generator() {
  const selected = state.selected;
  const availableBlueprints = allBlueprints();
  const blueprint = selectedBlueprint();
  pruneSelectedTopicsForBlueprint(blueprint);
  const visibleTopics = blueprint ? blueprintTopics(blueprint) : allTopicTags();
  const coverage = blueprintCoverage(blueprint);
  const matchingManualCount = blueprint ? 0 : blueprintQuestionSet(activeQuestions(), null).length;
  const questionCount = blueprint ? `${coverage.coverage}% blueprint coverage` : matchingManualCount;
  layout("Generate Test", `
    <div class="grid">
      <section class="card panel span-8">
        <div class="form-grid">
          <label class="field">Category
            <select onchange="state.selected.category=this.value; state.selected.blueprint='__manual__'; render()">${categories.map(c => `<option ${selected.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
          </label>
          <label class="field">Blueprint Preset
            <select onchange="selectBlueprint(this.value)">
              ${availableBlueprints.map(b => `<option value="${escapeHtml(b.name)}" ${selected.blueprint === b.name ? "selected" : ""}>${b.name}</option>`).join("")}
              <option value="__manual__" ${selected.blueprint === "__manual__" ? "selected" : ""}>No blueprint - manual tags</option>
            </select>
          </label>
          <div class="field">
            <label>Difficulty</label>
            <div class="chips">${difficulties.map(d => chip(d, selected.difficulties.includes(d), `toggleList('difficulties','${d}')`)).join("")}</div>
          </div>
          <div class="field">
            <label>Topic Tags</label>
            <div class="chips">${visibleTopics.map(t => chip(t, selected.topics.includes(t), `toggleList('topics','${t}')`, ["Promotion", "Selling", "Customer Relations"].includes(t))).join("")}</div>
            ${blueprint ? `<p class="muted">Selected from ${blueprint.name}. Topic counts follow the blueprint distribution.</p>` : ""}
          </div>
          <label class="field">Question Count
            <input type="number" min="5" max="${state.account === "free" ? 40 : 250}" value="${selected.count}" onchange="state.selected.count=Number(this.value)">
          </label>
          <label class="field">Timer
            <select onchange="state.selected.timer=this.value; render()">
              <option value="60" ${selected.timer === "60" ? "selected" : ""}>Default - 60 minutes</option>
              <option value="none" ${selected.timer === "none" ? "selected" : ""}>No timer</option>
              <option value="custom" ${selected.timer === "custom" ? "selected" : ""}>Custom timer</option>
            </select>
          </label>
          ${selected.timer === "custom" ? `<label class="field">Custom Timer Minutes
            <input type="number" min="1" max="999" value="${selected.customTimerMinutes}" oninput="state.selected.customTimerMinutes=this.value" onchange="setCustomTimerMinutes(this.value)">
          </label>` : ""}
          <div class="field">
            <label>Study Mode</label>
            <div class="chips">
              <button class="chip ${state.selected.studyMode === "Show answers during test" ? "selected" : ""}" onclick="${state.account === "premium" ? "state.selected.studyMode='Show answers during test'; render()" : "upgradeForPremium('study mode')"}">Show answers during test</button>
              <button class="chip ${state.selected.studyMode === "Show explanations during test" ? "selected" : ""}" onclick="${state.account === "premium" ? "state.selected.studyMode='Show explanations during test'; render()" : "upgradeForPremium('study mode')"}">Show explanations during test</button>
            </div>
          </div>
          <div class="field">
            <label>Recommendation Priority</label>
            <div class="notice">Top 30-day weak areas are highlighted first: Selling, Financial Analysis, Risk Management.</div>
          </div>
        </div>
      </section>
      <aside class="card panel span-4">
        <h2 class="section-title">Availability</h2>
        <p><strong>${questionCount}</strong> matching questions found.</p>
        <p class="muted">Source: ${state.bankSource}</p>
        <p class="muted">Free accounts can generate up to 40 questions and use up to 3 topic tags.</p>
        <div class="notice" style="border-left-color:${state.generationNotice.startsWith("Only") || state.generationNotice.startsWith("No questions") ? "var(--gold)" : "var(--info)"};">${escapeHtml(state.generationNotice)}</div>
        ${state.generationNotice.startsWith("Only") ? `<div class="actions" style="margin-top:10px;"><button class="button primary" onclick="generateShorterTest('Test')">Generate Shorter Test</button><button class="button" onclick="state.generationNotice='Modify selected tags, then generate again.'; render()">Modify Tags</button><button class="button" onclick="setRoute('dashboard')">Return</button></div>` : ""}
        ${state.generationNotice.startsWith("No questions") ? `<div class="actions" style="margin-top:10px;"><button class="button" onclick="state.generationNotice='Modify selected tags, then generate again.'; render()">Modify Tags</button><button class="button" onclick="setRoute('dashboard')">Return</button></div>` : ""}
        <div class="notice">Weak topics are surfaced first: Promotion, Selling, Financial Analysis.</div>
        <h2 class="section-title" style="margin-top:16px;">Blueprint Status</h2>
        ${blueprint ? blueprintSummary(blueprint, coverage) : `<p><span class="status info">Manual</span> Category and tags are user-selected.</p>`}
        <hr>
        <button class="button primary" onclick="startTest('Test')">Generate Seeded Test</button>
        <button class="button" onclick="startTest('Quiz')" style="margin-top:8px;">Start Quiz</button>
        <button class="button ${state.account === "premium" ? "" : "accent"}" onclick="${state.account === "premium" ? "startTest('Infinite Run')" : "upgradeForPremium('Infinite Run')"}" style="margin-top:8px;">${state.account === "premium" ? "Start Infinite Run" : "Upgrade for Infinite Run"}</button>
      </aside>
    </div>
  `);
}

function infinite() {
  layout("Infinite Run", `
    <div class="grid">
      <section class="card panel span-8">
        <div class="form-grid">
          <label class="field">Category
            <select>${categories.map(c => `<option>${c}</option>`).join("")}</select>
          </label>
          <label class="field">Difficulty
            <select><option>Medium and Hard</option><option>Medium only</option><option>Hard only</option><option>All difficulties</option></select>
          </label>
          <div class="field">
            <label>Topic Tags</label>
            <div class="chips">${allTopicTags().map(t => chip(t, state.selected.topics.includes(t), `toggleList('topics','${t}')`, ["Promotion", "Selling", "Customer Relations"].includes(t))).join("")}</div>
          </div>
          <div class="field">
            <label>Selection Priority</label>
            <ol class="steps">
              <li>Unseen questions</li>
              <li>Weak area questions once sample-size rules are met</li>
              <li>Previously seen questions only after applicable unseen questions are exhausted</li>
            </ol>
          </div>
          <div class="field">
            <label>Hardcore Mode</label>
            <div class="chips">
              <button class="chip ${state.hardcore.enabled ? "selected" : ""}" onclick="state.hardcore.enabled=!state.hardcore.enabled; render()">Enable Hardcore</button>
              <button class="chip ${state.hardcore.weakFocus ? "selected" : ""}" onclick="state.hardcore.weakFocus=!state.hardcore.weakFocus; render()">Weak Area Focus</button>
              <button class="chip ${state.hardcore.allowUnsure ? "selected" : ""}" onclick="state.hardcore.allowUnsure=!state.hardcore.allowUnsure; render()">I Don't Know Option</button>
            </div>
          </div>
          <label class="field">Strike Limit
            <select onchange="state.hardcore.strikes=this.value; render()">
              <option ${state.hardcore.strikes === "One-Strike Mode" ? "selected" : ""}>One-Strike Mode</option>
              <option ${state.hardcore.strikes === "Two-Strike Mode" ? "selected" : ""}>Two-Strike Mode</option>
              <option ${state.hardcore.strikes === "Three-Strike Mode" ? "selected" : ""}>Three-Strike Mode</option>
            </select>
          </label>
        </div>
      </section>
      <aside class="card panel span-4">
        <h2 class="section-title">Run Statistics</h2>
        <table class="table">
          <tr><th>Current streak</th><td>14</td></tr>
          <tr><th>Best streak</th><td>38</td></tr>
          <tr><th>Total answered</th><td>8,420</td></tr>
          <tr><th>Correct</th><td>81%</td></tr>
          <tr><th>I Don't Know</th><td>7%</td></tr>
          <tr><th>Hardcore strikes</th><td>${state.hardcore.enabled ? `0 / ${strikeLimit()} - ${state.hardcore.strikes}` : "Off"}</td></tr>
        </table>
        <div class="notice">Hardcore streaks are tracked separately for one-, two-, and three-strike configurations. Incorrect answers and I Don't Know add strikes.</div>
        <button class="button primary" onclick="startTest(state.hardcore.enabled ? 'Hardcore Run' : 'Infinite Run')" style="margin-top:12px;">Start Continuous Practice</button>
      </aside>
    </div>
  `);
}

function chip(label, selected, action, warn = false) {
  return `<button class="chip ${selected ? "selected" : ""} ${warn ? "warn" : ""}" onclick="${action}">${warn ? "!" : ""} ${label}</button>`;
}

function toggleList(key, value) {
  const list = state.selected[key];
  state.selected[key] = list.includes(value) ? list.filter(x => x !== value) : [...list, value];
  render();
}

function formatDateTime(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return "Unknown";
  return new Date(time).toLocaleString();
}

function applyLoadedTestIdRecord(record, sourceLabel = "local storage") {
  state.testIds[record.id] = record;
  persistTestIds();
  state.testIdLookup.selectedId = record.id;
  state.testIdLookup.status = `Test ID found in ${sourceLabel}. Preview loaded.`;
  state.testIdLookup.premiumCount = record.questionCount;
  state.testIdLookup.timer = "60";
  state.testIdLookup.customTimerMinutes = 30;
  state.testIdLookup.studyMode = "Standard";
  state.testIdLookup.randomizeOrder = false;
}

async function lookupTestId() {
  const id = state.testIdLookup.input.trim().toUpperCase();
  if (!id) {
    state.testIdLookup.selectedId = "";
    state.testIdLookup.status = "Enter a Test ID to preview it.";
    render();
    return;
  }
  state.testIdLookup.status = "Looking up Test ID...";
  render();
  try {
    const supabaseRecord = hasSupabaseConfig() ? await fetchSupabaseTestId(id) : null;
    if (supabaseRecord) {
      applyLoadedTestIdRecord(supabaseRecord, "Supabase");
      render();
      return;
    }
  } catch (error) {
    state.testIdLookup.status = `Supabase lookup failed: ${error.message}`;
  }
  const record = state.testIds[id];
  if (record) {
    applyLoadedTestIdRecord(record, "local storage");
  } else {
    state.testIdLookup.selectedId = "";
    state.testIdLookup.status = hasSupabaseConfig()
      ? "No Test ID found in Supabase or local storage."
      : "No saved Test ID found locally. Connect Supabase to look up shared Test IDs.";
  }
  render();
}

function testIdRetakeCount(record) {
  if (state.account !== "premium") return record.questionCount;
  const maxPoolCount = Math.max(1, testIdAvailablePool(record).length || record.questionCount);
  return Math.min(maxPoolCount, Math.max(1, Number(state.testIdLookup.premiumCount) || record.questionCount));
}

function testIdTimerSeconds() {
  if (state.account !== "premium") return 60 * 60;
  if (state.testIdLookup.timer === "none") return null;
  if (state.testIdLookup.timer === "custom") {
    const minutes = Math.min(999, Math.max(1, Number(state.testIdLookup.customTimerMinutes) || 30));
    state.testIdLookup.customTimerMinutes = minutes;
    return minutes * 60;
  }
  return 60 * 60;
}

function launchTestId() {
  const record = state.testIds[state.testIdLookup.selectedId];
  if (!record) {
    state.testIdLookup.status = "Load a valid Test ID first.";
    render();
    return;
  }
  startTest("Test ID Test", {
    testIdRecord: record,
    questionCount: testIdRetakeCount(record),
    timerSeconds: testIdTimerSeconds(),
    studyMode: state.account === "premium" ? state.testIdLookup.studyMode : "Standard",
    randomizeOrder: state.account === "premium" && state.testIdLookup.randomizeOrder
  });
}

function generateUpdatedTestId() {
  const original = state.testIds[state.testIdLookup.selectedId];
  if (!original) {
    state.testIdLookup.status = "Load a valid Test ID first.";
    render();
    return;
  }
  const updated = {
    ...original,
    id: testId(),
    questionCount: testIdRetakeCount(original),
    poolTimestamp: currentPoolTimestamp(),
    createdAt: new Date().toISOString()
  };
  saveTestIdRecord(updated);
  startTest("Updated Test ID Test", {
    testIdRecord: updated,
    questionCount: updated.questionCount,
    timerSeconds: testIdTimerSeconds(),
    studyMode: state.account === "premium" ? state.testIdLookup.studyMode : "Standard",
    randomizeOrder: state.account === "premium" && state.testIdLookup.randomizeOrder
  });
}

function testIdPreview() {
  const record = state.testIds[state.testIdLookup.selectedId];
  const updateWarning = record && testIdHasUpdates(record);
  const poolCount = record ? testIdAvailablePool(record).length : 0;
  const premiumControls = record && state.account === "premium" ? `
    <label class="field">Question Count
      <input type="number" min="1" max="${Math.max(1, poolCount || record.questionCount)}" value="${state.testIdLookup.premiumCount}" onchange="state.testIdLookup.premiumCount=Number(this.value); render()">
    </label>
    <label class="field">Timer
      <select onchange="state.testIdLookup.timer=this.value; render()">
        <option value="60" ${state.testIdLookup.timer === "60" ? "selected" : ""}>Default - 60 minutes</option>
        <option value="none" ${state.testIdLookup.timer === "none" ? "selected" : ""}>No timer</option>
        <option value="custom" ${state.testIdLookup.timer === "custom" ? "selected" : ""}>Custom timer</option>
      </select>
    </label>
    ${state.testIdLookup.timer === "custom" ? `<label class="field">Custom Timer Minutes
      <input type="number" min="1" max="999" value="${state.testIdLookup.customTimerMinutes}" onchange="state.testIdLookup.customTimerMinutes=Math.min(999, Math.max(1, Number(this.value) || 1)); render()">
    </label>` : ""}
    <label class="field">Study Mode
      <select onchange="state.testIdLookup.studyMode=this.value; render()">
        ${["Standard", "Show answers during test", "Show explanations during test"].map(mode => `<option ${state.testIdLookup.studyMode === mode ? "selected" : ""}>${mode}</option>`).join("")}
      </select>
    </label>
    <button class="chip ${state.testIdLookup.randomizeOrder ? "selected" : ""}" onclick="state.testIdLookup.randomizeOrder=!state.testIdLookup.randomizeOrder; render()">Randomize Order</button>
  ` : "";
  layout("Test ID Preview", `
    <div class="grid">
      <section class="card panel span-8">
        <div class="form-grid">
          <label class="field">Test ID
            <input value="${escapeHtml(state.testIdLookup.input)}" maxlength="12" oninput="state.testIdLookup.input=this.value.toUpperCase()">
          </label>
          <div class="field">
            <label>Actions</label>
            <button class="button primary" onclick="lookupTestId()">Preview Test ID</button>
          </div>
        </div>
        <p class="status ${record ? "good" : "info"}">${escapeHtml(state.testIdLookup.status)}</p>
        <p class="muted">Storage: ${hasSupabaseConfig() ? "Supabase connected, with local fallback." : "Local fallback only until Supabase settings are added."}</p>
        <div class="notice" style="margin-top:14px;">Test IDs never expire. They store metadata only, then recreate the same question pool from the original pool timestamp.</div>
        ${updateWarning ? `<div class="notice" style="margin-top:14px;border-left-color:var(--gold);">One or more questions in this test have been updated since this test was generated. Continue with caution or generate an updated version.</div>` : ""}
        ${record && poolCount === 0 ? `<div class="notice" style="margin-top:14px;border-left-color:var(--danger);">This Test ID is valid, but the current question bank has no active questions matching its locked category, difficulty, and topic tags.</div>` : ""}
        ${record ? `
          <table class="table">
            <tr><th>Test ID</th><td>${escapeHtml(record.id)}</td></tr>
            <tr><th>Mode</th><td>${escapeHtml(record.mode || "Test")}</td></tr>
            <tr><th>Category</th><td>${escapeHtml(record.category)}</td></tr>
            <tr><th>Difficulty</th><td>${escapeHtml(record.difficulties.join(", "))}</td></tr>
            <tr><th>Topic Tags</th><td>${escapeHtml(record.topics.join(", ") || "All")}</td></tr>
            <tr><th>Original Question Count</th><td>${record.questionCount}</td></tr>
            <tr><th>Available Pool Now</th><td>${poolCount}</td></tr>
            <tr><th>Pool Timestamp</th><td>${formatDateTime(record.poolTimestamp)}</td></tr>
            <tr><th>Creation Date</th><td>${formatDateTime(record.createdAt)}</td></tr>
            <tr><th>Status</th><td><span class="status ${updateWarning ? "gold" : "good"}">${updateWarning ? "Question update available" : "Current"}</span></td></tr>
          </table>
          <div class="actions"><button class="button primary" ${poolCount ? "" : "disabled"} onclick="launchTestId()">Continue</button><button class="button" ${poolCount ? "" : "disabled"} onclick="generateUpdatedTestId()">Generate Updated Test</button></div>
        ` : `<p class="muted">Generated tests automatically create Test IDs. Use a recent Test ID from Results or History to preview it here.</p>`}
      </section>
      <aside class="card panel span-4">
        <h2 class="section-title">Retake Options</h2>
        ${state.account === "premium" ? `<p><span class="status good">Premium</span> You may adjust count, timer, and study mode.</p>${premiumControls}` : `<p><span class="status gold">Free</span> Preview and launch are available. Count, timer, and study mode use defaults.</p>`}
        <div class="notice" style="margin-top:14px;">Category, difficulty, and topic tags are locked by the Test ID for every user.</div>
      </aside>
    </div>
  `);
}

function testView() {
  if (isContinuousRunMode() && state.current >= state.test.questions.length) {
    appendContinuousQuestions(state.test.continuousBatchSize || 20);
  }
  const q = state.test.questions[state.current];
  if (!q) {
    state.testEndReason = "No questions are available for this run.";
    completeTest();
    return;
  }
  const remainingSeconds = timerRemainingSeconds();
  if (remainingSeconds === 0) {
    state.testEndReason = "Time expired.";
    completeTest();
    return;
  }
  const timer = !state.test.timerSeconds
    ? `<span class="timer">No timer</span>`
    : state.timerHidden
      ? `<button class="button" onclick="state.timerHidden=false; render()">Show Timer</button>`
      : `<span class="timer">${formatTimer(remainingSeconds)}</span><button class="button" onclick="state.timerHidden=true; render()">Hide</button>`;
  const showAnswers = state.account === "premium" && ["Show answers during test", "Show explanations during test"].includes(state.test.studyMode);
  const showExplanation = state.account === "premium" && state.test.studyMode === "Show explanations during test";
  const continuousRun = isContinuousRunMode();
  const questionCounter = continuousRun
    ? `Question ${state.current + 1} <span class="status info">${state.test.questions.length} loaded</span>`
    : `Question ${state.current + 1}/${state.test.questions.length}`;
  const nextButton = continuousRun || state.current < state.test.questions.length - 1
    ? `<button class="button primary" onclick="nextQuestion()">Next</button>`
    : `<button class="button primary" onclick="submitCurrentTest()">Submit</button>`;
  const endRunButton = continuousRun ? `<button class="button" onclick="submitCurrentTest()">End Run</button>` : "";
  const hardcorePanel = isHardcoreRun() ? `
    <div class="hardcore-panel">
      <div class="split"><strong>Hardcore Strikes</strong><span>${state.strikeCount}/${strikeLimit()}</span></div>
      <div class="strike-track" aria-label="Hardcore strike counter">
        ${Array.from({ length: strikeLimit() }, (_, index) => `<span class="${index < state.strikeCount ? "used" : ""}"></span>`).join("")}
      </div>
      <p class="muted">${state.hardcore.strikes}. ${state.strikeCount >= strikeLimit() ? "Strike limit reached. Submit or pause to review." : "Strikes update when you click Next or Submit."}</p>
      ${state.testNotice ? `<p class="status bad">${state.testNotice}</p>` : ""}
    </div>
  ` : "";
  app.innerHTML = `
    <main class="test-shell">
      <header class="test-header">
        <strong>${questionCounter}</strong>
        <div class="toolbar">${timer}</div>
        <div style="text-align:right;"><span class="status info">${state.test.mode}</span> ${isHardcoreRun() ? `<span class="status ${state.strikeCount >= strikeLimit() ? "bad" : "gold"}">${state.strikeCount}/${strikeLimit()} strikes</span>` : ""} <span class="status gold">${state.test.id}</span></div>
      </header>
      <section class="question-wrap">
        ${hardcorePanel}
        <p class="muted">${q.topic} - ${q.difficulty}</p>
        <h1 class="question-text">${q.text}</h1>
        <div class="choices">
          ${q.options.map((opt, i) => {
            const letter = "ABCD"[i];
            return `<button class="choice ${state.answers[state.current] === letter ? "selected" : ""} ${showAnswers && letter === q.answer ? "correct" : ""}" onclick="selectAnswer(${state.current}, '${letter}')"><span class="letter">${letter}</span><span>${opt}${showAnswers && letter === q.answer ? ` <span class="status good">Correct</span>` : ""}</span></button>`;
          }).join("")}
          ${!isHardcoreRun() || state.hardcore.allowUnsure ? `<button class="choice ${state.answers[state.current] === "IDK" ? "selected" : ""}" onclick="selectAnswer(${state.current}, 'IDK')"><span class="letter">?</span><span>I Don't Know</span></button>` : ""}
        </div>
        ${showExplanation ? `<div class="notice" style="margin-top:14px;"><strong>Explanation</strong><p class="muted">${escapeHtml(q.explanation || "No explanation provided.")}</p></div>` : ""}
      </section>
      <footer class="test-footer">
        <button class="button" onclick="pauseCurrentTest()">Pause</button>
        <div class="report-inline">
          <button class="button" onclick="toggleReportForm()">${state.reportFormOpen ? "Cancel Report" : "! Report"}</button>
          ${state.reportFormOpen ? `
            <label class="field compact-field">Report Reason
              <select onchange="state.reportReason=this.value">
                ${["Too difficult", "Incorrect answer", "Strange wording", "Other"].map(reason => `<option ${state.reportReason === reason ? "selected" : ""}>${reason}</option>`).join("")}
              </select>
            </label>
            <label class="field compact-field">Comments
              <input value="${escapeHtml(state.reportComments)}" placeholder="Optional details" onchange="state.reportComments=this.value">
            </label>
            <button class="button primary" onclick="reportQuestion()">Submit Report</button>
          ` : ""}
        </div>
        <div class="actions" style="justify-content:flex-end;">
          ${isHardcoreRun() ? `<button class="button" disabled>Previous locked</button>` : `<button class="button" ${state.current === 0 ? "disabled" : ""} onclick="state.current--; state.reportFormOpen=false; state.reportComments=''; render()">Previous</button>`}
          ${endRunButton}
          ${nextButton}
        </div>
      </footer>
    </main>
  `;
}

function reportQuestion() {
  if (!state.test) return;
  const q = state.test.questions[state.current];
  const reportId = `${state.test.id}-${state.current + 1}`;
  const existing = state.reportQueue.find(report => report.id === reportId);
  if (existing) {
    state.testNotice = "This question is already in the admin report queue.";
    render();
    return;
  }
  const report = {
    id: reportId,
    priority: "1 report",
    reason: state.reportReason,
    userComments: state.reportComments.trim(),
    question: q.text,
    questionId: q.id || "",
    questionSnapshot: questionSnapshot(q),
    status: "Open",
    testId: state.test.id,
    topic: q.topic,
    difficulty: q.difficulty,
    reportedAt: new Date().toLocaleString()
  };
  state.reportQueue.unshift(report);
  persistReportQueue();
  state.reportComments = "";
  state.reportFormOpen = false;
  state.testNotice = "Report submitted. The question was added to the admin report queue.";
  render();
  if (hasSupabaseConfig()) {
    insertSupabaseQuestionReport(report)
      .then(savedReport => {
        state.reportQueue = state.reportQueue.map(item => item.id === reportId ? savedReport : item);
        persistReportQueue();
        state.testNotice = "Report submitted and saved to Supabase.";
        render();
      })
      .catch(error => {
        state.testNotice = `Report saved locally. Supabase save failed: ${error.message}`;
        render();
      });
  }
}

function results() {
  const s = score();
  const reviewItems = completedQuestionReviewItems();
  const topicStats = currentTestTopicStats();
  const elapsedLabel = formatElapsedTime(testElapsedSeconds());
  const missedCount = reviewItems.filter(item => item.missed).length;
  const reviewHeading = isDiagnosticTest()
    ? `Question Review - ${missedCount} missed question${missedCount === 1 ? "" : "s"} first`
    : "Question Review";
  layout("Results", `
    <div class="grid">
      ${state.testEndReason ? `<section class="card panel span-12"><span class="status bad">${state.testEndReason}</span></section>` : ""}
      <section class="card panel span-3 metric"><span class="muted">Score</span><strong>${s.correct}/${s.total}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Percentage</span><strong>${s.percent}%</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Time Spent</span><strong>${elapsedLabel}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">I Don't Know</span><strong>${s.unsure}</strong></section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Test ID</h2><span class="status info">${escapeHtml(state.test?.id || "")}</span></div>
        <p class="muted">This ID stores category, difficulty, topic tags, question count, pool timestamp, and creation date. It does not store the generated question list or answer session.</p>
        <button class="button" onclick="state.testIdLookup.input=${jsString(state.test?.id || "")}; lookupTestId(); setRoute('testid')">Preview This Test ID</button>
      </section>
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">${reviewHeading}</h2><span class="status ${missedCount ? "gold" : "good"}">${missedCount ? "Review misses" : "No misses"}</span></div>
        <div class="result-review-list">
          ${reviewItems.map(item => {
            const q = item.question;
            const submittedText = item.submitted
              ? item.submitted === "IDK" ? "I Don't Know" : `${item.submitted}${optionTextForAnswer(q, item.submitted) ? ` - ${optionTextForAnswer(q, item.submitted)}` : ""}`
              : "Not answered";
            const correctText = `${q.answer}${optionTextForAnswer(q, q.answer) ? ` - ${optionTextForAnswer(q, q.answer)}` : ""}`;
            return `
              <article class="result-review-card ${item.missed ? "missed" : "correct"}">
                <div class="split">
                  <span class="status ${item.missed ? "bad" : "good"}">${item.missed ? "Missed" : "Correct"}</span>
                  <span class="muted">Question ${item.originalIndex + 1}</span>
                </div>
                <h3>${escapeHtml(q.text)}</h3>
                <div class="result-answer-grid">
                  <div><span class="muted">Submitted</span><strong>${escapeHtml(submittedText)}</strong></div>
                  <div><span class="muted">Correct</span><strong>${escapeHtml(correctText)}</strong></div>
                </div>
                <div class="chips">${questionTopicTagsForResults(q).map(topic => `<span class="chip">${escapeHtml(topic)}</span>`).join("")}</div>
                <div class="notice"><strong>Explanation</strong><p class="muted">${escapeHtml(q.explanation || "No explanation provided.")}</p></div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
      <aside class="card panel span-4">
        <h2 class="section-title">${isDiagnosticTest() ? "Diagnostic Tag Analytics" : "Test Tag Analytics"}</h2>
        <p class="muted">Scores by topic tag for this completed ${isDiagnosticTest() ? "diagnostic" : "test"}.</p>
        ${topicPercentRows(topicStats)}
        <h2 class="section-title">Exports</h2>
        ${state.account === "premium" ? `<div class="actions"><button class="button">Export PDF</button><button class="button">Export CSV</button></div>` : `<p class="muted">Upgrade to Premium to export results.</p>`}
      </aside>
    </div>
  `);
}

function analyticsRows(items) {
  return items.map(item => {
    const percent = Number(item.match(/\d+/)?.[0] || 50);
    return `<div style="margin:12px 0;"><div class="split"><strong>${item.replace(/\s\d+%/, "")}</strong><span>${percent}%</span></div><div class="bar"><i style="width:${percent}%"></i></div></div>`;
  }).join("");
}

function topicPercentRows(stats) {
  if (!stats.length) return `<p class="muted">No topic attempts recorded yet.</p>`;
  return stats.map(stat => {
    const percent = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
    return `<div style="margin:12px 0;"><div class="split"><strong>${escapeHtml(stat.topic)}</strong><span>${percent}% (${stat.correct}/${stat.total})</span></div><div class="bar"><i style="width:${percent}%"></i></div></div>`;
  }).join("");
}

function difficultyPercentRows() {
  const ordered = difficulties
    .map(difficulty => state.difficultyStats.find(stat => stat.difficulty === difficulty) || { difficulty, correct: 0, total: 0 })
    .concat(state.difficultyStats.filter(stat => !difficulties.includes(stat.difficulty)));
  return ordered.map(stat => {
    const percent = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
    return `<div style="margin:12px 0;"><div class="split"><strong>${escapeHtml(stat.difficulty)}</strong><span>${stat.total ? `${percent}% (${stat.correct}/${stat.total})` : "No attempts"}</span></div><div class="bar"><i style="width:${percent}%"></i></div></div>`;
  }).join("");
}

function confidenceRows() {
  const rows = state.confidenceStats
    .filter(stat => stat.total > 0)
    .slice()
    .sort((a, b) => (b.unsure / b.total) - (a.unsure / a.total))
    .slice(0, 6);
  if (!rows.length) return `<p class="muted">No I Don't Know answers recorded yet.</p>`;
  return rows.map(stat => {
    const percent = Math.round((stat.unsure / stat.total) * 100);
    return `<div style="margin:12px 0;"><div class="split"><strong>I Don't Know - ${escapeHtml(stat.topic)}</strong><span>${percent}% (${stat.unsure}/${stat.total})</span></div><div class="bar"><i style="width:${percent}%"></i></div></div>`;
  }).join("");
}

function scoreHistoryChart() {
  const history = state.scoreHistory.slice(-12);
  return `<div class="mini-chart">${history.map(entry => `<i title="${escapeHtml(entry.date)} ${entry.percent}%" style="height:${Math.max(4, entry.percent)}%"></i>`).join("")}</div>`;
}

function scoreHistoryTable() {
  return `
    <table class="table">
      <tr><th>Date</th><th>Mode</th><th>Test ID</th><th>Score</th><th>Topics</th></tr>
      ${state.scoreHistory.slice(-8).reverse().map(entry => `<tr><td>${escapeHtml(entry.date)}</td><td>${escapeHtml(entry.mode)}</td><td>${escapeHtml(entry.id)}</td><td>${entry.correct}/${entry.total} - ${entry.percent}%</td><td>${escapeHtml((entry.topics || []).slice(0, 4).join(", "))}</td></tr>`).join("")}
    </table>
  `;
}

function historyCards() {
  const entries = state.scoreHistory.slice().reverse();
  if (!entries.length) return `<section class="card panel"><p class="muted">No completed tests yet.</p></section>`;
  return entries.map(entry => {
    const topicsText = (entry.topics || []).slice(0, 5).join(", ") || "Manual tags";
    return `
      <button class="card history-card" onclick="setRoute('results')">
        <span class="status info">${escapeHtml(entry.mode)}</span>
        <strong>${escapeHtml(entry.id)}</strong>
        <span>${entry.percent}% - ${entry.correct}/${entry.total}</span>
        <span class="muted">${escapeHtml(entry.date)}${entry.category ? ` - ${escapeHtml(entry.category)}` : ""}</span>
        <span class="muted">${escapeHtml(entry.difficulty || `${entry.total} questions`)}</span>
        <span class="muted">${escapeHtml(topicsText)}</span>
      </button>
    `;
  }).join("");
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, content, type = "text/csv") {
  state.exportFilename = filename;
  state.exportPreview = content;
  state.exportStatus = `Generated ${filename}. If the browser blocks downloads, use the preview below.`;
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    state.exportStatus = `Generated ${filename}, but automatic download was blocked. Use the preview below.`;
  }
  if (state.route === "exports") render();
}

function exportTestResults() {
  const rows = [
    ["Date", "Mode", "Test ID", "Score", "Total", "Percent", "Category", "Difficulty", "Topics"],
    ...state.scoreHistory.map(entry => [
      entry.date,
      entry.mode,
      entry.id,
      entry.correct,
      entry.total,
      `${entry.percent}%`,
      entry.category || "",
      entry.difficulty || "",
      (entry.topics || []).join("; ")
    ])
  ];
  downloadTextFile("lift-off-test-results.csv", rows.map(row => row.map(csvEscape).join(",")).join("\n"));
}

function exportAnalyticsReport() {
  const topicRows = state.topicStats.map(stat => {
    const percent = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
    return [stat.topic, stat.correct, stat.total, `${percent}%`];
  });
  const difficultyRows = state.difficultyStats.map(stat => {
    const percent = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
    return [stat.difficulty, stat.correct, stat.total, `${percent}%`];
  });
  const confidenceExportRows = state.confidenceStats.map(stat => {
    const percent = stat.total ? Math.round((stat.unsure / stat.total) * 100) : 0;
    return [stat.topic, stat.unsure, stat.total, `${percent}%`];
  });
  const scoreRows = state.scoreHistory.map(entry => [entry.date, entry.mode, entry.id, `${entry.percent}%`]);
  const rows = [
    ["Analytics Report"],
    [],
    ["Score History"],
    ["Date", "Mode", "Test ID", "Percent"],
    ...scoreRows,
    [],
    ["Topic Percent Correct"],
    ["Topic", "Correct", "Attempts", "Percent"],
    ...topicRows,
    [],
    ["Difficulty Percent Correct"],
    ["Difficulty", "Correct", "Attempts", "Percent"],
    ...difficultyRows,
    [],
    ["Confidence - I Don't Know Rate"],
    ["Topic", "I Don't Know", "Attempts", "Percent"],
    ...confidenceExportRows
  ];
  downloadTextFile("lift-off-analytics-report.csv", rows.map(row => row.map(csvEscape).join(",")).join("\n"));
}

function exportPerformanceHistory() {
  const entries = state.scoreHistory.slice().reverse();
  const average = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.percent, 0) / entries.length) : 0;
  const rows = [
    ["Completed", entries.length],
    ["Average", `${average}%`],
    ["Best", `${entries.length ? Math.max(...entries.map(entry => entry.percent)) : 0}%`],
    ["Recent", `${entries[0]?.percent ?? 0}%`],
    [],
    ["Date", "Mode", "Test ID", "Correct", "Total", "Percent", "Topics"],
    ...entries.map(entry => [entry.date, entry.mode, entry.id, entry.correct, entry.total, `${entry.percent}%`, (entry.topics || []).join("; ")])
  ];
  downloadTextFile("lift-off-performance-history.csv", rows.map(row => row.map(csvEscape).join(",")).join("\n"));
}

async function fetchOwnRows(client, table, columns = "*") {
  const { data, error } = await client
    .from(table)
    .select(columns)
    .eq("user_id", state.user.id);
  if (error) throw new Error(`${table}: ${supabaseErrorMessage(error)}`);
  return data || [];
}

async function fetchOwnSingle(client, table, columns = "*") {
  const { data, error } = await client
    .from(table)
    .select(columns)
    .eq("user_id", state.user.id)
    .maybeSingle();
  if (error) throw new Error(`${table}: ${supabaseErrorMessage(error)}`);
  return data || null;
}

async function fetchOwnProfileForExport(client) {
  try {
    return await fetchOwnSingle(client, "profiles", "user_id,display_name,phone,role,account_tier,suspended_until,created_at,updated_at");
  } catch (error) {
    if (!/account_tier/i.test(error.message || "")) throw error;
    const profile = await fetchOwnSingle(client, "profiles", "user_id,display_name,phone,role,account_type,suspended_until,created_at,updated_at");
    return profile ? { ...profile, account_tier: profile.account_type } : profile;
  }
}

async function supabaseAccountExportPayload() {
  if (!state.user) throw new Error("Sign in before exporting Supabase account data.");
  if (!hasSupabaseConfig()) throw new Error("Connect Supabase before exporting account data.");
  const client = await supabaseClient();
  const [
    profile,
    preferences,
    testHistory,
    topicStats,
    questionStatuses,
    activeSessions,
    customBlueprints,
    deletionRequests,
    notifications,
    billingCustomer,
    subscriptions
  ] = await Promise.all([
    fetchOwnProfileForExport(client),
    fetchOwnSingle(client, "user_preferences", "*"),
    fetchOwnRows(client, "user_test_history", "*"),
    fetchOwnRows(client, "user_topic_stats", "*"),
    fetchOwnRows(client, "user_question_status", "*"),
    fetchOwnRows(client, "user_active_sessions", "*"),
    fetchOwnRows(client, "user_custom_blueprints", "*"),
    fetchOwnRows(client, "account_deletion_requests", "*"),
    fetchOwnRows(client, "user_notifications", "*"),
    fetchOwnSingle(client, "billing_customers", "*"),
    fetchOwnRows(client, "subscriptions", "*")
  ]);
  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: state.user.id,
      email: state.user.email,
      providers: state.user.app_metadata?.providers || []
    },
    profile,
    preferences,
    testHistory,
    topicStats,
    questionStatuses,
    activeSessions,
    customBlueprints,
    deletionRequests,
    notifications,
    billingCustomer,
    subscriptions
  };
}

async function exportSupabaseAccountData() {
  state.exportStatus = "Loading Supabase account data...";
  render();
  try {
    const payload = await supabaseAccountExportPayload();
    downloadTextFile("lift-off-supabase-account-data.json", JSON.stringify(payload, null, 2), "application/json");
  } catch (error) {
    state.exportStatus = `Could not export Supabase account data: ${error.message}`;
    render();
  }
}

async function exportSupabaseTestHistory() {
  state.exportStatus = "Loading Supabase test history...";
  render();
  try {
    if (!state.user) throw new Error("Sign in before exporting Supabase test history.");
    const client = await supabaseClient();
    const rowsFromSupabase = await fetchOwnRows(client, "user_test_history", "test_id,mode,completed_at,correct,total,percent,topics,category,difficulty,blueprint,question_count");
    const rows = [
      ["Completed At", "Mode", "Test ID", "Correct", "Total", "Percent", "Category", "Difficulty", "Blueprint", "Question Count", "Topics"],
      ...rowsFromSupabase.map(row => [
        row.completed_at,
        row.mode,
        row.test_id,
        row.correct,
        row.total,
        row.percent,
        row.category || "",
        row.difficulty || "",
        row.blueprint || "",
        row.question_count || "",
        (row.topics || []).join("; ")
      ])
    ];
    downloadTextFile("lift-off-supabase-test-history.csv", rows.map(row => row.map(csvEscape).join(",")).join("\n"));
  } catch (error) {
    state.exportStatus = `Could not export Supabase test history: ${error.message}`;
    render();
  }
}

function questionSearchText(question) {
  return [
    question.text,
    question.topic,
    question.category,
    question.difficulty,
    question.explanation,
    question.answer,
    ...(question.options || []),
    ...(question.tags || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

function questionSeenStatus(question, index) {
  if (question.status) return question.status;
  if (question.seenCount === 0) return "Unseen";
  if (question.seenCount > 0) return "Seen";
  return "Unseen";
}

function questionStatusClass(status) {
  if (status === "Unseen") return "gold";
  if (status === "Answered incorrectly" || status === "Previously missed") return "bad";
  if (status === "Answered correctly" || status === "Seen") return "good";
  return "info";
}

function filteredSearchQuestions() {
  const keyword = state.searchFilters.keyword.trim().toLowerCase();
  return activeQuestions()
    .map((question, index) => ({ question, index, status: questionSeenStatus(question, index) }))
    .filter(({ question }) => !keyword || questionSearchText(question).includes(keyword))
    .filter(({ question }) => state.searchFilters.category === "All" || question.category === state.searchFilters.category)
    .filter(({ question }) => state.searchFilters.difficulty === "All" || question.difficulty === state.searchFilters.difficulty)
    .filter(({ status }) => state.searchFilters.seenStatus === "All" || status === state.searchFilters.seenStatus);
}

function updateSearchKeywordDraft(value) {
  state.searchKeywordDraft = value;
  if (searchKeywordTimer) clearTimeout(searchKeywordTimer);
  searchKeywordTimer = setTimeout(() => {
    state.searchFilters.keyword = state.searchKeywordDraft;
    searchKeywordTimer = null;
    if (state.route === "search") render();
  }, 450);
}

function analytics() {
  const topicStats = state.topicStats
    .slice()
    .sort((a, b) => (Math.round((a.correct / a.total) * 100) || 0) - (Math.round((b.correct / b.total) * 100) || 0));
  const weakAreas = topicStats.slice(0, 3);
  layout("Analytics", `
    <div class="grid">
      <section class="card panel span-12"><p class="status info">${escapeHtml(state.userDataStatus)}</p></section>
      <section class="card panel span-8"><h2 class="section-title">Score History</h2>${scoreHistoryChart()}${scoreHistoryTable()}</section>
      <section class="card panel span-4"><h2 class="section-title">Weak Areas</h2>${weakAreas.map(stat => `<p><span class="status gold">Review</span> ${escapeHtml(stat.topic)}<br><span class="muted">${Math.round((stat.correct / stat.total) * 100)}% correct across ${stat.total} attempt${stat.total === 1 ? "" : "s"}</span></p>`).join("")}</section>
      <section class="card panel span-12"><h2 class="section-title">Percent Correct By Topic Tag</h2>${topicPercentRows(topicStats.slice().sort((a, b) => a.topic.localeCompare(b.topic)))}</section>
      <section class="card panel span-6"><h2 class="section-title">Difficulty</h2>${difficultyPercentRows()}</section>
      <section class="card panel span-6"><h2 class="section-title">Confidence</h2>${confidenceRows()}</section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Recommendation Window</h2><span class="status info">Past 30 days</span></div>
        <div class="history-grid">
          ${weakAreas.map((area, i) => `<div class="card history-card"><strong>${i + 1}. ${escapeHtml(area.topic)}</strong><span class="muted">Prioritized because it is one of the three weakest qualifying areas with enough sample data.</span><button class="button" onclick="state.selected.topics=[${jsString(area.topic)}]; state.selected.blueprint='__manual__'; setRoute('generator')">Practice ${escapeHtml(area.topic)}</button></div>`).join("")}
        </div>
      </section>
    </div>
  `);
}

function exportsPage() {
  const exportRows = [
    ["Test Results", "CSV", "History tests", "exportTestResults()"],
    ["Analytics Report", "CSV", "Analytics page", "exportAnalyticsReport()"],
    ["Performance History", "CSV", "History page", "exportPerformanceHistory()"],
    ["Supabase Account Data", "JSON", "All signed-in user tables", "exportSupabaseAccountData()"],
    ["Supabase Test History", "CSV", "user_test_history table", "exportSupabaseTestHistory()"]
  ];
  layout("Exports", `
    <div class="grid">
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">Export Center</h2><span class="status info">${escapeHtml(state.exportStatus)}</span></div>
        <table class="table">
          <tr><th>Data</th><th>Format</th><th>Source</th><th>Action</th></tr>
          ${exportRows.map(([data, format, source, action]) => `<tr><td>${data}</td><td>${format}</td><td>${source}</td><td><button class="chip" onclick="${action}">Export</button></td></tr>`).join("")}
        </table>
        ${state.exportPreview ? `
          <label class="field">Generated Export Preview: ${escapeHtml(state.exportFilename)}
            <textarea class="code-input" readonly>${escapeHtml(state.exportPreview)}</textarea>
          </label>
        ` : ""}
      </section>
      <aside class="card panel span-4">
        <h2 class="section-title">Prototype Export Rule</h2>
        <p class="muted">Exports are enabled in this prototype for testing. Production can reapply premium gating later.</p>
        <button class="button primary" onclick="upgradeForPremium('exports')">Upgrade for Exports</button>
      </aside>
    </div>
  `);
}

function history() {
  const entries = state.scoreHistory;
  const average = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.percent, 0) / entries.length) : 0;
  layout("History", `
    <div class="grid">
      <section class="card panel span-12"><p class="status info">${escapeHtml(state.userDataStatus)}</p></section>
      <section class="card panel span-3 metric"><span class="muted">Completed</span><strong>${entries.length}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Average</span><strong>${average}%</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Best</span><strong>${entries.length ? Math.max(...entries.map(entry => entry.percent)) : 0}%</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Recent</span><strong>${entries.at(-1)?.percent ?? 0}%</strong></section>
      <section class="span-12">
        <div class="history-grid">${historyCards()}</div>
      </section>
    </div>
  `);
}

function questionBank() {
  requestUserQuestionStatuses();
  layout("Question Bank", questionBankContent());
}

function questionBankContent() {
  const bank = activeQuestions();
  return `
    <div class="grid">
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">Supabase Connection</h2><span class="status ${state.bankSource.startsWith("Supabase") ? "good" : "gold"}">${state.supabaseStatus}</span></div>
        <div class="form-grid">
          <label class="field">Project URL
            <input value="${state.supabaseConfig.url}" placeholder="https://your-project.supabase.co" onchange="state.supabaseConfig.url=this.value.trim(); saveSupabaseConfig()">
          </label>
          <label class="field">Anon public key
            <input type="password" value="${state.supabaseConfig.anonKey}" placeholder="eyJhbGciOi..." onchange="state.supabaseConfig.anonKey=this.value.trim(); saveSupabaseConfig()">
          </label>
          <label class="field">Table name
            <input value="${state.supabaseConfig.table}" onchange="state.supabaseConfig.table=this.value.trim() || 'questions'; saveSupabaseConfig()">
          </label>
          <div class="field">
            <label>Actions</label>
            <div class="actions">
              <button class="button primary" onclick="loadSupabaseBank()">Load From Supabase</button>
              <button class="button" onclick="state.questionBank=sampleQuestions; state.questionStatusLoadedKey=''; state.bankSource='Sample bank'; state.supabaseStatus='Using sample questions.'; render()">Use Sample Bank</button>
            </div>
          </div>
        </div>
        <div class="notice" style="margin-top:14px;">Question reads use the anon key. Question changes use the current signed-in account and require Administrator or Owner permission through Supabase RLS. Never place a service-role key in the browser.</div>
        <div class="notice" style="margin-top:14px;border-left-color:var(--gold);">For production, enable RLS and create an insert policy restricted to authenticated admins. For a local prototype only, you can temporarily allow anon inserts, but that is not safe for a public app.</div>
        <div class="notice" style="margin-top:14px;border-left-color:var(--info);"><strong>Google Login Setup</strong><p class="muted">Add <code>${escapeHtml(supabaseOAuthCallbackUrl())}</code> to Google Cloud OAuth Authorized redirect URIs. Add <code>${escapeHtml(appRedirectUrl())}</code> to Supabase Auth redirect URLs.</p></div>
        <div class="notice" style="margin-top:14px;border-left-color:var(--info);">The loader fetches all rows in pages of 1,000, then imports valid rows and reports skipped rows below.</div>
        <p class="muted">Starter files: <code>supabase-schema.sql</code> and <code>sample-questions.json</code> are included beside this website.</p>
      </section>
      <aside class="card panel span-4">
        <h2 class="section-title">Expected Columns</h2>
        <p class="muted">The loader accepts the PRD JSON shape and common database variants.</p>
        <table class="table">
          <tr><th>Question</th><td>question_text</td></tr>
          <tr><th>Choices</th><td>options JSON array, A./B./C./D. text block, pipe-separated text, option_a through option_d, or optionA through optionD</td></tr>
          <tr><th>Answer</th><td>correct_option_id accepts A, B, C, D, or optionA through optionD</td></tr>
          <tr><th>Metadata</th><td>difficulty, partition_key, topic, tags</td></tr>
          <tr><th>Status</th><td>status defaults to Unseen, seen_count defaults to 0</td></tr>
          <tr><th>Explanation</th><td>explanation</td></tr>
        </table>
      </aside>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Active Bank Preview</h2><span class="status info">${bank.length} questions</span></div>
        <div class="chips" style="margin-bottom:12px;">
          <span class="status info">${state.supabaseLastLoad.totalRows} rows returned</span>
          <span class="status good">${state.supabaseLastLoad.validRows} valid</span>
          <span class="status ${state.supabaseLastLoad.skippedRows ? "gold" : "good"}">${state.supabaseLastLoad.skippedRows} skipped</span>
        </div>
        <table class="table">
          <tr><th>Question</th><th>Category</th><th>Topic</th><th>Difficulty</th><th>Status</th><th>Answer</th></tr>
          ${bank.slice(0, 12).map(q => `<tr><td>${q.text}</td><td>${q.category || "Marketing"}</td><td>${q.topic}</td><td>${q.difficulty}</td><td><span class="status ${questionStatusClass(q.status || "Unseen")}">${q.status || "Unseen"}</span></td><td>${q.answer}</td></tr>`).join("")}
        </table>
      </section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Import Issues</h2><span class="status ${state.supabaseImportIssues.length ? "gold" : "good"}">${state.supabaseImportIssues.length} skipped rows</span></div>
        ${state.supabaseImportIssues.length ? `
          <table class="table">
            <tr><th>Row</th><th>ID / Key</th><th>Question</th><th>Problem</th></tr>
            ${state.supabaseImportIssues.slice(0, 50).map(issue => `<tr><td>${issue.row}</td><td>${escapeHtml(issue.id)}</td><td>${escapeHtml(issue.question).slice(0, 160)}</td><td>${escapeHtml(issue.reasons)}</td></tr>`).join("")}
          </table>
          ${state.supabaseImportIssues.length > 50 ? `<p class="muted">Showing first 50 issues. Fix these row shapes in Supabase, then reload.</p>` : ""}
        ` : `<p class="muted">No skipped rows from the latest load.</p>`}
      </section>
    </div>
  `;
}

function search() {
  requestUserQuestionStatuses();
  if (state.searchKeywordDraft === null) state.searchKeywordDraft = state.searchFilters.keyword;
  const results = filteredSearchQuestions();
  const keyword = state.searchFilters.keyword.trim();
  const keywordDraft = state.searchKeywordDraft ?? state.searchFilters.keyword;
  layout("Question Search", `
    <section class="card panel">
      <div class="split"><h2 class="section-title">Search Results</h2><span class="status info">${results.length} match${results.length === 1 ? "" : "es"}</span></div>
      <p class="muted">${escapeHtml(state.questionStatusStatus)}</p>
      ${reviewQuestionPanel()}
      <div class="form-grid">
        <label class="field">Keyword <input value="${escapeHtml(keywordDraft)}" placeholder="Search questions, choices, topics, explanations..." oninput="updateSearchKeywordDraft(this.value)"></label>
        <label class="field">Category <select onchange="state.searchFilters.category=this.value; render()"><option>All</option>${categories.map(c => `<option ${state.searchFilters.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label class="field">Difficulty <select onchange="state.searchFilters.difficulty=this.value; render()"><option>All</option>${difficulties.map(d => `<option ${state.searchFilters.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
        <label class="field">Question Status <select onchange="state.searchFilters.seenStatus=this.value; render()">${["All", "Unseen", "Seen", "Answered correctly", "Answered incorrectly"].map(status => `<option ${state.searchFilters.seenStatus === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
      </div>
      ${keyword ? `<p class="muted">Searching for: <strong>${escapeHtml(keyword)}</strong></p>` : ""}
      <table class="table"><tr><th>Question</th><th>Metadata</th><th>Status</th><th>Review</th></tr>${results.length ? results.map(({ question: q, index, status }) => `<tr><td>${escapeHtml(q.text)}</td><td>Seen ${q.seenCount ?? 0} time(s), ${escapeHtml(q.topic)}, ${escapeHtml(q.difficulty)}</td><td><span class="status ${questionStatusClass(status)}">${escapeHtml(status)}</span></td><td><button class="chip" onclick="reviewQuestion(${index})">${status === "Unseen" ? "Open warning" : "View"}</button> <button class="chip" onclick="startTest('Search Practice')">Attempt</button></td></tr>`).join("") : `<tr><td colspan="4" class="muted">No questions match the current search.</td></tr>`}</table>
    </section>
  `);
}

function reviewQuestion(index) {
  const q = activeQuestions()[index];
  if (!q) return;
  state.reviewQuestionIndex = index;
  state.reviewQuestionConfirmed = questionSeenStatus(q, index) !== "Unseen";
  render();
}

function closeQuestionReview() {
  state.reviewQuestionIndex = null;
  state.reviewQuestionConfirmed = false;
  render();
}

function showQuestionReviewDetails() {
  state.reviewQuestionConfirmed = true;
  render();
}

function reviewQuestionPanel() {
  if (state.reviewQuestionIndex === null) return "";
  const q = activeQuestions()[state.reviewQuestionIndex];
  if (!q) return "";
  const status = questionSeenStatus(q, state.reviewQuestionIndex);
  const optionRows = (q.options || []).map((option, i) => {
    const letter = String.fromCharCode(65 + i);
    const isCorrect = letter === q.answer;
    return `<li><strong>${letter}.</strong> ${escapeHtml(option)}${state.reviewQuestionConfirmed && isCorrect ? ` <span class="status good">Correct</span>` : ""}</li>`;
  }).join("");
  if (!state.reviewQuestionConfirmed) {
    return `
      <div class="notice" style="margin-bottom:14px;border-left-color:var(--gold);">
        <div class="split">
          <strong>Unseen question warning</strong>
          <button class="chip" onclick="closeQuestionReview()">Close</button>
        </div>
        <p class="muted">Viewing the answer may reduce future practice value for this question.</p>
        <div class="actions">
          <button class="button primary" onclick="showQuestionReviewDetails()">View Answer</button>
          <button class="button" onclick="closeQuestionReview()">Close Question</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="notice" style="margin-bottom:14px;">
      <div class="split">
        <strong>${escapeHtml(status)} question review</strong>
        <button class="chip" onclick="closeQuestionReview()">Close</button>
      </div>
      <p><strong>${escapeHtml(q.text)}</strong></p>
      <ul>${optionRows}</ul>
      <p><strong>Correct answer:</strong> ${escapeHtml(q.answer)}</p>
      <p class="muted">${escapeHtml(q.explanation || "No explanation provided.")}</p>
      <div class="chips">
        <span class="status info">${escapeHtml(q.topic || "No topic")}</span>
        <span class="status info">${escapeHtml(q.difficulty || "No difficulty")}</span>
      </div>
    </div>
  `;
}

function billingStatusClass() {
  const status = String(state.billing.subscription?.status || "").toLowerCase();
  if (subscriptionIsPremium()) return "good";
  if (["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(status) || /could not|failed|error/i.test(state.billing.status)) return "bad";
  if (["canceled", "cancelled", "inactive"].includes(status)) return "gold";
  return "info";
}

function subscriptionPanel() {
  const subscription = state.billing.subscription;
  const planLabel = subscriptionIsPremium(subscription) ? "Premium" : "Free";
  const statusLabel = subscription?.status || "No subscription";
  const periodEnd = subscription?.currentPeriodEnd ? formatDateTime(subscription.currentPeriodEnd) : "-";
  const manageDisabled = !state.user || !subscription?.customerId || state.billing.loading;
  return `
    <section class="card panel span-6">
      <div class="split"><h2 class="section-title">Subscription</h2><span class="status ${billingStatusClass()}">${escapeHtml(planLabel)}</span></div>
      <p class="status ${billingStatusClass()}">${escapeHtml(state.billing.status)}</p>
      <table class="table">
        <tr><th>Plan</th><td>${escapeHtml(planLabel)}</td></tr>
        <tr><th>Stripe Status</th><td>${escapeHtml(statusLabel)}</td></tr>
        <tr><th>Renews Through</th><td>${escapeHtml(periodEnd)}</td></tr>
        <tr><th>Cancel At Period End</th><td>${subscription?.cancelAtPeriodEnd ? "Yes" : "No"}</td></tr>
      </table>
      <div class="actions">
        <button class="button primary" onclick="startCheckout()" ${state.billing.loading || !state.user ? "disabled" : ""}>${subscriptionIsPremium(subscription) ? "Change Plan" : "Upgrade Membership"}</button>
        <button class="button" onclick="openCustomerPortal()" ${manageDisabled ? "disabled" : ""}>Manage Billing</button>
        <button class="button" onclick="refreshBillingStatus()" ${state.billing.loading || !state.user ? "disabled" : ""}>Refresh Status</button>
      </div>
      <p class="muted">Stripe checkout and billing changes run through Supabase Edge Functions. The browser only receives redirect URLs, never Stripe secret keys.</p>
    </section>
  `;
}

function settings() {
  const notificationOptions = [
    ["all", "All Notifications"],
    ["testCompletion", "Test Completion"],
    ["weeklyProgressReports", "Weekly Progress Reports"],
    ["billing", "Billing"],
    ["account", "Account"],
    ["performanceReports", "Performance Reports"]
  ];
  const deletionActive = Boolean(state.deletionRequest);
  const deletionStatus = deletionActive
    ? `${escapeHtml(state.deletionRequest.status)} until ${escapeHtml(formatDateTime(state.deletionRequest.recoverableUntil))}`
    : escapeHtml(state.deletionForm.status);
  const unreadNotifications = state.userNotifications.filter(item => !item.read_at);
  const pendingEmailPanel = state.accountSettings.pendingEmail ? `
    <div class="notice" style="margin-top:12px;border-left-color:var(--gold);">
      <div class="split"><strong>Email confirmation pending</strong><span class="status gold">${escapeHtml(state.accountSettings.pendingEmail)}</span></div>
      <p class="muted">Open the confirmation link sent by Supabase to finish changing your account email. Your current sign-in email remains ${escapeHtml(state.user?.email || "unchanged")} until confirmation is complete.</p>
      <div class="actions"><button class="button" onclick="resendPendingEmailChange()">Resend Confirmation</button><button class="button" onclick="cancelPendingEmailChange()">Cancel Change</button></div>
    </div>
  ` : "";
  layout("Account Settings", `
    <div class="grid">
      ${unreadNotifications.length ? `<section class="card panel span-12"><h2 class="section-title">Account Notifications</h2>${unreadNotifications.map(item => `<div class="notice" style="margin-bottom:10px;border-left-color:var(--gold);"><div class="split"><strong>${escapeHtml(item.title)}</strong><button class="chip" onclick='markNotificationRead(${jsString(item.id)})'>Mark Read</button></div><p class="muted">${escapeHtml(item.message)}</p><span class="status gold">${escapeHtml(item.delivery_status || "Queued")}</span></div>`).join("")}</section>` : ""}
      <section class="card panel span-6">
        <h2 class="section-title">Account</h2>
        <p class="status info">${escapeHtml(state.accountSettings.status || state.userDataStatus)}</p>
        <label class="field">Display Name <input value="${escapeHtml(state.accountSettings.displayName || "")}" oninput="state.accountSettings.displayName=this.value"></label>
        <label class="field">Email <input type="email" value="${escapeHtml(state.accountSettings.email || state.user?.email || state.authForm.email)}" oninput="state.accountSettings.email=this.value"></label>
        ${pendingEmailPanel}
        <label class="field">Phone <input value="${escapeHtml(state.accountSettings.phone || "")}" placeholder="+1 555 0199" oninput="state.accountSettings.phone=this.value"></label>
        <div class="actions"><button class="button primary" onclick="saveAccountSettings()">Save Account</button><button class="button" onclick="changePassword()">Change Password</button><button class="button" onclick="connectGoogleIdentity()">Connect Google</button></div>
        <p class="muted">Email changes may require confirmation in Supabase before the new email becomes active.</p>
      </section>
      ${subscriptionPanel()}
      <section class="card panel span-6"><h2 class="section-title">Notifications</h2>${notificationOptions.map(([key, label]) => `<label><input type="checkbox" ${state.notificationSettings[key] ? "checked" : ""} onchange='toggleNotificationPreference(${jsString(key)})'> ${label}</label><br>`).join("")}<p class="muted">Enabled messages are sent through all selected channels: email and SMS.</p></section>
      <section class="card panel span-6">
        <h2 class="section-title">Account Deletion</h2>
        <p class="status ${deletionActive ? "bad" : "info"}">${deletionStatus}</p>
        <p class="muted">Deletion requests remain recoverable for three months. Aggregate anonymous analytics may remain.</p>
        <div class="actions"><button class="button accent" onclick="setRoute('recovery')">${deletionActive ? "Review Deletion Request" : "Start Deletion Flow"}</button>${deletionActive ? `<button class="button" onclick="cancelAccountDeletion()">Cancel Request</button>` : ""}</div>
      </section>
    </div>
  `);
}

function recovery() {
  const statusIsBad = state.passwordRecovery.status.includes("Error") || state.passwordRecovery.status.includes("Add your") || state.passwordRecovery.status.includes("Enter the");
  const paused = state.pausedSession;
  const pausedProgress = paused?.test?.questions?.length ? `${Number(paused.current || 0) + 1} of ${paused.test.questions.length}` : "No paused session";
  const pausedTimer = paused?.test?.timerSeconds ? formatTimer(Number(paused.test.timerSeconds || 0)) : paused ? "No timer" : "-";
  const deletion = state.deletionRequest;
  const deletionStatusIsBad = deletion || state.deletionForm.status.includes("Type DELETE") || state.deletionForm.status.includes("failed") || state.deletionForm.status.includes("Sign in");
  const unreadNotifications = state.userNotifications.filter(item => !item.read_at);
  layout("Recovery", `
    <div class="grid">
      ${unreadNotifications.length ? `<section class="card panel span-12"><h2 class="section-title">Account Notifications</h2>${unreadNotifications.map(item => `<div class="notice" style="margin-bottom:10px;border-left-color:var(--gold);"><div class="split"><strong>${escapeHtml(item.title)}</strong><button class="chip" onclick='markNotificationRead(${jsString(item.id)})'>Mark Read</button></div><p class="muted">${escapeHtml(item.message)}</p><span class="status gold">${escapeHtml(item.delivery_status || "Queued")}</span></div>`).join("")}</section>` : ""}
      <section class="card panel span-6">
        <h2 class="section-title">Password Recovery</h2>
        <p class="status ${statusIsBad ? "bad" : "info"}">${escapeHtml(state.passwordRecovery.status)}</p>
        <p class="muted">Supabase Authentication sends a secure reset link to the account email.</p>
        <label class="field">Account email
          <input type="email" value="${escapeHtml(state.passwordRecovery.email)}" oninput="state.passwordRecovery.email=this.value">
        </label>
        <div class="actions">
          <button class="button primary" onclick="sendPasswordResetEmail()">Send Reset Link</button>
          <button class="button" onclick="setRoute('login')">Back To Login</button>
        </div>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Session Recovery</h2>
        <p class="muted">Paused tests are saved to Supabase preferences for signed-in users, with local fallback for prototype sessions.</p>
        <table class="table"><tr><th>Saved activity</th><td>${escapeHtml(paused?.test?.mode || "None")}</td></tr><tr><th>Progress</th><td>${escapeHtml(pausedProgress)}</td></tr><tr><th>Timer</th><td>${escapeHtml(pausedTimer)}</td></tr><tr><th>Saved</th><td>${escapeHtml(paused?.savedAt ? formatDateTime(paused.savedAt) : "-")}</td></tr></table>
        <div class="actions"><button class="button primary" ${paused ? "" : "disabled"} onclick="resumePausedSession()">Resume Session</button><button class="button" ${paused ? "" : "disabled"} onclick="clearPausedSession(); render()">Clear Saved Session</button></div>
      </section>
      <section class="card panel span-12">
        <h2 class="section-title">Account Deletion</h2>
        <p class="status ${deletionStatusIsBad ? "bad" : "info"}">${escapeHtml(state.deletionForm.status)}</p>
        ${deletion ? `
          <table class="table">
            <tr><th>Status</th><td>${escapeHtml(deletion.status)}</td></tr>
            <tr><th>Requested</th><td>${escapeHtml(formatDateTime(deletion.requestedAt))}</td></tr>
            <tr><th>Recoverable Until</th><td>${escapeHtml(formatDateTime(deletion.recoverableUntil))}</td></tr>
            <tr><th>Final Warning</th><td>${escapeHtml(formatDateTime(deletion.finalWarningAt))}</td></tr>
            <tr><th>Reason</th><td>${escapeHtml(deletion.reason || "-")}</td></tr>
          </table>
          <div class="actions" style="margin-top:12px;"><button class="button primary" onclick="cancelAccountDeletion()">Cancel Deletion Request</button></div>
        ` : `
          <div class="form-grid">
            <label class="field">Reason <textarea placeholder="Optional" oninput="state.deletionForm.reason=this.value">${escapeHtml(state.deletionForm.reason)}</textarea></label>
            <label class="field">Type DELETE to confirm <input value="${escapeHtml(state.deletionForm.confirmText)}" oninput="state.deletionForm.confirmText=this.value"></label>
            <div class="field"><label>Actions</label><button class="button accent" onclick="requestAccountDeletion()">Request Account Deletion</button></div>
          </div>
        `}
      </section>
      <section class="card panel span-12">
        <h2 class="section-title">Deletion Recovery Window</h2>
        <div class="timeline">
          <div><strong>Day 0</strong><span>Account marked for deletion and subscription cancelled.</span></div>
          <div><strong>Month 0-3</strong><span>User may recover account, history, and analytics.</span></div>
          <div><strong>One week before final deletion</strong><span>Final warning sent to enabled channels.</span></div>
          <div><strong>After three months</strong><span>Personal account, test, and analytics history permanently deleted.</span></div>
        </div>
      </section>
    </div>
  `);
}

function passwordReset() {
  const statusIsBad = state.passwordRecovery.status.includes("Password must") || state.passwordRecovery.status.includes("do not match") || state.passwordRecovery.status.includes("Add your") || state.passwordRecovery.status.includes("expired") || state.passwordRecovery.status.includes("invalid");
  layout("New Password", `
    <section class="hero">
      <div class="card panel" style="width:min(460px,100%);">
        <div class="brand">${logoMarkup()}</div>
        <h1 class="page-title">Create New Password</h1>
        <p class="status ${statusIsBad ? "bad" : "info"}">${escapeHtml(state.passwordRecovery.status)}</p>
        <div class="form-grid" style="grid-template-columns:1fr;">
          <label class="field">New password
            <input type="password" value="${escapeHtml(state.passwordRecovery.newPassword)}" oninput="state.passwordRecovery.newPassword=this.value">
          </label>
          <label class="field">Confirm new password
            <input type="password" value="${escapeHtml(state.passwordRecovery.confirmPassword)}" oninput="state.passwordRecovery.confirmPassword=this.value">
          </label>
          <button class="button primary" onclick="updateRecoveryPassword()">Update Password</button>
          <button class="button" onclick="forgotPassword()">Send Another Reset Link</button>
        </div>
        <p class="muted">If this screen opened from an email link, the password will update for that account. Signed-in users can also use this screen from Account Settings.</p>
      </div>
    </section>
  `);
}

function reportEditorPanel() {
  const report = state.reportQueue.find(item => item.id === state.selectedReportId);
  const form = state.reportEditForm;
  if (!report) {
    return `
      <section class="card panel span-4">
        <h2 class="section-title">Question Editor</h2>
        <p class="muted">${escapeHtml(state.reportEditStatus)}</p>
        <p class="muted">Choose a report from the queue to inspect and correct the linked question.</p>
      </section>
    `;
  }
  return `
    <section class="card panel span-4">
      <div class="split"><h2 class="section-title">Question Editor</h2><span class="status ${report.status === "Fixed" ? "good" : "gold"}">${escapeHtml(report.status)}</span></div>
      <p class="muted">${escapeHtml(state.reportEditStatus)}</p>
      <table class="table compact-table">
        <tr><th>Report</th><td>${escapeHtml(report.id)}</td></tr>
        <tr><th>Question ID</th><td>${escapeHtml(form.id || "No Supabase UUID")}</td></tr>
        <tr><th>Reason</th><td>${escapeHtml(report.reason)}</td></tr>
        <tr><th>User Comments</th><td>${escapeHtml(report.userComments || "None")}</td></tr>
      </table>
      <label class="field">partition_key
        <select onchange="state.reportEditForm.partitionKey=this.value">${categories.map(c => `<option ${form.partitionKey === c ? "selected" : ""}>${c}</option>`).join("")}</select>
      </label>
      <label class="field">difficulty
        <select onchange="state.reportEditForm.difficulty=this.value">${difficulties.map(d => `<option ${form.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select>
      </label>
      <label class="field">performance_indicator
        <input value="${escapeHtml(form.performanceIndicator)}" onchange="state.reportEditForm.performanceIndicator=this.value">
      </label>
      <label class="field">question_text
        <textarea onchange="state.reportEditForm.questionText=this.value">${escapeHtml(form.questionText)}</textarea>
      </label>
      <div class="form-grid" style="grid-template-columns:1fr;">
        ${form.options.map((option, index) => `<label class="field">Option ${"ABCD"[index]}<input value="${escapeHtml(option)}" onchange="state.reportEditForm.options[${index}]=this.value"></label>`).join("")}
      </div>
      <label class="field">correct_option_id
        <select onchange="state.reportEditForm.correctOptionId=this.value">${["A", "B", "C", "D"].map(id => `<option ${form.correctOptionId === id ? "selected" : ""}>${id}</option>`).join("")}</select>
      </label>
      <label class="field">tags
        <input value="${escapeHtml(form.tags)}" onchange="state.reportEditForm.tags=this.value">
      </label>
      <label class="field">explanation
        <textarea onchange="state.reportEditForm.explanation=this.value">${escapeHtml(form.explanation)}</textarea>
      </label>
      <div class="actions">
        <button class="button" onclick="saveReportQuestionLocally(false)">Save Locally</button>
        <button class="button primary" onclick="saveReportQuestionToSupabase()">Save To Supabase</button>
        <button class="button" onclick="saveReportQuestionLocally(true)">Mark Fixed Locally</button>
        <button class="button accent" onclick="retireReportQuestionLocally()">Retire Question</button>
      </div>
      <p class="muted">Supabase saving requires the report to have a UUID from the questions table and an update policy for admins.</p>
    </section>
  `;
}

function generatedBatchStatusPanel() {
  const statusCounts = state.generatedBatches.reduce((counts, batch) => {
    counts[batch.status || "Unknown"] = (counts[batch.status || "Unknown"] || 0) + 1;
    return counts;
  }, {});
  return `
    <section class="card panel span-12">
      <div class="split"><h2 class="section-title">Generation Batch Status</h2><span class="status info">${escapeHtml(state.generatedBatchStatus)}</span></div>
      <div class="chips" style="margin-bottom:12px;">${Object.entries(statusCounts).map(([status, count]) => `<span class="status info">${escapeHtml(status)}: ${count}</span>`).join("") || `<span class="muted">Load proposed questions to view batch status.</span>`}</div>
      <table class="table">
        <tr><th>Status</th><th>Imported</th><th>Failed</th><th>Batch</th><th>Created</th></tr>
        ${state.generatedBatches.length ? state.generatedBatches.map(batch => `<tr>
          <td><span class="status ${batch.status === "Failed" ? "bad" : batch.status === "Published" || batch.status === "Imported" ? "good" : "gold"}">${escapeHtml(batch.status || "Unknown")}</span></td>
          <td>${Number(batch.imported_count || 0)} / ${Number(batch.requested_count || 0)}</td>
          <td>${Number(batch.failed_count || 0)}</td>
          <td><span class="muted">${escapeHtml(batch.id || "-")}</span><br><span class="muted">${escapeHtml(batch.openai_batch_id || "-")}</span>${batch.error ? `<br><span class="status bad">${escapeHtml(batch.error.slice(0, 180))}</span>` : ""}</td>
          <td>${formatDateTime(batch.created_at)}</td>
        </tr>`).join("") : `<tr><td colspan="5" class="muted">No generated batches loaded.</td></tr>`}
      </table>
    </section>
  `;
}

function generatedCandidateQueuePanel() {
  const filters = state.generatedCandidateFilters;
  const reviewStatuses = ["All", "Pending Review", "Needs Edit", "Approved", "Rejected", "Published"];
  const validationStatuses = ["All", "Unchecked", "Valid", "Needs Review", "Invalid"];
  const batchOptions = state.generatedBatches.map(batch => `<option value="${escapeHtml(batch.id)}" ${filters.batchId === batch.id ? "selected" : ""}>${escapeHtml(`${batch.status || "Batch"} - ${batch.id.slice(0, 8)}`)}</option>`).join("");
  return `
    <section class="card panel span-12">
      <div class="split"><h2 class="section-title">Generated Question Candidates</h2><span class="status info">${escapeHtml(state.generatedCandidateStatus)}</span></div>
      <div class="form-grid">
        <label class="field">Review Status
          <select onchange="setGeneratedCandidateFilter('reviewStatus', this.value)">${reviewStatuses.map(status => `<option value="${escapeHtml(status)}" ${filters.reviewStatus === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>
        </label>
        <label class="field">Validation Status
          <select onchange="setGeneratedCandidateFilter('validationStatus', this.value)">${validationStatuses.map(status => `<option value="${escapeHtml(status)}" ${filters.validationStatus === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>
        </label>
        <label class="field">Category
          <select onchange="setGeneratedCandidateFilter('category', this.value)"><option>All</option>${categories.map(category => `<option value="${escapeHtml(category)}" ${filters.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select>
        </label>
        <label class="field">Topic Tag
          <select onchange="setGeneratedCandidateFilter('topicTag', this.value)"><option>All</option>${allTopicTags().map(tag => `<option value="${escapeHtml(tag)}" ${filters.topicTag === tag ? "selected" : ""}>${escapeHtml(tag)}</option>`).join("")}</select>
        </label>
        <label class="field">Batch
          <select onchange="setGeneratedCandidateFilter('batchId', this.value)"><option value="">All</option>${batchOptions}</select>
        </label>
        <label class="field">Keyword
          <input value="${escapeHtml(filters.keyword)}" oninput="setGeneratedCandidateFilter('keyword', this.value)" placeholder="question, PI, source id">
        </label>
      </div>
      <div class="actions" style="margin-bottom:12px;"><button class="button primary" onclick="refreshGeneratedQuestionCandidates()">Load Proposed Questions</button></div>
      <table class="table"><tr><th>Status</th><th>Question</th><th>Answer</th><th>Tags</th><th>Source</th><th>Actions</th></tr>
        ${state.generatedCandidates.length ? state.generatedCandidates.map(candidate => {
          const options = normalizeOptions(candidate.options || []);
          const answer = normalizeCorrectOptionId(candidate.correct_option_id || candidate.correct || "");
          const correctText = options.find(option => option.id === answer)?.text || "";
          const validationErrors = Array.isArray(candidate.validation_errors) ? candidate.validation_errors.join("; ") : "";
          const tags = Array.isArray(candidate.tags) ? candidate.tags : [];
          const partitions = Array.isArray(candidate.partition_keys) ? candidate.partition_keys : [];
          const isSelected = state.selectedGeneratedCandidateId === candidate.id;
          const isPublished = candidate.review_status === "Published";
          const canPublish = candidate.review_status === "Approved" && candidate.validation_status === "Valid";
          const approvedMeta = candidate.reviewed_at ? `Approved/reviewed ${formatDateTime(candidate.reviewed_at)}` : "One admin/owner approval required";
          return `<tr>
            <td><span class="status ${generatedCandidateReviewClass(candidate.review_status)}">${escapeHtml(candidate.review_status || "Pending Review")}</span><br><span class="muted">${escapeHtml(candidate.validation_status || "Unchecked")}${candidate.quality_score ? ` - ${escapeHtml(String(candidate.quality_score))}` : ""}</span><br><span class="muted">${escapeHtml(approvedMeta)}</span></td>
            <td><strong>${escapeHtml(candidate.question_text || "")}</strong><br><span class="muted">${options.map(option => `${option.id}. ${option.text}`).map(escapeHtml).join("<br>")}</span>${validationErrors ? `<br><span class="status bad">${escapeHtml(validationErrors)}</span>` : ""}</td>
            <td>${escapeHtml(answer)}${correctText ? `<br><span class="muted">${escapeHtml(correctText)}</span>` : ""}</td>
            <td><div class="candidate-tag-stack">${tags.map(tag => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}<span class="candidate-tag-meta">${escapeHtml(candidate.difficulty || "-")} - ${escapeHtml(candidate.question_type || "-")}</span></div></td>
            <td>${escapeHtml(partitions.join(", ") || candidate.category || "-")}<br><span class="muted">${escapeHtml(candidate.performance_indicator || "-")}</span><br><span class="muted">${escapeHtml(candidate.batch_job_id || "-")}</span></td>
            <td>
              <button class="chip ${isSelected ? "selected" : ""}" onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "edit")'>Edit</button>
              <button class="chip" ${isPublished ? "disabled" : ""} onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "approve")'>Approve</button>
              <button class="chip" ${isPublished ? "disabled" : ""} onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "needs-edit")'>Needs Edit</button>
              <button class="chip" ${isPublished ? "disabled" : ""} onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "reject")'>Reject</button>
              <button class="chip ${canPublish ? "selected" : ""}" ${isPublished ? "disabled" : ""} onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "publish")'>Publish</button>
            </td>
          </tr>`;
        }).join("") : `<tr><td colspan="6" class="muted">No generated candidates loaded. Run the generation import into generated_question_candidates, then load this queue.</td></tr>`}
      </table>
    </section>
  `;
}

function generatedCandidateEditorPanel() {
  const candidate = state.generatedCandidates.find(item => item.id === state.selectedGeneratedCandidateId);
  const form = state.generatedCandidateEditForm;
  if (!candidate) {
    return `
      <section class="card panel span-12">
        <h2 class="section-title">Generated Candidate Editor</h2>
        <p class="muted">${escapeHtml(state.generatedCandidateEditStatus)}</p>
        <p class="muted">Choose a generated candidate from the queue to edit, approve, reject, or publish.</p>
      </section>
    `;
  }
  const approvalText = candidate.reviewed_at
    ? `One admin/owner approval recorded ${formatDateTime(candidate.reviewed_at)}.`
    : "One admin/owner approval is required before publishing.";
  return `
    <section class="card panel span-12" id="generated-candidate-editor">
      <div class="split"><h2 class="section-title">Generated Candidate Editor</h2><span class="status ${generatedCandidateReviewClass(candidate.review_status)}">${escapeHtml(candidate.review_status || "Pending Review")}</span></div>
      <p class="muted">${escapeHtml(state.generatedCandidateEditStatus)}</p>
      <p class="muted">${escapeHtml(approvalText)}</p>
      <div class="form-grid">
        <label class="field">Category
          <select onchange="state.generatedCandidateEditForm.category=this.value">${categories.map(c => `<option ${form.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        </label>
        <label class="field">Difficulty
          <select onchange="state.generatedCandidateEditForm.difficulty=this.value">${difficulties.map(d => `<option ${form.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select>
        </label>
        <label class="field">performance_indicator
          <input value="${escapeHtml(form.performanceIndicator)}" onchange="state.generatedCandidateEditForm.performanceIndicator=this.value">
        </label>
        <label class="field">question_type
          <input value="${escapeHtml(form.questionType)}" onchange="state.generatedCandidateEditForm.questionType=this.value">
        </label>
      </div>
      <label class="field">question_text
        <textarea onchange="state.generatedCandidateEditForm.questionText=this.value">${escapeHtml(form.questionText)}</textarea>
      </label>
      <div class="form-grid">${form.options.map((option, index) => `<label class="field">Option ${"ABCD"[index]}<input value="${escapeHtml(option)}" onchange="state.generatedCandidateEditForm.options[${index}]=this.value"></label>`).join("")}</div>
      <div class="form-grid">
        <label class="field">correct_option_id
          <select onchange="state.generatedCandidateEditForm.correctOptionId=this.value">${["A", "B", "C", "D"].map(id => `<option ${form.correctOptionId === id ? "selected" : ""}>${id}</option>`).join("")}</select>
        </label>
        <label class="field">tags
          <input value="${escapeHtml(form.tags)}" onchange="state.generatedCandidateEditForm.tags=this.value">
        </label>
      </div>
      <label class="field">explanation
        <textarea onchange="state.generatedCandidateEditForm.explanation=this.value">${escapeHtml(form.explanation)}</textarea>
      </label>
      <div class="actions">
        <button class="button primary" onclick="saveGeneratedCandidateEdits()">Save Candidate Edits</button>
        <button class="button" onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "approve")'>Approve</button>
        <button class="button" onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "needs-edit")'>Needs Edit</button>
        <button class="button accent" onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "reject")'>Reject</button>
        <button class="button primary" ${candidate.review_status === "Published" ? "disabled" : ""} onclick='handleGeneratedCandidateAction(${jsString(candidate.id)}, "publish")'>Publish To Question Bank</button>
      </div>
      <p class="muted">Publishing requires the Supabase <code>publish_generated_question</code> RPC, one admin/owner approval, and a valid candidate.</p>
    </section>
  `;
}

function adminDeletionQueuePanel() {
  const rows = state.adminDeletionQueue;
  const ownerControls = row => {
    if (!isOwnerRole()) return `<span class="muted">Owner required</span>`;
    const closed = ["Cancelled", "Completed"].includes(row.status);
    const canWarn = !closed && row.status !== "Final warning sent";
    const canExecute = row.status === "Final warning sent";
    const helper = !canExecute && !closed ? `<br><span class="muted">Final warning required before execution.</span>` : "";
    return `<button class="chip" ${canWarn ? "" : "disabled"} onclick='updateAdminDeletionRequest(${jsString(row.id)}, "Final warning sent")'>Send Final Warning</button> <button class="chip ${canExecute ? "warn" : ""}" ${canExecute ? "" : "disabled"} onclick='updateAdminDeletionRequest(${jsString(row.id)}, "Completed")'>Execute Deletion</button> <button class="chip" ${closed ? "disabled" : ""} onclick='updateAdminDeletionRequest(${jsString(row.id)}, "Cancelled")'>Cancel</button>${helper}`;
  };
  return `
    <section class="card panel span-12">
      <div class="split"><h2 class="section-title">Account Deletion Queue</h2><span class="status ${state.adminDeletionStatus.includes("Could not") || state.adminDeletionStatus.includes("required") || state.adminDeletionStatus.includes("before executing") ? "bad" : "info"}">${escapeHtml(state.adminDeletionStatus)}</span></div>
      <div class="actions" style="margin-bottom:12px;"><button class="button" onclick="refreshAdminDeletionQueue()">Load Deletion Requests</button></div>
      <table class="table">
        <tr><th>Status</th><th>User</th><th>Requested</th><th>Recovery Ends</th><th>Final Warning</th><th>Reason</th><th>Actions</th></tr>
        ${rows.length ? rows.map(row => `
          <tr>
            <td><span class="status ${row.status === "Completed" ? "good" : row.status === "Cancelled" ? "info" : row.status === "Final warning sent" ? "gold" : "bad"}">${escapeHtml(row.status)}</span></td>
            <td>${escapeHtml(row.user_id)}</td>
            <td>${escapeHtml(formatDateTime(row.requested_at))}</td>
            <td>${escapeHtml(formatDateTime(row.recoverable_until))}</td>
            <td>${escapeHtml(formatDateTime(row.final_warning_at))}</td>
            <td>${escapeHtml(row.reason || "-")}</td>
            <td>${ownerControls(row)}</td>
          </tr>
        `).join("") : `<tr><td colspan="7" class="muted">No deletion requests loaded.</td></tr>`}
      </table>
      <p class="muted">Execute Deletion calls the trusted Supabase Edge Function and requires the request to have a final warning first.</p>
    </section>
  `;
}

function admin() {
  if (!requireAdminPermission("access admin tools")) return;
  const availableBlueprints = allBlueprints();
  const blueprint = selectedBlueprint() || availableBlueprints[0];
  const coverage = blueprintCoverage(blueprint);
  const totalUsers = state.adminProfiles.length;
  const premiumUsers = state.adminProfiles.filter(profile => profile.account_tier === "premium").length;
  const suspendedUsers = state.adminProfiles.filter(profile => profile.suspended_until && new Date(profile.suspended_until) > new Date()).length;
  const ownerCount = activeOwnerCount();
  const revenueMetric = isOwnerRole()
    ? `<section class="card panel span-3 metric"><span class="muted">Premium Users</span><strong>${premiumUsers}</strong></section>`
    : `<section class="card panel span-3 metric"><span class="muted">Open Reports</span><strong>${state.reportQueue.filter(report => report.status !== "Fixed" && report.status !== "Invalid" && report.status !== "Spam").length}</strong></section>`;
  layout("Admin Portal", `
    <div class="grid">
      <section class="card panel span-3 metric"><span class="muted">Loaded Users</span><strong>${totalUsers}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Suspended Users</span><strong>${suspendedUsers}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Pending Name Reviews</span><strong>${state.nameReviews.filter(review => review.status === "Pending").length}</strong></section>
      ${revenueMetric}
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Admin Data</h2><span class="status ${state.adminControlStatus.includes("could not") || state.adminControlStatus.includes("failed") ? "bad" : "info"}">${escapeHtml(state.adminControlStatus)}</span></div>
        <p class="muted">Active Owners detected: ${Number.isFinite(state.ownerCount) ? ownerCount : "Not loaded yet"}</p>
        <button class="button primary" onclick="refreshAdminControlData()" ${state.adminControlsLoading ? "disabled" : ""}>${state.adminControlsLoading ? "Loading..." : "Refresh Admin Data"}</button>
      </section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Role Permissions</h2><span class="status ${isOwnerRole() ? "good" : "gold"}">${roleLabel()}</span></div>
        <table class="table">
          <tr><th>Administrator</th><td>Upload, bulk upload, edit, and retire questions; review reported questions; manage tags; generate administrator access links; moderate users; send broadcasts; view platform analytics.</td></tr>
          <tr><th>Owner</th><td>All Administrator permissions, plus Owner/Admin governance, Administrator suspension approval, Owner removal, Owner creation, override authority, and revenue statistics.</td></tr>
          <tr><th>Current access</th><td>${isOwnerRole() ? "Owner governance enabled." : "Owner governance and revenue controls are hidden until an Owner account signs in."}</td></tr>
        </table>
      </section>
      ${adminDeletionQueuePanel()}
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">Report Queue</h2><span class="status info">${escapeHtml(state.reportActionStatus)}</span></div>
        <div class="actions" style="margin-bottom:12px;"><button class="button" onclick="refreshReportQueueFromSupabase()">Load Shared Supabase Queue</button></div>
        <table class="table"><tr><th>Priority</th><th>Status</th><th>Reason</th><th>Question</th><th>Test</th><th>Actions</th></tr>
          ${state.reportQueue.map(report => `
            <tr>
              <td><span class="status ${report.priority === "Resolved" ? "good" : report.priority.startsWith("1 ") ? "gold" : "bad"}">${escapeHtml(report.priority)}</span></td>
              <td><span class="status ${statusClass(report.status === "Open" ? "Info" : report.status)}">${escapeHtml(report.status)}</span><br><span class="muted">${escapeHtml(report.action || "Awaiting review")}${report.updatedAt ? ` - ${escapeHtml(report.updatedAt)}` : ""}</span></td>
              <td>${escapeHtml(report.reason)}<br><span class="muted">${escapeHtml(report.userComments || "No comments")}</span><br><span class="muted">${escapeHtml(report.reportedAt)}</span></td>
              <td>${escapeHtml(report.question)}</td>
              <td>${escapeHtml(report.testId)}</td>
              <td><button type="button" class="chip ${state.selectedReportId === report.id ? "selected" : ""}" onclick='window.selectReportForEdit(${jsString(report.id)})'>Edit</button> ${reportStatuses.map(status => `<button type="button" class="chip ${report.status === status ? "selected" : ""}" onclick='window.updateReportStatus(${jsString(report.id)}, ${jsString(status)})'>${status}</button>`).join(" ")}</td>
            </tr>
          `).join("")}
        </table>
        <p class="muted">Valid reports enter the correction queue; fixed reports send a thank-you notification; spam reports may warn the reporter.</p>
      </section>
      ${reportEditorPanel()}
      <aside class="card panel span-4">
        <h2 class="section-title">Blueprint Validation</h2>
        ${blueprintSummary(blueprint, coverage)}
        <label class="field">Review Blueprint
          <select onchange="selectBlueprint(this.value)">${availableBlueprints.map(b => `<option value="${escapeHtml(b.name)}" ${blueprint.name === b.name ? "selected" : ""}>${b.name}</option>`).join("")}</select>
        </label>
        <div class="actions"><button class="button" onclick="editSelectedBlueprint()">Edit Selected</button><button class="button" onclick="restorePrdBlueprints()">Restore PRD</button></div>
      </aside>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Save Blueprint</h2><span class="status info">${state.blueprintStatus}</span></div>
        <div class="form-grid">
          <label class="field">Level
            <select onchange="state.blueprintForm.level=this.value">
              ${["District Test", "State Test", "ICDC Test"].map(level => `<option ${state.blueprintForm.level === level ? "selected" : ""}>${level}</option>`).join("")}
            </select>
          </label>
          <label class="field">Category
            <select onchange="state.blueprintForm.category=this.value">${categories.map(c => `<option ${state.blueprintForm.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
          </label>
          <label class="field">Version
            <input value="${escapeHtml(state.blueprintForm.version)}" oninput="state.blueprintForm.version=this.value">
          </label>
          <label class="field">Change Reason
            <input value="${escapeHtml(state.blueprintForm.reason)}" oninput="state.blueprintForm.reason=this.value">
          </label>
        </div>
        <label class="field">Topic Distribution
          <textarea class="tall-textarea" oninput="state.blueprintForm.distribution=this.value">${escapeHtml(state.blueprintForm.distribution)}</textarea>
        </label>
        <div class="actions">
          <button class="button primary" onclick="saveBlueprintFromForm()">Save Blueprint</button>
          <button class="button" onclick="state.blueprintForm.distribution='Business Law — 5\\nPromotion: 10\\nSelling: 10'; render()">Reset Form</button>
        </div>
        <p class="muted">Use one topic tag per line, for example <code>Business Law — 5</code>, <code>Promotion — 10</code>, or <code>Financial Analysis: 24</code>. Creating a blueprint also selects it for Generate Test.</p>
        <h2 class="section-title" style="margin-top:16px;">Saved Blueprints</h2>
        ${savedBlueprintSwitcher()}
        <h2 class="section-title" style="margin-top:16px;">Version History</h2>
        <table class="table">
          <tr><th>Blueprint</th><th>Version</th><th>Status</th><th>Reason</th><th>Created</th><th>Action</th></tr>
          ${state.blueprintVersions.length ? state.blueprintVersions.map(version => `<tr>
            <td>${escapeHtml(version.blueprint_name)}</td>
            <td>${escapeHtml(version.version)}</td>
            <td><span class="status ${version.status === "Active" ? "good" : "gold"}">${escapeHtml(version.status)}</span></td>
            <td>${escapeHtml(version.change_reason)}</td>
            <td>${escapeHtml(formatDateTime(version.created_at))}</td>
            <td><button class="chip" onclick='restoreBlueprintVersion(${jsString(version.id)})'>Restore</button></td>
          </tr>`).join("") : `<tr><td colspan="6" class="muted">No Supabase blueprint versions loaded.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Question Upload</h2><span class="status ${state.uploadStatus.startsWith("Saved") || state.uploadStatus.startsWith("Uploaded") ? "good" : state.uploadStatus.includes("failed") || state.uploadStatus.includes("returned") ? "bad" : "info"}">${state.uploadStatus}</span></div>
        <div class="form-grid">
          <label class="field">partition_key
            <select onchange="state.uploadForm.partitionKey=this.value">${categories.map(c => `<option ${state.uploadForm.partitionKey === c ? "selected" : ""}>${c}</option>`).join("")}</select>
          </label>
          <label class="field">difficulty
            <select onchange="state.uploadForm.difficulty=this.value">${difficulties.map(d => `<option ${state.uploadForm.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select>
          </label>
          <label class="field">performance_indicator
            <input value="${escapeHtml(state.uploadForm.performanceIndicator)}" onchange="state.uploadForm.performanceIndicator=this.value">
          </label>
          <label class="field">question_type
            <input value="${escapeHtml(state.uploadForm.questionType)}" onchange="state.uploadForm.questionType=this.value">
          </label>
        </div>
        <label class="field">question_text
          <textarea onchange="state.uploadForm.questionText=this.value">${escapeHtml(state.uploadForm.questionText)}</textarea>
        </label>
        <div class="form-grid">
          ${state.uploadForm.options.map((option, index) => `<label class="field">Option ${"ABCD"[index]}<input value="${escapeHtml(option)}" onchange="state.uploadForm.options[${index}]=this.value"></label>`).join("")}
        </div>
        <div class="form-grid">
          <label class="field">correct_option_id
            <select onchange="state.uploadForm.correctOptionId=this.value">${["A", "B", "C", "D"].map(id => `<option ${state.uploadForm.correctOptionId === id ? "selected" : ""}>${id}</option>`).join("")}</select>
          </label>
          <label class="field">tags
            <input value="${escapeHtml(state.uploadForm.tags)}" onchange="state.uploadForm.tags=this.value">
          </label>
        </div>
        <label class="field">explanation
          <textarea onchange="state.uploadForm.explanation=this.value">${escapeHtml(state.uploadForm.explanation)}</textarea>
        </label>
        <div class="actions">
          <button class="button primary" onclick="saveAdminQuestion()">Save To Supabase</button>
          <button class="button" onclick="setAdminPage('question-bank')">Connection Settings</button>
        </div>
        <p class="muted">Requires a Supabase insert policy and a signed-in account whose verified role is Administrator or Owner.</p>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Bulk Upload And Duplicate Review</h2>
        <label class="field">Bulk JSON
          <textarea class="code-input" onchange="state.bulkUploadText=this.value">${escapeHtml(state.bulkUploadText)}</textarea>
        </label>
        <div class="actions">
          <button class="button primary" onclick="bulkUploadSupabaseQuestions()">Upload JSON To Supabase</button>
          <button class="button" onclick="reviewBulkDuplicates()">Review Duplicates</button>
          <button class="button" onclick="state.bulkUploadText=JSON.stringify([buildQuestionPayloadFromForm()], null, 2); render()">Use Form As JSON</button>
        </div>
        <table class="table"><tr><th>Similarity</th><th>Candidate</th><th>Potential Match</th><th>Status</th><th>Action</th></tr>
          ${state.duplicateReviews.length ? state.duplicateReviews.map(review => `<tr>
            <td>${review.similarity}%</td>
            <td>${escapeHtml(review.candidateText)}</td>
            <td>${escapeHtml(review.matchingText)}</td>
            <td><span class="status ${review.status === "Pending" ? "gold" : "info"}">${escapeHtml(review.status)}</span></td>
            <td><button class="chip" onclick='resolveDuplicateReview(${jsString(review.id)}, "Upload Anyway")'>Upload Anyway</button> <button class="chip" onclick='resolveDuplicateReview(${jsString(review.id)}, "Edit")'>Edit</button> <button class="chip" onclick='resolveDuplicateReview(${jsString(review.id)}, "Cancelled")'>Cancel</button></td>
          </tr>`).join("") : `<tr><td colspan="5" class="muted">Run duplicate review or load saved reviews from Supabase.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Tag Management</h2><span class="status info">${escapeHtml(state.adminTagStatus)}</span></div>
        <p class="muted">Administrators and Owners may create or remove custom topic tags. PRD preset tags are protected.</p>
        <label class="field">New Topic Tag
          <input value="${escapeHtml(state.adminTagInput)}" oninput="state.adminTagInput=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitAdminTag()}">
        </label>
        <button class="button primary" onclick="submitAdminTag()">Create Tag</button>
        <table class="table" style="margin-top:12px;">
          <tr><th>Custom Tag</th><th>Action</th></tr>
          ${state.adminTags.length ? state.adminTags.map(tag => `<tr><td>${escapeHtml(tag)}</td><td><button class="chip" onclick='removeAdminTag(${jsString(tag)})'>Remove</button></td></tr>`).join("") : `<tr><td colspan="2" class="muted">No custom tags created yet.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">User Moderation</h2><span class="status info">${state.bannedWordStatus}</span></div>
        <table class="table"><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr>
          ${state.adminProfiles.length ? state.adminProfiles.map(profile => {
            const suspended = profile.suspended_until && new Date(profile.suspended_until) > new Date();
            return `<tr>
              <td>${escapeHtml(profile.display_name || profile.user_id)}<br><span class="muted">${escapeHtml(profile.user_id)}</span></td>
              <td>${escapeHtml(profile.role || "student")}</td>
              <td><span class="status ${suspended ? "bad" : "good"}">${suspended ? `Suspended until ${formatDateTime(profile.suspended_until)}` : "Active"}</span></td>
              <td><button class="chip" onclick='setUserSuspension(${jsString(profile.user_id)}, 7)'>Suspend 7 Days</button> <button class="chip" onclick='setUserSuspension(${jsString(profile.user_id)}, 30)'>Suspend 30 Days</button> <button class="chip" onclick='setUserSuspension(${jsString(profile.user_id)}, 0)'>Restore</button></td>
            </tr>`;
          }).join("") : `<tr><td colspan="4" class="muted">Load admin data to view profiles.</td></tr>`}
        </table>
        <h2 class="section-title" style="margin-top:16px;">Name Review</h2>
        <table class="table"><tr><th>Name</th><th>Matched Term</th><th>Status</th><th>Replacement</th><th>Action</th></tr>
          ${state.nameReviews.length ? state.nameReviews.map(review => `<tr>
            <td>${escapeHtml(review.submitted_name)}</td>
            <td>${escapeHtml(review.matched_term || "-")}</td>
            <td><span class="status ${review.status === "Pending" ? "gold" : "info"}">${escapeHtml(review.status)}</span></td>
            <td><input value="${escapeHtml(review.replacement_name || review.submitted_name)}" oninput='setNameReviewReplacement(${jsString(review.id)}, this.value)'></td>
            <td><button class="chip" onclick='reviewFlaggedName(${jsString(review.id)}, "Approved")'>Approve</button> <button class="chip" onclick='reviewFlaggedName(${jsString(review.id)}, "Modified")'>Modify</button> <button class="chip" onclick='reviewFlaggedName(${jsString(review.id)}, "Rejected")'>Reject</button></td>
          </tr>`).join("") : `<tr><td colspan="5" class="muted">No name reviews loaded.</td></tr>`}
        </table>
        <label class="field">Banned Word Or Phrase
          <input value="${escapeHtml(state.bannedWordInput)}" oninput="state.bannedWordInput=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitBannedWord()}">
        </label>
        <div class="actions">
          <button class="button primary" onclick="submitBannedWord()">Submit Banned Word</button>
        </div>
        <table class="table">
          <tr><th>Banned Word/Phrase</th><th>Action</th></tr>
          ${state.bannedWords.length ? state.bannedWords.map(word => `<tr><td>${escapeHtml(word)}</td><td><button type="button" class="chip" onclick='window.removeBannedWord(${jsString(word)})'>Remove</button></td></tr>`).join("") : `<tr><td colspan="2" class="muted">No banned words are currently active.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Administrator Access Links</h2><span class="status info">${escapeHtml(state.adminInviteStatus)}</span></div>
        <p class="muted">Administrators and Owners may generate tokenized links tied to a specific email address. Creating an Administrator account still requires Owner approval in production.</p>
        <label class="field">Email Address
          <input type="email" value="${escapeHtml(state.adminInviteEmail)}" onchange="state.adminInviteEmail=this.value">
        </label>
        <label class="field">Requested Role
          <select onchange="state.adminInviteRole=this.value">
            <option value="admin" ${state.adminInviteRole === "admin" ? "selected" : ""}>Administrator</option>
            <option value="owner" ${state.adminInviteRole === "owner" ? "selected" : ""} ${isOwnerRole() ? "" : "disabled"}>Owner</option>
          </select>
        </label>
        <button class="button primary" onclick="generateAdminAccessLink()">Generate Access Link</button>
        ${state.adminInviteLink ? `
          <label class="field invite-link-field">Generated Link
            <div class="inline-actions">
              <input class="code-input" readonly value="${escapeHtml(state.adminInviteLink)}" onclick="this.select()">
              <button class="button ghost" onclick="copyAdminInviteLink()">Copy</button>
            </div>
          </label>
        ` : ""}
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Owner Governance</h2><span class="status ${isOwnerRole() ? "good" : "gold"}">${isOwnerRole() ? "Owner controls enabled" : "Owner required"}</span></div>
        <p class="muted">${escapeHtml(state.governanceStatus)}</p>
        <p class="muted">${ownerCount <= 1 ? "Single-owner mode: owner actions are approved immediately." : `${ownerCount} active Owners: starting an action records your approval, then the remaining Owners can vote below.`}</p>
        <label class="field">Target User ID, Display Name, Or Email
          <input value="${escapeHtml(state.governanceTarget)}" oninput="state.governanceTarget=this.value">
        </label>
        <label class="field">Reason
          <input value="${escapeHtml(state.governanceReason)}" oninput="state.governanceReason=this.value">
        </label>
        <table class="table"><tr><th>Proposal</th><th>Threshold</th><th>Action</th></tr>
          <tr><td>Create Owner account</td><td>Unanimous approval from all active Owners</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Create Owner')">${ownerCount <= 1 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Remove Owner account</td><td>${ownerCount <= 2 ? "Single Owner approval to remove the other Owner" : "Majority approval from active Owners"}</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Remove Owner')">${ownerCount <= 2 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Create Administrator</td><td>${ownerCount <= 1 ? "Single Owner approval" : "At least two Owner approvals"}</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Create Administrator')">${ownerCount <= 1 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Suspend Administrator</td><td>${ownerCount <= 1 ? "Single Owner approval" : "At least two Owner approvals"}</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Suspend Administrator')">${ownerCount <= 1 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Override Administrator action</td><td>Single Owner approval</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Override Administrator Action')">Override</button></td></tr>
        </table>
        <h2 class="section-title" style="margin-top:16px;">Open And Recent Votes</h2>
        <table class="table"><tr><th>Action</th><th>Target</th><th>Votes</th><th>Status</th><th>Ballot</th></tr>
          ${state.governanceVotes.length ? state.governanceVotes.map(vote => {
            const ballots = vote.governance_ballots || [];
            const approvals = ballots.filter(ballot => ballot.decision === "Approve").length;
            const rejections = ballots.filter(ballot => ballot.decision === "Reject").length;
            return `<tr>
              <td>${escapeHtml(vote.action)}<br><span class="muted">${escapeHtml(vote.reason || "")}</span></td>
              <td>${escapeHtml(vote.target_email || vote.target_user_id || "-")}</td>
              <td>${approvals}/${vote.required_approvals} approve, ${rejections}/${vote.required_rejections} reject</td>
              <td><span class="status ${vote.status === "Approved" ? "good" : vote.status === "Rejected" ? "bad" : "gold"}">${escapeHtml(vote.status)}</span></td>
              <td><div class="row-actions"><button class="chip" ${vote.status === "Open" && isOwnerRole() ? "" : "disabled"} onclick='castGovernanceBallot(${jsString(vote.id)}, "Approve")'>Approve</button><button class="chip" ${vote.status === "Open" && isOwnerRole() ? "" : "disabled"} onclick='castGovernanceBallot(${jsString(vote.id)}, "Reject")'>Reject</button></div></td>
            </tr>`;
          }).join("") : `<tr><td colspan="5" class="muted">No governance votes loaded.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Notification Broadcasts</h2><span class="status info">${escapeHtml(state.broadcastStatus)}</span></div>
        <label class="field">Audience
          <select onchange="state.broadcastAudience=this.value">
            <option value="all" ${state.broadcastAudience === "all" ? "selected" : ""}>Entire user base</option>
            <option value="premium" ${state.broadcastAudience === "premium" ? "selected" : ""}>Premium users</option>
            <option value="free" ${state.broadcastAudience === "free" ? "selected" : ""}>Free users</option>
            <option value="admin" ${state.broadcastAudience === "admin" ? "selected" : ""}>Administrators</option>
            <option value="owner" ${state.broadcastAudience === "owner" ? "selected" : ""}>Owners</option>
          </select>
        </label>
        <label class="field">Title<input value="${escapeHtml(state.broadcastTitle)}" oninput="state.broadcastTitle=this.value"></label>
        <label class="field">Message<textarea oninput="state.broadcastMessage=this.value">${escapeHtml(state.broadcastMessage)}</textarea></label>
        <button class="button primary" onclick="queueAdminBroadcast()">Queue Broadcast</button>
        <table class="table" style="margin-top:12px;"><tr><th>Audience</th><th>Status</th><th>Recipients</th><th>Created</th></tr>
          ${state.broadcasts.length ? state.broadcasts.map(item => `<tr><td>${escapeHtml(item.audience)}</td><td>${escapeHtml(item.status)}</td><td>${item.recipient_count}</td><td>${escapeHtml(formatDateTime(item.created_at))}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">No broadcasts loaded.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Infrastructure And Security</h2>
        <table class="table"><tr><th>Auth</th><td>Supabase Authentication, email verification, Google sign-in</td></tr><tr><th>Database</th><td>Supabase</td></tr><tr><th>Hosting</th><td>Microsoft Azure</td></tr><tr><th>Email</th><td>Resend</td></tr><tr><th>Payments</th><td>Stripe managed subscriptions, no raw card storage</td></tr><tr><th>Controls</th><td>Rate limiting, session protection, protected admin routes</td></tr></table>
        <button class="button" onclick="setAdminPage('question-bank')">Manage Supabase Question Bank</button>
      </section>
      <section class="card panel span-12">
        <h2 class="section-title">Audit Log</h2>
        <table class="table"><tr><th>Date</th><th>Admin</th><th>Action</th><th>Resource</th><th>Reason</th></tr>
          ${state.adminAuditLogs.length ? state.adminAuditLogs.map(row => `<tr>
            <td>${escapeHtml(formatDateTime(row.created_at))}</td>
            <td>${escapeHtml(row.actor_email || row.actor_user_id || "-")}</td>
            <td>${escapeHtml(row.action)}</td>
            <td>${escapeHtml(`${row.resource_type}${row.resource_id ? `: ${row.resource_id}` : ""}`)}</td>
            <td>${escapeHtml(row.reason || "-")}</td>
          </tr>`).join("") : auditEvents.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
        </table>
      </section>
    </div>
  `);
}

const adminPages = [
  ["overview", "Overview"],
  ["reports", "Reports"],
  ["blueprints", "Blueprints"],
  ["questions", "Questions"],
  ["question-bank", "Question Bank"],
  ["users", "Users"],
  ["deletion", "Deletion"],
  ["governance", "Governance"],
  ["owner-access", "Owner Access"],
  ["broadcasts", "Broadcasts"],
  ["audit", "Audit & Security"]
];

function adminDashboard() {
  if (!isAdminRole()) {
    state.authStatus = state.user
      ? "This account does not have Administrator or Owner access."
      : "Sign in with an Administrator or Owner account to open the Admin Portal.";
    state.route = state.user ? "dashboard" : "login";
    return state.user ? dashboard() : auth("login");
  }
  if (!adminPages.some(([page]) => page === state.adminPage)) state.adminPage = "overview";
  const title = adminPages.find(([page]) => page === state.adminPage)?.[1] || "Overview";
  app.innerHTML = `
    <div class="shell admin-shell">
      <aside class="sidebar admin-sidebar">
        <div class="brand">${logoMarkup()}</div>
        <nav class="nav" aria-label="Admin">
          ${adminPages.map(([page, label]) => `<button class="${state.adminPage === page ? "active" : ""}" onclick='setAdminPage(${jsString(page)})'>${label}</button>`).join("")}
        </nav>
        <div class="account-strip">
          <div class="split"><strong>${escapeHtml(profileDisplayName())}</strong><span class="status ${isOwnerRole() ? "good" : "gold"}">${roleLabel()}</span></div>
          ${state.user?.email ? `<p class="muted">${escapeHtml(state.user.email)}</p>` : ""}
          <p class="muted">Active Owners: ${Number.isFinite(state.ownerCount) ? activeOwnerCount() : "Not loaded"}</p>
          <button class="chip" onclick="refreshAdminControlData()" ${state.adminControlsLoading ? "disabled" : ""}>${state.adminControlsLoading ? "Refreshing..." : "Refresh Data"}</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div><h1 class="page-title">Admin ${title}</h1><p class="muted">Operational controls for Lift Off Exams.</p></div>
          <div class="toolbar">
            <button class="button" onclick="setRoute('dashboard')">Back To Website</button>
            <button class="button" onclick="toggleTheme()">${state.theme === "dark" ? "Light" : "Dark"}</button>
          </div>
        </div>
        ${adminPageContent()}
      </main>
    </div>
  `;
}

function adminPageContent() {
  if (state.adminPage === "reports") return adminReportsPage();
  if (state.adminPage === "blueprints") return adminBlueprintsPage();
  if (state.adminPage === "questions") return adminQuestionsPage();
  if (state.adminPage === "question-bank") return adminQuestionBankPage();
  if (state.adminPage === "users") return adminUsersPage();
  if (state.adminPage === "deletion") return adminDeletionPage();
  if (state.adminPage === "governance") return adminGovernancePage();
  if (state.adminPage === "owner-access") return adminOwnerAccessPage();
  if (state.adminPage === "broadcasts") return adminBroadcastsPage();
  if (state.adminPage === "audit") return adminAuditSecurityPage();
  return adminOverviewPage();
}

function adminOverviewPage() {
  const totalUsers = state.adminProfiles.length;
  const premiumUsers = state.adminProfiles.filter(profile => profile.account_tier === "premium").length;
  const suspendedUsers = state.adminProfiles.filter(profile => profile.suspended_until && new Date(profile.suspended_until) > new Date()).length;
  const pendingReports = state.reportQueue.filter(report => report.status !== "Fixed" && report.status !== "Invalid" && report.status !== "Spam").length;
  const pendingNameReviews = state.nameReviews.filter(review => review.status === "Pending").length;
  const pendingDuplicates = state.duplicateReviews.filter(review => review.status === "Pending").length;
  const pendingDeletionRequests = state.adminDeletionQueue.filter(row => ["Requested", "Final warning sent"].includes(row.status)).length;
  const cards = [
    ["reports", "Reports", `${pendingReports} open report${pendingReports === 1 ? "" : "s"}`, "Review reported questions and edit corrections."],
    ["blueprints", "Blueprints", `${state.blueprintVersions.length} version${state.blueprintVersions.length === 1 ? "" : "s"}`, "Validate, save, and restore blueprint versions."],
    ["questions", "Questions", `${pendingDuplicates} duplicate review${pendingDuplicates === 1 ? "" : "s"}`, "Upload questions, bulk import JSON, and resolve duplicates."],
    ["question-bank", "Question Bank", `${activeQuestions().length} active question${activeQuestions().length === 1 ? "" : "s"}`, "Connect Supabase, load the shared bank, and review import issues."],
    ["users", "Users", `${pendingNameReviews} name review${pendingNameReviews === 1 ? "" : "s"}`, "Moderate users, display names, banned terms, and tags."],
    ["deletion", "Deletion", `${pendingDeletionRequests} active request${pendingDeletionRequests === 1 ? "" : "s"}`, "Send final warnings and execute account deletion."],
    ["governance", "Governance", `${activeOwnerCount()} active Owner${activeOwnerCount() === 1 ? "" : "s"}`, "Create invite links and manage Owner voting."],
    ["owner-access", "Owner Access", state.ownerPrivilegesSuspended ? "Suspended" : "Active", "Suspend or restore your own Owner privileges."],
    ["broadcasts", "Broadcasts", `${state.broadcasts.length} loaded`, "Send account notifications to selected audiences."],
    ["audit", "Audit & Security", `${state.adminAuditLogs.length || auditEvents.length} events`, "Review audit history and platform infrastructure."]
  ];
  return `
    <div class="grid admin-home-grid">
      <section class="card panel span-3 metric"><span class="muted">Loaded Users</span><strong>${totalUsers}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Premium Users</span><strong>${premiumUsers}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Suspended Users</span><strong>${suspendedUsers}</strong></section>
      <section class="card panel span-3 metric"><span class="muted">Open Reports</span><strong>${pendingReports}</strong></section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Admin Data</h2><span class="status ${state.adminControlStatus.includes("could not") || state.adminControlStatus.includes("failed") ? "bad" : "info"}">${escapeHtml(state.adminControlStatus)}</span></div>
        <p class="muted">Active Owners detected: ${Number.isFinite(state.ownerCount) ? activeOwnerCount() : "Not loaded yet"}</p>
        <button class="button primary" onclick="refreshAdminControlData()" ${state.adminControlsLoading ? "disabled" : ""}>${state.adminControlsLoading ? "Loading..." : "Refresh Admin Data"}</button>
      </section>
      ${cards.map(([page, title, stat, body]) => `
        <section class="card panel span-4 admin-tool-card">
          <div class="split"><h2 class="section-title">${title}</h2><span class="status info">${stat}</span></div>
          <p class="muted">${body}</p>
          <button class="button primary" onclick='setAdminPage(${jsString(page)})'>Open ${title}</button>
        </section>
      `).join("")}
    </div>
  `;
}

function adminReportsPage() {
  return `
    <div class="grid">
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">Report Queue</h2><span class="status info">${escapeHtml(state.reportActionStatus)}</span></div>
        <div class="actions" style="margin-bottom:12px;"><button class="button" onclick="refreshReportQueueFromSupabase()">Load Shared Supabase Queue</button></div>
        <table class="table"><tr><th>Priority</th><th>Status</th><th>Reason</th><th>Question</th><th>Test</th><th>Actions</th></tr>
          ${state.reportQueue.map(report => `
            <tr>
              <td><span class="status ${report.priority === "Resolved" ? "good" : report.priority.startsWith("1 ") ? "gold" : "bad"}">${escapeHtml(report.priority)}</span></td>
              <td><span class="status ${statusClass(report.status === "Open" ? "Info" : report.status)}">${escapeHtml(report.status)}</span><br><span class="muted">${escapeHtml(report.action || "Awaiting review")}${report.updatedAt ? ` - ${escapeHtml(report.updatedAt)}` : ""}</span></td>
              <td>${escapeHtml(report.reason)}<br><span class="muted">${escapeHtml(report.userComments || "No comments")}</span><br><span class="muted">${escapeHtml(report.reportedAt)}</span></td>
              <td>${escapeHtml(report.question)}</td>
              <td>${escapeHtml(report.testId)}</td>
              <td><button type="button" class="chip ${state.selectedReportId === report.id ? "selected" : ""}" onclick='window.selectReportForEdit(${jsString(report.id)})'>Edit</button> ${reportStatuses.map(status => `<button type="button" class="chip ${report.status === status ? "selected" : ""}" onclick='window.updateReportStatus(${jsString(report.id)}, ${jsString(status)})'>${status}</button>`).join(" ")}</td>
            </tr>
          `).join("")}
        </table>
      </section>
      ${reportEditorPanel()}
    </div>
  `;
}

function adminBlueprintsPage() {
  const availableBlueprints = allBlueprints();
  const blueprint = selectedBlueprint() || availableBlueprints[0];
  const coverage = blueprintCoverage(blueprint);
  return `
    <div class="grid">
      <section class="card panel span-4">
        <h2 class="section-title">Blueprint Validation</h2>
        ${blueprintSummary(blueprint, coverage)}
        <label class="field">Review Blueprint
          <select onchange="selectBlueprint(this.value)">${availableBlueprints.map(b => `<option value="${escapeHtml(b.name)}" ${blueprint.name === b.name ? "selected" : ""}>${b.name}</option>`).join("")}</select>
        </label>
        <div class="actions"><button class="button" onclick="editSelectedBlueprint()">Edit Selected</button><button class="button" onclick="restorePrdBlueprints()">Restore PRD</button></div>
      </section>
      <section class="card panel span-8">
        <div class="split"><h2 class="section-title">Save Blueprint</h2><span class="status info">${state.blueprintStatus}</span></div>
        <div class="form-grid">
          <label class="field">Level<select onchange="state.blueprintForm.level=this.value">${["District Test", "State Test", "ICDC Test"].map(level => `<option ${state.blueprintForm.level === level ? "selected" : ""}>${level}</option>`).join("")}</select></label>
          <label class="field">Category<select onchange="state.blueprintForm.category=this.value">${categories.map(c => `<option ${state.blueprintForm.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
          <label class="field">Version<input value="${escapeHtml(state.blueprintForm.version)}" oninput="state.blueprintForm.version=this.value"></label>
          <label class="field">Change Reason<input value="${escapeHtml(state.blueprintForm.reason)}" oninput="state.blueprintForm.reason=this.value"></label>
        </div>
        <label class="field">Topic Distribution<textarea class="tall-textarea" oninput="state.blueprintForm.distribution=this.value">${escapeHtml(state.blueprintForm.distribution)}</textarea></label>
        <div class="actions"><button class="button primary" onclick="saveBlueprintFromForm()">Save Blueprint</button><button class="button" onclick="state.blueprintForm.distribution='Business Law — 5\\nPromotion: 10\\nSelling: 10'; render()">Reset Form</button></div>
        <p class="muted">Use one topic tag per line, for example <code>Business Law — 5</code>, <code>Promotion — 10</code>, or <code>Financial Analysis: 24</code>.</p>
      </section>
      <section class="card panel span-12">
        <h2 class="section-title">Saved Blueprints</h2>
        ${savedBlueprintSwitcher()}
        <h2 class="section-title" style="margin-top:16px;">Version History</h2>
        <table class="table"><tr><th>Blueprint</th><th>Version</th><th>Status</th><th>Reason</th><th>Created</th><th>Action</th></tr>
          ${state.blueprintVersions.length ? state.blueprintVersions.map(version => `<tr>
            <td>${escapeHtml(version.blueprint_name)}</td><td>${escapeHtml(version.version)}</td>
            <td><span class="status ${version.status === "Active" ? "good" : "gold"}">${escapeHtml(version.status)}</span></td>
            <td>${escapeHtml(version.change_reason)}</td><td>${escapeHtml(formatDateTime(version.created_at))}</td>
            <td><button class="chip" onclick='restoreBlueprintVersion(${jsString(version.id)})'>Restore</button></td>
          </tr>`).join("") : `<tr><td colspan="6" class="muted">No Supabase blueprint versions loaded.</td></tr>`}
        </table>
      </section>
    </div>
  `;
}

function adminQuestionsPage() {
  return `
    <div class="grid">
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Question Upload</h2><span class="status ${state.uploadStatus.startsWith("Saved") || state.uploadStatus.startsWith("Uploaded") ? "good" : state.uploadStatus.includes("failed") || state.uploadStatus.includes("returned") ? "bad" : "info"}">${state.uploadStatus}</span></div>
        <div class="form-grid">
          <label class="field">partition_key<select onchange="state.uploadForm.partitionKey=this.value">${categories.map(c => `<option ${state.uploadForm.partitionKey === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
          <label class="field">difficulty<select onchange="state.uploadForm.difficulty=this.value">${difficulties.map(d => `<option ${state.uploadForm.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
          <label class="field">performance_indicator<input value="${escapeHtml(state.uploadForm.performanceIndicator)}" onchange="state.uploadForm.performanceIndicator=this.value"></label>
          <label class="field">question_type<input value="${escapeHtml(state.uploadForm.questionType)}" onchange="state.uploadForm.questionType=this.value"></label>
        </div>
        <label class="field">question_text<textarea onchange="state.uploadForm.questionText=this.value">${escapeHtml(state.uploadForm.questionText)}</textarea></label>
        <div class="form-grid">${state.uploadForm.options.map((option, index) => `<label class="field">Option ${"ABCD"[index]}<input value="${escapeHtml(option)}" onchange="state.uploadForm.options[${index}]=this.value"></label>`).join("")}</div>
        <div class="form-grid">
          <label class="field">correct_option_id<select onchange="state.uploadForm.correctOptionId=this.value">${["A", "B", "C", "D", "optionA", "optionB", "optionC", "optionD"].map(id => `<option ${state.uploadForm.correctOptionId === id ? "selected" : ""}>${id}</option>`).join("")}</select></label>
          <label class="field">tags<input value="${escapeHtml(state.uploadForm.tags)}" onchange="state.uploadForm.tags=this.value"></label>
        </div>
        <label class="field">explanation<textarea onchange="state.uploadForm.explanation=this.value">${escapeHtml(state.uploadForm.explanation)}</textarea></label>
        <div class="actions"><button class="button primary" onclick="saveAdminQuestion()">Save To Supabase</button><button class="button" onclick="setAdminPage('question-bank')">Connection Settings</button></div>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Bulk Upload And Duplicate Review</h2>
        <label class="field">Bulk JSON<textarea class="code-input" onchange="state.bulkUploadText=this.value">${escapeHtml(state.bulkUploadText)}</textarea></label>
        <div class="actions"><button class="button primary" onclick="bulkUploadSupabaseQuestions()">Upload JSON To Supabase</button><button class="button" onclick="reviewBulkDuplicates()">Review Duplicates</button><button class="button" onclick="state.bulkUploadText=JSON.stringify([buildQuestionPayloadFromForm()], null, 2); render()">Use Form As JSON</button></div>
        <table class="table"><tr><th>Similarity</th><th>Candidate</th><th>Potential Match</th><th>Status</th><th>Action</th></tr>
          ${state.duplicateReviews.length ? state.duplicateReviews.map(review => `<tr>
            <td>${review.similarity}%</td><td>${escapeHtml(review.candidateText)}</td><td>${escapeHtml(review.matchingText)}</td>
            <td><span class="status ${review.status === "Pending" ? "gold" : "info"}">${escapeHtml(review.status)}</span></td>
            <td><button class="chip" onclick='resolveDuplicateReview(${jsString(review.id)}, "Upload Anyway")'>Upload Anyway</button> <button class="chip" onclick='resolveDuplicateReview(${jsString(review.id)}, "Edit")'>Edit</button> <button class="chip" onclick='resolveDuplicateReview(${jsString(review.id)}, "Cancelled")'>Cancel</button></td>
          </tr>`).join("") : `<tr><td colspan="5" class="muted">Run duplicate review or load saved reviews from Supabase.</td></tr>`}
        </table>
      </section>
      ${generatedBatchStatusPanel()}
      ${generatedCandidateQueuePanel()}
      ${generatedCandidateEditorPanel()}
    </div>
  `;
}

function adminQuestionBankPage() {
  requestUserQuestionStatuses();
  return questionBankContent();
}

function adminUsersPage() {
  return `
    <div class="grid">
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">User Moderation</h2><span class="status info">${state.bannedWordStatus}</span></div>
        <table class="table"><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr>
          ${state.adminProfiles.length ? state.adminProfiles.map(profile => {
            const suspended = profile.suspended_until && new Date(profile.suspended_until) > new Date();
            return `<tr><td>${escapeHtml(profile.display_name || profile.user_id)}<br><span class="muted">${escapeHtml(profile.user_id)}</span></td><td>${escapeHtml(profile.role || "student")}</td><td><span class="status ${suspended ? "bad" : "good"}">${suspended ? `Suspended until ${formatDateTime(profile.suspended_until)}` : "Active"}</span></td><td><button class="chip" onclick='setUserSuspension(${jsString(profile.user_id)}, 7)'>Suspend 7 Days</button> <button class="chip" onclick='setUserSuspension(${jsString(profile.user_id)}, 30)'>Suspend 30 Days</button> <button class="chip" onclick='setUserSuspension(${jsString(profile.user_id)}, 0)'>Restore</button></td></tr>`;
          }).join("") : `<tr><td colspan="4" class="muted">Load admin data to view profiles.</td></tr>`}
        </table>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Name Review</h2>
        <table class="table"><tr><th>Name</th><th>Matched Term</th><th>Status</th><th>Replacement</th><th>Action</th></tr>
          ${state.nameReviews.length ? state.nameReviews.map(review => `<tr><td>${escapeHtml(review.submitted_name)}</td><td>${escapeHtml(review.matched_term || "-")}</td><td><span class="status ${review.status === "Pending" ? "gold" : "info"}">${escapeHtml(review.status)}</span></td><td><input value="${escapeHtml(review.replacement_name || review.submitted_name)}" oninput='setNameReviewReplacement(${jsString(review.id)}, this.value)'></td><td><button class="chip" onclick='reviewFlaggedName(${jsString(review.id)}, "Approved")'>Approve</button> <button class="chip" onclick='reviewFlaggedName(${jsString(review.id)}, "Modified")'>Modify</button> <button class="chip" onclick='reviewFlaggedName(${jsString(review.id)}, "Rejected")'>Reject</button></td></tr>`).join("") : `<tr><td colspan="5" class="muted">No name reviews loaded.</td></tr>`}
        </table>
        <label class="field">Banned Word Or Phrase<input value="${escapeHtml(state.bannedWordInput)}" oninput="state.bannedWordInput=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitBannedWord()}"></label>
        <button class="button primary" onclick="submitBannedWord()">Submit Banned Word</button>
        <table class="table" style="margin-top:12px;"><tr><th>Banned Word/Phrase</th><th>Action</th></tr>${state.bannedWords.length ? state.bannedWords.map(word => `<tr><td>${escapeHtml(word)}</td><td><button type="button" class="chip" onclick='window.removeBannedWord(${jsString(word)})'>Remove</button></td></tr>`).join("") : `<tr><td colspan="2" class="muted">No banned words are currently active.</td></tr>`}</table>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Tag Management</h2><span class="status info">${escapeHtml(state.adminTagStatus)}</span></div>
        <label class="field">New Topic Tag<input value="${escapeHtml(state.adminTagInput)}" oninput="state.adminTagInput=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitAdminTag()}"></label>
        <button class="button primary" onclick="submitAdminTag()">Create Tag</button>
        <table class="table" style="margin-top:12px;"><tr><th>Custom Tag</th><th>Action</th></tr>${state.adminTags.length ? state.adminTags.map(tag => `<tr><td>${escapeHtml(tag)}</td><td><button class="chip" onclick='removeAdminTag(${jsString(tag)})'>Remove</button></td></tr>`).join("") : `<tr><td colspan="2" class="muted">No custom tags created yet.</td></tr>`}</table>
      </section>
    </div>
  `;
}

function adminDeletionPage() {
  const readyToExecute = state.adminDeletionQueue.filter(row => row.status === "Final warning sent").length;
  const awaitingWarning = state.adminDeletionQueue.filter(row => row.status === "Requested").length;
  const completed = state.adminDeletionQueue.filter(row => row.status === "Completed").length;
  return `
    <div class="grid">
      <section class="card panel span-4 metric"><span class="muted">Awaiting Final Warning</span><strong>${awaitingWarning}</strong></section>
      <section class="card panel span-4 metric"><span class="muted">Ready To Execute</span><strong>${readyToExecute}</strong></section>
      <section class="card panel span-4 metric"><span class="muted">Completed</span><strong>${completed}</strong></section>
      <section class="card panel span-12">
        <div class="split"><h2 class="section-title">Owner Deletion Execution</h2><span class="status ${isOwnerRole() ? "good" : "gold"}">${isOwnerRole() ? "Owner execution enabled" : "Owner required"}</span></div>
        <p class="muted">Owners can send the final warning, then execute account deletion after the request reaches <code>Final warning sent</code>. Execution calls the deployed Supabase Edge Function and removes the Supabase Auth user.</p>
        <div class="actions">
          <button class="button primary" onclick="refreshAdminDeletionQueue()">Load Deletion Requests</button>
          <button class="button" onclick="checkAccountDeletionFunction()">Check Deletion Function</button>
        </div>
      </section>
      ${adminDeletionQueuePanel()}
    </div>
  `;
}

function adminGovernancePage() {
  const ownerCount = activeOwnerCount();
  return `
    <div class="grid">
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Administrator Access Links</h2><span class="status info">${escapeHtml(state.adminInviteStatus)}</span></div>
        <label class="field">Email Address<input type="email" value="${escapeHtml(state.adminInviteEmail)}" onchange="state.adminInviteEmail=this.value"></label>
        <label class="field">Requested Role<select onchange="state.adminInviteRole=this.value"><option value="admin" ${state.adminInviteRole === "admin" ? "selected" : ""}>Administrator</option><option value="owner" ${state.adminInviteRole === "owner" ? "selected" : ""} ${isOwnerRole() ? "" : "disabled"}>Owner</option></select></label>
        <button class="button primary" onclick="generateAdminAccessLink()">Generate Access Link</button>
        ${state.adminInviteLink ? `<label class="field invite-link-field">Generated Link<div class="inline-actions"><input class="code-input" readonly value="${escapeHtml(state.adminInviteLink)}" onclick="this.select()"><button class="button ghost" onclick="copyAdminInviteLink()">Copy</button></div></label>` : ""}
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Owner Governance</h2><span class="status ${isOwnerRole() ? "good" : "gold"}">${isOwnerRole() ? "Owner controls enabled" : "Owner required"}</span></div>
        <p class="muted">${escapeHtml(state.governanceStatus)}</p>
        <p class="muted">${ownerCount <= 1 ? "Single-owner mode: owner actions are approved immediately." : `${ownerCount} active Owners: starting an action records your approval, then the remaining Owners can vote below.`}</p>
        <label class="field">Target User ID, Display Name, Or Email<input value="${escapeHtml(state.governanceTarget)}" oninput="state.governanceTarget=this.value"></label>
        <label class="field">Reason<input value="${escapeHtml(state.governanceReason)}" oninput="state.governanceReason=this.value"></label>
        <table class="table"><tr><th>Proposal</th><th>Threshold</th><th>Action</th></tr>
          <tr><td>Create Owner account</td><td>Unanimous approval from all active Owners</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Create Owner')">${ownerCount <= 1 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Remove Owner account</td><td>${ownerCount <= 2 ? "Single Owner approval to remove the other Owner" : "Majority approval from active Owners"}</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Remove Owner')">${ownerCount <= 2 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Create Administrator</td><td>${ownerCount <= 1 ? "Single Owner approval" : "At least two Owner approvals"}</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Create Administrator')">${ownerCount <= 1 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Suspend Administrator</td><td>${ownerCount <= 1 ? "Single Owner approval" : "At least two Owner approvals"}</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Suspend Administrator')">${ownerCount <= 1 ? "Approve Now" : "Start Vote"}</button></td></tr>
          <tr><td>Override Administrator action</td><td>Single Owner approval</td><td><button class="chip" ${isOwnerRole() ? "" : "disabled"} onclick="startGovernanceVote('Override Administrator Action')">Override</button></td></tr>
        </table>
      </section>
      <section class="card panel span-12">
        <h2 class="section-title">Open And Recent Votes</h2>
        <table class="table"><tr><th>Action</th><th>Target</th><th>Votes</th><th>Status</th><th>Ballot</th></tr>
          ${state.governanceVotes.length ? state.governanceVotes.map(vote => {
            const ballots = vote.governance_ballots || [];
            const approvals = ballots.filter(ballot => ballot.decision === "Approve").length;
            const rejections = ballots.filter(ballot => ballot.decision === "Reject").length;
            return `<tr><td>${escapeHtml(vote.action)}<br><span class="muted">${escapeHtml(vote.reason || "")}</span></td><td>${escapeHtml(vote.target_email || vote.target_user_id || "-")}</td><td>${approvals}/${vote.required_approvals} approve, ${rejections}/${vote.required_rejections} reject</td><td><span class="status ${vote.status === "Approved" ? "good" : vote.status === "Rejected" ? "bad" : "gold"}">${escapeHtml(vote.status)}</span></td><td><div class="row-actions"><button class="chip" ${vote.status === "Open" && isOwnerRole() ? "" : "disabled"} onclick='castGovernanceBallot(${jsString(vote.id)}, "Approve")'>Approve</button><button class="chip" ${vote.status === "Open" && isOwnerRole() ? "" : "disabled"} onclick='castGovernanceBallot(${jsString(vote.id)}, "Reject")'>Reject</button></div></td></tr>`;
          }).join("") : `<tr><td colspan="5" class="muted">No governance votes loaded.</td></tr>`}
        </table>
      </section>
    </div>
  `;
}

function adminOwnerAccessPage() {
  const suspended = state.ownerPrivilegesSuspended;
  const canSuspend = isOwnerRole() && !suspended;
  const canRestore = isAdminRole() && suspended;
  return `
    <div class="grid">
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Owner Privilege Suspension</h2><span class="status ${suspended ? "gold" : "good"}">${suspended ? "Suspended" : "Active"}</span></div>
        <p class="status ${state.ownerPrivilegeForm.status.includes("Could not") || state.ownerPrivilegeForm.status.includes("Enter") ? "bad" : "info"}">${escapeHtml(state.ownerPrivilegeForm.status)}</p>
        <p class="muted">This changes only your Owner privileges. Your account remains available, and suspended Owner access becomes Administrator access until restored.</p>
        <label class="field">Account Password
          <input type="password" value="${escapeHtml(state.ownerPrivilegeForm.password)}" oninput="state.ownerPrivilegeForm.password=this.value">
        </label>
        <div class="actions">
          <button class="button accent" ${canSuspend ? "" : "disabled"} onclick="setOwnOwnerPrivilegesSuspended(true)">Suspend Owner Privileges</button>
          <button class="button primary" ${canRestore ? "" : "disabled"} onclick="setOwnOwnerPrivilegesSuspended(false)">Restore Owner Privileges</button>
        </div>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">How This Works</h2>
        <table class="table">
          <tr><th>Before suspension</th><td>Your account has Owner permissions.</td></tr>
          <tr><th>During suspension</th><td>Your account keeps Administrator access but cannot use Owner-only governance or revenue controls.</td></tr>
          <tr><th>Restoration</th><td>Type the same account password to restore Owner privileges.</td></tr>
          <tr><th>Audit trail</th><td>Suspension and restoration actions are recorded in the admin audit log.</td></tr>
        </table>
      </section>
    </div>
  `;
}

function adminBroadcastsPage() {
  return `
    <div class="grid">
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Notification Broadcasts</h2><span class="status info">${escapeHtml(state.broadcastStatus)}</span></div>
        <label class="field">Audience<select onchange="state.broadcastAudience=this.value"><option value="all" ${state.broadcastAudience === "all" ? "selected" : ""}>Entire user base</option><option value="premium" ${state.broadcastAudience === "premium" ? "selected" : ""}>Premium users</option><option value="free" ${state.broadcastAudience === "free" ? "selected" : ""}>Free users</option><option value="admin" ${state.broadcastAudience === "admin" ? "selected" : ""}>Administrators</option><option value="owner" ${state.broadcastAudience === "owner" ? "selected" : ""}>Owners</option></select></label>
        <label class="field">Title<input value="${escapeHtml(state.broadcastTitle)}" oninput="state.broadcastTitle=this.value"></label>
        <label class="field">Message<textarea oninput="state.broadcastMessage=this.value">${escapeHtml(state.broadcastMessage)}</textarea></label>
        <button class="button primary" onclick="queueAdminBroadcast()">Queue Broadcast</button>
      </section>
      <section class="card panel span-6">
        <h2 class="section-title">Broadcast History</h2>
        <table class="table"><tr><th>Audience</th><th>Status</th><th>Recipients</th><th>Created</th></tr>${state.broadcasts.length ? state.broadcasts.map(item => `<tr><td>${escapeHtml(item.audience)}</td><td>${escapeHtml(item.status)}</td><td>${item.recipient_count}</td><td>${escapeHtml(formatDateTime(item.created_at))}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">No broadcasts loaded.</td></tr>`}</table>
      </section>
    </div>
  `;
}

function adminAuditSecurityPage() {
  return `
    <div class="grid">
      <section class="card panel span-6">
        <h2 class="section-title">Infrastructure And Security</h2>
        <table class="table"><tr><th>Auth</th><td>Supabase Authentication, email verification, Google sign-in</td></tr><tr><th>Database</th><td>Supabase</td></tr><tr><th>Hosting</th><td>Microsoft Azure</td></tr><tr><th>Email</th><td>Resend</td></tr><tr><th>Payments</th><td>Stripe managed subscriptions, no raw card storage</td></tr><tr><th>Controls</th><td>Rate limiting, session protection, protected admin routes</td></tr></table>
        <button class="button" onclick="setAdminPage('question-bank')">Manage Supabase Question Bank</button>
      </section>
      <section class="card panel span-6">
        <div class="split"><h2 class="section-title">Role Permissions</h2><span class="status ${isOwnerRole() ? "good" : "gold"}">${roleLabel()}</span></div>
        <table class="table"><tr><th>Administrator</th><td>Question operations, reports, tags, moderation, broadcasts, and analytics.</td></tr><tr><th>Owner</th><td>All Administrator permissions, plus governance, Owner/Admin role changes, and revenue statistics.</td></tr><tr><th>Current access</th><td>${isOwnerRole() ? "Owner governance enabled." : "Owner governance controls are hidden until an Owner account signs in."}</td></tr></table>
      </section>
      <section class="card panel span-12">
        <h2 class="section-title">Audit Log</h2>
        <table class="table"><tr><th>Date</th><th>Admin</th><th>Action</th><th>Resource</th><th>Reason</th></tr>
          ${state.adminAuditLogs.length ? state.adminAuditLogs.map(row => `<tr><td>${escapeHtml(formatDateTime(row.created_at))}</td><td>${escapeHtml(row.actor_email || row.actor_user_id || "-")}</td><td>${escapeHtml(row.action)}</td><td>${escapeHtml(`${row.resource_type}${row.resource_id ? `: ${row.resource_id}` : ""}`)}</td><td>${escapeHtml(row.reason || "-")}</td></tr>`).join("") : auditEvents.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
        </table>
      </section>
    </div>
  `;
}

function render() {
  if (state.route === "landing") return landing();
  if (state.route === "login") return auth("login");
  if (state.route === "signup") return auth("signup");
  if (state.route === "supabase-setup") return publicSupabaseSetup();
  if (state.route === "password-reset") return passwordReset();
  if (state.route === "team-invite") return teamInviteAcceptancePage();
  if (state.route === "dashboard") return dashboard();
  if (state.route === "practice-setup") return practiceSetupPage();
  if (state.route === "teams") return teamAccountsPage();
  if (state.route === "generator") return generator();
  if (state.route === "infinite") return infinite();
  if (state.route === "testid") return testIdPreview();
  if (state.route === "test") return testView();
  if (state.route === "results") return results();
  if (state.route === "analytics") return analytics();
  if (state.route === "history") return history();
  if (state.route === "questionbank") return questionBank();
  if (state.route === "search") return search();
  if (state.route === "exports") return exportsPage();
  if (state.route === "settings") return settings();
  if (state.route === "recovery") return recovery();
  if (state.route === "admin") return adminDashboard();
  state.route = "landing";
  return landing();
}

Object.assign(window, {
  state,
  render,
  setRoute,
  setAdminPage,
  toggleTheme,
  startTest,
  normalizeTeamRoleLabel,
  createTeamAccount,
  setSelectedTeam,
  refreshTeamAccountsFromSupabase,
  addTeamMember,
  acceptTeamInvite,
  copyTeamInviteLink,
  sendTeamInviteEmail,
  openTeamInviteEmailDraft,
  createTeamAssignment,
  toggleAssignmentRecipient,
  selectAllAssignmentRecipients,
  updateOnboardingDraft,
  updateOnboardingQuestionCount,
  saveOnboardingPlan,
  startOnboardingDiagnostic,
  startOnboardingPractice,
  updateSearchKeywordDraft,
  selectAnswer,
  nextQuestion,
  submitCurrentTest,
  reportQuestion,
  reviewQuestion,
  selectBlueprint,
  saveBlueprintFromForm,
  editSelectedBlueprint,
  restorePrdBlueprints,
  deleteCustomBlueprint,
  saveAdminQuestion,
  bulkUploadSupabaseQuestions,
  buildQuestionPayloadFromForm,
  loadSupabaseBank,
  jsString,
  removeBannedWord,
  toggleNotificationPreference,
  submitBannedWord,
  updateReportStatus,
  selectReportForEdit,
  saveReportQuestionLocally,
  saveReportQuestionToSupabase,
  refreshReportQueueFromSupabase,
  retireReportQuestionLocally,
  submitAdminTag,
  removeAdminTag,
  generateAdminAccessLink,
  copyAdminInviteLink,
  startGovernanceVote,
  castGovernanceBallot,
  setOwnOwnerPrivilegesSuspended,
  refreshAdminControlData,
  refreshGeneratedQuestionCandidates,
  setGeneratedCandidateFilter,
  selectGeneratedCandidateForEdit,
  saveGeneratedCandidateEdits,
  updateGeneratedCandidateReviewStatus,
  publishGeneratedQuestionCandidate,
  handleGeneratedCandidateAction,
  setUserSuspension,
  reviewFlaggedName,
  setNameReviewReplacement,
  queueAdminBroadcast,
  reviewBulkDuplicates,
  resolveDuplicateReview,
  restoreBlueprintVersion,
  setCustomTimerMinutes,
  exportTestResults,
  exportAnalyticsReport,
  exportPerformanceHistory,
  exportSupabaseAccountData,
  exportSupabaseTestHistory,
  loginUser,
  signupUser,
  loginWithGoogle,
  startGoogleAuth,
  connectGoogleIdentity,
  openLocalServer,
  forgotPassword,
  changePassword,
  sendPasswordResetEmail,
  updateRecoveryPassword,
  logoutUser,
  saveAccountSettings,
  resendPendingEmailChange,
  cancelPendingEmailChange,
  setMembershipTier,
  refreshBillingStatus,
  startCheckout,
  upgradeForPremium,
  openCustomerPortal,
  requestAccountDeletion,
  cancelAccountDeletion,
  refreshAdminDeletionQueue,
  updateAdminDeletionRequest,
  executeAccountDeletionRequest,
  checkAccountDeletionFunction,
  markNotificationRead,
  pauseCurrentTest,
  resumePausedSession,
  clearPausedSession,
  closeQuestionReview,
  showQuestionReviewDetails,
  lookupTestId,
  launchTestId,
  generateUpdatedTestId,
  generateShorterTest,
  toggleReportForm,
  startDemoTest
});

window.addEventListener("hashchange", () => {
  if (applyRecoveryRouteFromUrl()) render();
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const handlers = {
    "demo-test": () => startDemoTest(),
    login: () => setRoute("login"),
    signup: () => setRoute("signup"),
    "login-submit": () => loginUser(),
    "signup-submit": () => signupUser(),
    "forgot-password": () => forgotPassword(),
    "google-login": () => loginWithGoogle(),
    "supabase-settings": () => setRoute("supabase-setup"),
    "open-local-server": () => openLocalServer()
  };
  if (!handlers[action]) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    handlers[action]();
  } catch (error) {
    state.authStatus = error.message || "That action could not be completed.";
    state.testNotice = state.authStatus;
    console.error(error);
    render();
  }
});

function startApp() {
  try {
    applySupabaseConfigFromUrl();
    applyRecoveryRouteFromUrl();
    render();
    scheduleAuthSessionRestore();
  } catch (error) {
    state.authStatus = error.message || "The app had trouble starting.";
    state.route = "landing";
    console.error(error);
    landing();
  }
}

window.addEventListener("error", event => {
  state.authStatus = event.error?.message || event.message || "A page error occurred.";
});

window.addEventListener("unhandledrejection", event => {
  state.authStatus = event.reason?.message || "A background request failed.";
});

startApp();
