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
const QuestionRepositoryPage = lazy(() =>
  import("../pages/admin/QuestionRepositoryPage").then((module) => ({
    default: module.QuestionRepositoryPage,
  })),
);
const GenerationPipelinePage = lazy(() =>
  import("../pages/admin/GenerationPipelinePage").then((module) => ({
    default: module.GenerationPipelinePage,
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
    path: paths.practiceSetup,
    label: "Practice Setup",
    element: PracticeSetupPage,
    navigation: "app",
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
    navigation: "team",
    auth: "protected",
  },
  {
    path: paths.admin,
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
    path: paths.profile,
    label: "Profile",
    element: ProfilePage,
    navigation: "app",
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
  (route) =>
    route.navigation === "app" ||
    route.navigation === "team" ||
    route.navigation === "admin",
);
