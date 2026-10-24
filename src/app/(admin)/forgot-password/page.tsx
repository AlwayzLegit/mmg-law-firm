import AuthCard from "@/components/admin/auth-card";

import ForgotPasswordForm from "./forgot-password-form";

export const metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your admin email and we'll send you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
