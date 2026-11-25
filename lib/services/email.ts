import { getPlatformSettings } from '@/lib/services/platform-settings';
import {
  sendSmtpMail,
  smtpConfigReady,
  type SmtpMailAttachment,
} from '@/lib/services/smtp-mailer';
import { isMockDataEnabled } from '@/lib/mock/config';

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  cc?: string | string[];
  attachments?: SmtpMailAttachment[];
};

export async function sendEmail(input: SendMailInput): Promise<boolean> {
  const config = await getPlatformSettings();

  if (smtpConfigReady(config)) {
    const result = await sendSmtpMail(config, input);
    return result.ok;
  }

  if (isMockDataEnabled() || process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[email:mock]', input.to, input.cc ? `cc:${input.cc}` : '', input.subject);
  }
  return false;
}
