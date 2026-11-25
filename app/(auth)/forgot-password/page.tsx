import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { getLayoutPlatformBranding } from '@/lib/services/platform-settings-cache';

export default async function ForgotPasswordPage() {
  const branding = await getLayoutPlatformBranding();
  return <ForgotPasswordForm branding={branding} />;
}
