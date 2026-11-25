import type { PlatformConfig } from '@/lib/dg/platform-config';
import { isMockDataEnabled } from '@/lib/mock/config';

export type SmtpMailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: 'inline' | 'attachment';
};

export type SmtpMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  attachments?: SmtpMailAttachment[];
};

export function smtpConfigReady(config: Pick<PlatformConfig, 'smtpHost' | 'smtpFromEmail'>): boolean {
  return Boolean(config.smtpHost?.trim() && config.smtpFromEmail?.trim());
}

function useSmtpMock(forceReal?: boolean) {
  if (forceReal) return false;
  if (process.env.SMTP_FORCE_REAL === 'true') return false;
  return isMockDataEnabled();
}

function buildTransportOptions(config: PlatformConfig) {
  const port = config.smtpPort || 587;
  // Port 465 = SSL direct ; 587 = STARTTLS (smtpSecure false côté UI)
  const secure = port === 465 ? true : config.smtpSecure;
  return {
    host: config.smtpHost,
    port,
    secure,
    requireTLS: port === 587 && !secure,
    auth: config.smtpUser
      ? {
          user: config.smtpUser,
          pass: config.smtpPassword,
        }
      : undefined,
  };
}

export async function sendSmtpMail(
  config: PlatformConfig,
  input: SmtpMailInput,
  options?: { forceReal?: boolean }
): Promise<{ ok: true; mock?: boolean } | { ok: false; error: string }> {
  if (!smtpConfigReady(config)) {
    return { ok: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  if (!config.smtpUser?.trim() || !config.smtpPassword?.trim()) {
    return {
      ok: false,
      error: 'Identifiants SMTP manquants (utilisateur et mot de passe requis).',
    };
  }

  if (useSmtpMock(options?.forceReal)) {
    // eslint-disable-next-line no-console
    console.log('[smtp:mock]', config.smtpFromEmail, '→', input.to, input.subject);
    return { ok: true, mock: true };
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport(buildTransportOptions(config));
    await transporter.sendMail({
      from: config.smtpFromEmail,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.subject,
      attachments: input.attachments?.map((item) => ({
        filename: item.filename,
        content: item.content,
        contentType: item.contentType,
        cid: item.cid,
        contentDisposition: item.contentDisposition ?? (item.cid ? 'inline' : 'attachment'),
      })),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP_SEND_FAILED';
    return { ok: false, error: message };
  }
}

export async function testSmtpConnection(
  config: PlatformConfig,
  testRecipient: string
): Promise<{ ok: true; mock?: boolean } | { ok: false; error: string }> {
  const org = config.organizationName || 'Plateforme';
  return sendSmtpMail(
    config,
    {
      to: testRecipient,
      subject: `[${org}] Test de configuration email`,
      html: `<p>Ceci est un message de test envoyé depuis les paramètres système.</p><p>Si vous recevez cet email, la configuration SMTP est correcte.</p>`,
      text: `Test SMTP — ${org}`,
    },
    { forceReal: true }
  );
}
