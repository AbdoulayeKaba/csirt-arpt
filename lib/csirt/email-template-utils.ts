import { CSIRT_BRAND } from '@/lib/csirt/brand';

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function getPublicBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (!raw) return `https://${CSIRT_BRAND.siteHost}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/$/, '');
  }
  return `https://${raw.replace(/\/$/, '')}`;
}

/** URL publique pour les liens dans les e-mails (jamais localhost). */
export function getEmailPublicBaseUrl(): string {
  const candidates = [
    process.env.EMAIL_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    const normalized = (value.startsWith('http://') || value.startsWith('https://')
      ? value
      : `https://${value}`
    ).replace(/\/$/, '');
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(normalized)) continue;
    return normalized;
  }

  return `https://${CSIRT_BRAND.siteHost}`;
}

export function renderBrandLogoHtml(logoSrc?: string | null): string {
  if (logoSrc) {
    return `<img src="${logoSrc}" alt="${escapeHtml(CSIRT_BRAND.name)}" width="56" height="56" style="display:block;width:56px;height:56px;border:0;outline:none;text-decoration:none;border-radius:12px;background:#ffffff;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,0.18);" />`;
  }

  return `
    <div style="width:56px;height:56px;border-radius:12px;background:#ffffff;box-shadow:0 8px 24px rgba(0,0,0,0.18);text-align:center;padding:6px;box-sizing:border-box;">
      <span style="display:inline-block;margin-top:10px;font-size:12px;font-weight:900;letter-spacing:0.06em;color:#14532d;line-height:1.1;">ARPT</span>
    </div>
  `;
}

export function formatMultilineHtml(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br/>');
}

export function formatFrenchDateTime(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
  }
  return date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
}

type EmailShellParams = {
  title: string;
  preheader: string;
  accentColor?: string;
  body: string;
};

export function renderEmailShell(params: EmailShellParams): string {
  const accent = params.accentColor || '#14532d';
  return `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(params.title)}</title>
    <!--[if mso]>
      <style type="text/css">
        body, table, td { font-family: Arial, sans-serif !important; }
      </style>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background:#e8edf3;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${escapeHtml(params.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8edf3;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:700px;background:#ffffff;border:1px solid #d7e0ea;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.10);">
            <tr>
              <td style="height:5px;background:${accent};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            ${params.body}
          </table>
          <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;max-width:700px;">
            ${escapeHtml(CSIRT_BRAND.name)} · ${escapeHtml(CSIRT_BRAND.parent)} · ${escapeHtml(CSIRT_BRAND.country)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

export function renderBrandRibbon(params: {
  eyebrow: string;
  title: string;
  subtitle: string;
  badgeHtml?: string;
  dark?: boolean;
  logoSrc?: string | null;
}): string {
  const logoHtml = renderBrandLogoHtml(params.logoSrc);
  const bg = params.dark
    ? 'background:linear-gradient(135deg,#0b1220 0%,#162033 48%,#14532d 100%);'
    : 'background:linear-gradient(135deg,#14532d 0%,#166534 55%,#15803d 100%);';

  return `
    <tr>
      <td style="padding:0;${bg}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:26px 30px 22px;width:72px;vertical-align:top;">
              ${logoHtml}
            </td>
            <td style="padding:26px 0 22px;color:#ffffff;vertical-align:top;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.86;font-weight:700;">
                ${escapeHtml(params.eyebrow)}
              </p>
              <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;">
                ${escapeHtml(params.title)}
              </h1>
              <p style="margin:0;font-size:14px;line-height:1.55;opacity:0.92;max-width:460px;">
                ${escapeHtml(params.subtitle)}
              </p>
            </td>
            ${
              params.badgeHtml
                ? `<td style="padding:26px 30px 22px 0;vertical-align:top;text-align:right;">${params.badgeHtml}</td>`
                : ''
            }
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function renderSeverityBadge(label: string, color: string): string {
  return `
    <span style="display:inline-block;padding:9px 14px;border-radius:999px;background:${color};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;box-shadow:0 8px 20px rgba(0,0,0,0.18);">
      ${escapeHtml(label)}
    </span>
  `;
}

export function renderKpiGrid(cells: Array<{ label: string; value: string; tone?: string }>): string {
  const width = Math.floor(100 / Math.max(cells.length, 1));
  const items = cells
    .map(
      (cell) => `
        <td style="width:${width}%;padding:0 6px 0 0;vertical-align:top;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">
                  ${escapeHtml(cell.label)}
                </p>
                <p style="margin:0;font-size:15px;line-height:1.35;font-weight:800;color:${cell.tone || '#0f172a'};">
                  ${escapeHtml(cell.value)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      `
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 4px;">
      <tr>${items}</tr>
    </table>
  `;
}

export function renderSectionTitle(title: string, subtitle?: string): string {
  return `
    <p style="margin:0 0 ${subtitle ? '4px' : '12px'};font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">
      ${escapeHtml(title)}
    </p>
    ${
      subtitle
        ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#94a3b8;">${escapeHtml(subtitle)}</p>`
        : ''
    }
  `;
}

export function renderInfoPanel(
  content: string,
  variant: 'neutral' | 'alert' | 'success' = 'neutral'
): string {
  const styles = {
    neutral: 'background:#f8fafc;border:1px solid #e2e8f0;color:#334155;',
    alert: 'background:#fff7ed;border:1px solid #fdba74;color:#9a3412;',
    success: 'background:#f0fdf4;border:1px solid #86efac;color:#166534;',
  }[variant];

  return `
    <div style="padding:16px 18px;border-radius:14px;font-size:14px;line-height:1.7;${styles}">
      ${content}
    </div>
  `;
}

/** Alias conservé pour compatibilité (anciens templates). */
export const renderInfoNotice = renderInfoPanel

export function renderMetaTable(rows: Array<{ label: string; value: string; valueHtml?: string }>): string {
  const body = rows
    .map(
      (row, index) => `
        <tr>
          <td style="padding:13px 16px;${index < rows.length - 1 ? 'border-bottom:1px solid #eef2f7;' : ''}width:34%;vertical-align:top;background:#fcfdfe;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding:13px 16px;${index < rows.length - 1 ? 'border-bottom:1px solid #eef2f7;' : ''}vertical-align:top;font-size:14px;line-height:1.55;color:#0f172a;font-weight:600;">
            ${row.valueHtml ?? escapeHtml(row.value)}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      ${body}
    </table>
  `;
}

export function renderTagList(items: string[], emptyLabel = '—'): string {
  if (!items.length) {
    return `<span style="color:#94a3b8;font-weight:500;">${escapeHtml(emptyLabel)}</span>`;
  }
  return items
    .map(
      (item) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 11px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;font-size:12px;font-weight:700;color:#1d4ed8;">${escapeHtml(item)}</span>`
    )
    .join('');
}

export function renderTimeline(steps: Array<{ title: string; detail: string }>): string {
  const items = steps
    .map(
      (step, index) => `
        <tr>
          <td style="width:34px;vertical-align:top;padding:0 0 18px;">
            <div style="width:28px;height:28px;border-radius:999px;background:#14532d;color:#ffffff;font-size:12px;font-weight:800;line-height:28px;text-align:center;">
              ${index + 1}
            </div>
          </td>
          <td style="vertical-align:top;padding:0 0 18px;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#0f172a;">${escapeHtml(step.title)}</p>
            <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">${escapeHtml(step.detail)}</p>
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${items}
    </table>
  `;
}

export function renderActionButtons(buttons: Array<{ label: string; href: string; primary?: boolean }>): string {
  const cells = buttons
    .map((button) => {
      const style = button.primary
        ? 'border-radius:12px;background:#14532d;'
        : 'border-radius:12px;background:#ffffff;border:1px solid #cbd5e1;';
      const textStyle = button.primary
        ? 'color:#ffffff;'
        : 'color:#0f172a;';
      return `
        <td style="padding-right:10px;">
          <a href="${button.href}" style="display:inline-block;padding:14px 20px;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:0.02em;${style}${textStyle}">
            ${escapeHtml(button.label)}
          </a>
        </td>
      `;
    })
    .join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>${cells}</tr>
    </table>
  `;
}

export function renderEmailFooter(
  note: string,
  options?: { unsubscribeUrl?: string | null }
): string {
  const unsubscribe = options?.unsubscribeUrl?.trim()
  return `
    <tr>
      <td style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">
          ${escapeHtml(note)}
        </p>
        ${
          unsubscribe
            ? `<p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#64748b;">
          Vous pouvez <a href="${escapeHtml(unsubscribe)}" style="color:#166534;font-weight:700;text-decoration:underline;">vous désabonner</a> à tout moment.
        </p>`
            : ''
        }
        <p style="margin:0;font-size:12px;line-height:1.6;color:#0f172a;">
          <strong>${escapeHtml(CSIRT_BRAND.fullName)}</strong> — ${escapeHtml(CSIRT_BRAND.parent)}<br />
          <a href="${CSIRT_BRAND.mailto}" style="color:#166534;text-decoration:none;font-weight:700;">${escapeHtml(CSIRT_BRAND.email)}</a>
          · ${escapeHtml(CSIRT_BRAND.hours)} · ${escapeHtml(CSIRT_BRAND.address)}
        </p>
      </td>
    </tr>
  `;
}

export function renderReferenceHero(reference: string, receivedAt: string, statusLabel: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);border:1px solid #dbe3ee;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:20px 22px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">
            Référence officielle
          </p>
          <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:0.06em;color:#14532d;">
            ${escapeHtml(reference)}
          </p>
          <p style="margin:10px 0 0;font-size:12px;color:#64748b;">
            Reçu le ${escapeHtml(receivedAt)}
          </p>
        </td>
        <td style="padding:20px 22px;text-align:right;vertical-align:middle;width:170px;">
          <span style="display:inline-block;padding:8px 12px;border-radius:10px;background:#ecfeff;border:1px solid #a5f3fc;color:#0e7490;font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
            ${escapeHtml(statusLabel)}
          </span>
        </td>
      </tr>
    </table>
  `;
}
