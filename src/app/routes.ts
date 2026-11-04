import { lazy, type ComponentType } from "react";

import { paths } from "./urlPaths";
import type { AppRole } from "../lib/supabase/types";

type AppRoute = {
  path: string;
  label: string;
  element: ComponentType;
  navigation: "public" | "app" | "team" | "admin" | "hidden";
  auth?: "public" | "guest" | "protected";
  requiredRole?: AppRole;
};

const LandingPage = lazy(() =>
  import("../pages/public/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const LoginPage = lazy(() =>
  import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const SignupPage = lazy(() =>
  import("../pages/auth/SignupPage").then((module) => ({ default: module.SignupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const AuthCallbackPage = lazy(() =>
  import("../pages/auth/AuthCallbackPage").then((module) => ({
    default: module.AuthCallbackPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("../pages/auth/VerifyEmailPage").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ProfilePage = lazy(() =>
  import("../pages/app/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const UnauthorizedPage = lazy(() =>
  import("../pages/system/UnauthorizedPage").then((module) => ({
    default: module.UnauthorizedPage,
  })),
);
const DashboardPage = lazy(() =>
  import("../pages/app/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const PracticeSetupPage = lazy(() =>
  import("../pages/app/PracticeSetupPage").then((module) => ({
    default: module.PracticeSetupPage,
  })),
);
const TestIdPage = lazy(() =>
  import("../pages/public/TestIdPage").then((module) => ({
    default: module.TestIdPage,
  })),
);
const QuizPage = lazy(() =>
  import("../pages/app/QuizPage").then((module) => ({ default: module.QuizPage })),
);
const TestSessionPage = lazy(() =>
  import("../pages/app/TestSessionPage").then((module) => ({
    default: module.TestSessionPage,
  })),
);
const TestResultPage = lazy(() =>
  import("../pages/app/TestResultPage").then((module) => ({
    default: module.TestResultPage,
  })),
);
const TestHistoryPage = lazy(() =>
  import("../pages/app/TestHistoryPage").then((module) => ({
    default: module.TestHistoryPage,
  })),
);
const MyReportsPage = lazy(() =>
  import("../pages/app/MyReportsPage").then((module) => ({
    default: module.MyReportsPage,
  })),
);
const QuestionRepositoryPage = lazy(() =>
  import("../pages/admin/QuestionRepositoryPage").then((module) => ({
    default: module.QuestionRepositoryPage,
  })),
);
const QuestionAuthoringPage = lazy(() =>
  import("../pages/admin/QuestionAuthoringPage").then((module) => ({
    default: module.QuestionAuthoringPage,
  })),
);
const CatalogManagementPage = lazy(() =>
  import("../pages/admin/CatalogManagementPage").then((module) => ({
    default: module.CatalogManagementPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("../pages/admin/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const OwnerGovernancePage = lazy(() =>
  import("../pages/admin/OwnerGovernancePage").then((module) => ({
    default: module.OwnerGovernancePage,
  })),
);
const OwnerInvitationPage = lazy(() =>
  import("../pages/admin/OwnerGovernancePage").then((module) => ({
    default: module.OwnerInvitationPage,
  })),
);
const OwnerAccessPage = lazy(() =>
  import("../pages/app/OwnerAccessPage").then((module) => ({
    default: module.OwnerAccessPage,
  })),
);
const AccountDeletionPage = lazy(() =>
  import("../pages/app/AccountDeletionPage").then((module) => ({
    default: module.AccountDeletionPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import("../pages/app/AnalyticsPage").then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const QuestionSearchPage = lazy(() =>
  import("../pages/app/QuestionSearchPage").then((module) => ({
    default: module.QuestionSearchPage,
  })),
);
const GenerationPipelinePage = lazy(() =>
  import("../pages/admin/GenerationPipelinePage").then((module) => ({
    default: module.GenerationPipelinePage,
  })),
);
const CandidateReviewPage = lazy(() =>
  import("../pages/admin/CandidateReviewPage").then((module) => ({
    default: module.CandidateReviewPage,
  })),
);
const ReportQueuePage = lazy(() =>
  import("../pages/admin/ReportQueuePage").then((module) => ({
    default: module.ReportQueuePage,
  })),
);
const ReportDetailPage = lazy(() =>
  import("../pages/admin/ReportDetailPage").then((module) => ({
    default: module.ReportDetailPage,
  })),
);
const AuditLogPage = lazy(() =>
  import("../pages/admin/AuditLogPage").then((module) => ({
    default: module.AuditLogPage,
  })),
);
const PlaceholderPage = lazy(() =>
  import("../pages/system/PlaceholderPage").then((module) => ({
    default: module.PlaceholderPage,
  })),
);

export const routes = [
  {
    path: paths.home,
    label: "Home",
    element: LandingPage,
    navigation: "public",
    auth: "public",
  },
  {
    path: paths.login,
    label: "Log In",
    element: LoginPage,
    navigation: "public",
    auth: "guest",
  },
  {
    path: paths.signup,
    label: "Sign Up",
    element: SignupPage,
    navigation: "public",
    auth: "guest",
  },
  {
    path: paths.forgotPassword,
    label: "Forgot Password",
    element: ForgotPasswordPage,
    navigation: "hidden",
    auth: "guest",
  },
  {
    path: paths.resetPassword,
    label: "Reset Password",
    element: ResetPasswordPage,
    navigation: "hidden",
    auth: "public",
  },
  {
    path: paths.authCallback,
    label: "Auth Callback",
    element: AuthCallbackPage,
    navigation: "hidden",
    auth: "public",
  },
  {
    path: paths.verifyEmail,
    label: "Verify Email",
    element: VerifyEmailPage,
    navigation: "hidden",
    auth: "public",
  },
  {
    path: paths.dashboard,
    label: "Dashboard",
    element: DashboardPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.generate,
    label: "Generate",
    element: PracticeSetupPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.quiz,
    label: "Quiz",
    element: QuizPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.practiceSetup,
    label: "Practice Setup",
    element: PracticeSetupPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: paths.history,
    label: "History",
    element: TestHistoryPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.reports,
    label: "My Reports",
    element: MyReportsPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.testSession,
    label: "Test Session",
    element: TestSessionPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: paths.testResult,
    label: "Test Result",
    element: TestResultPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: paths.testId,
    label: "Test ID",
    element: TestIdPage,
    navigation: "public",
    auth: "public",
  },
  {
    path: paths.teams,
    label: "Teams",
    element: PlaceholderPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: paths.admin,
    label: "Overview",
    element: AdminDashboardPage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: paths.adminQuestions,
    label: "Questions",
    element: QuestionRepositoryPage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: paths.adminGeneration,
    label: "Generation Pipeline",
    element: GenerationPipelinePage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: "/admin/questions/author",
    label: "Question Authoring",
    element: QuestionAuthoringPage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: "/admin/catalog",
    label: "Tags & Blueprints",
    element: CatalogManagementPage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: "/admin/candidates",
    label: "Candidate Review",
    element: CandidateReviewPage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: paths.adminReports,
    label: "Report Queue",
    element: ReportQueuePage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: paths.adminReportDetail,
    label: "Report Review",
    element: ReportDetailPage,
    navigation: "hidden",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: paths.adminAudit,
    label: "Audit Log",
    element: AuditLogPage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "admin",
  },
  {
    path: "/admin/governance",
    label: "Owner Governance",
    element: OwnerGovernancePage,
    navigation: "admin",
    auth: "protected",
    requiredRole: "owner",
  },
  {
    path: "/owner-invitation",
    label: "Owner Invitation",
    element: OwnerInvitationPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: "/owner-access",
    label: "Owner Access",
    element: OwnerAccessPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: paths.profile,
    label: "Profile",
    element: ProfilePage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.analytics,
    label: "Analytics",
    element: AnalyticsPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: paths.search,
    label: "Search",
    element: QuestionSearchPage,
    navigation: "app",
    auth: "protected",
  },
  {
    path: "/account/deletion",
    label: "Account Deletion",
    element: AccountDeletionPage,
    navigation: "hidden",
    auth: "protected",
  },
  {
    path: paths.unauthorized,
    label: "Unauthorized",
    element: UnauthorizedPage,
    navigation: "hidden",
    auth: "public",
  },
] satisfies AppRoute[];

export const primaryNavigationRoutes = routes.filter(
  (route) => route.navigation === "app" || route.navigation === "admin",
);
