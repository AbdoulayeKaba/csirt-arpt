const fs = require('fs')
const path = 'components/admin/site/site-admin.css'
let s = fs.readFileSync(path, 'utf8')
const marker = '/* Workspace page (création / édition plein écran) */'
const idx = s.indexOf(marker)
if (idx < 0) {
  console.error('workspace marker missing')
  process.exit(1)
}

const pagesCss = `/* Pages du site public — dashboard + liste */
.site-pages-pro {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  width: 100%;
  overflow-x: clip;
}

.site-pages-dashboard {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
}

.site-pages-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}

@media (max-width: 379px) {
  .site-pages-kpi-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (min-width: 900px) {
  .site-pages-kpi-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.site-pages-kpi {
  --kpi-accent: #1f6b42;
  --kpi-soft: color-mix(in oklch, #1f6b42 12%, #fff);
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 0.12rem;
  align-content: start;
  padding: 0.55rem 0.65rem 0.55rem 0.7rem;
  border-radius: 0.7rem;
  border: 1px solid color-mix(in oklch, var(--kpi-accent) 16%, var(--admin-border, #d7e4db));
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in oklch, var(--kpi-accent) 10%, transparent), transparent 55%),
    linear-gradient(160deg, #ffffff 0%, var(--kpi-soft) 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85) inset,
    0 8px 18px -18px rgba(18, 48, 30, 0.45);
  min-width: 0;
}

.site-pages-kpi::before {
  content: '';
  position: absolute;
  inset: 0.45rem auto 0.45rem 0;
  width: 3px;
  border-radius: 999px;
  background: var(--kpi-accent);
}

.site-pages-kpi.is-ok {
  --kpi-accent: #0f766e;
  --kpi-soft: color-mix(in oklch, #0f766e 11%, #fff);
}

.site-pages-kpi.is-muted {
  --kpi-accent: #ea580c;
  --kpi-soft: color-mix(in oklch, #ea580c 9%, #fff);
}

.site-pages-kpi.is-docs {
  --kpi-accent: #1d4ed8;
  --kpi-soft: color-mix(in oklch, #1d4ed8 10%, #fff);
}

.site-pages-kpi__top {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding-left: 0.2rem;
}

.site-pages-kpi__icon {
  display: inline-grid;
  place-items: center;
  width: 1.45rem;
  height: 1.45rem;
  flex-shrink: 0;
  border-radius: 0.4rem;
  background: color-mix(in oklch, var(--kpi-accent) 12%, #fff);
  color: var(--kpi-accent);
  border: 1px solid color-mix(in oklch, var(--kpi-accent) 18%, transparent);
}

.site-pages-kpi__top > span:last-child {
  font-size: 0.58rem;
  font-weight: 750;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--kpi-accent) 55%, #64748b);
}

.site-pages-kpi strong {
  padding-left: 0.2rem;
  font-size: 1.35rem;
  line-height: 1.05;
  font-weight: 850;
  color: var(--admin-foreground, #12301e);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.site-pages-kpi em {
  padding-left: 0.2rem;
  font-style: normal;
  font-size: 0.6rem;
  color: var(--muted-foreground);
  line-height: 1.25;
}

.site-pages-kpi__meter {
  margin-top: 0.28rem;
  margin-left: 0.2rem;
  height: 0.28rem;
  border-radius: 999px;
  background: color-mix(in oklch, var(--kpi-accent) 10%, #e8eee9);
  overflow: hidden;
}

.site-pages-kpi__meter > i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--kpi-accent), color-mix(in oklch, var(--kpi-accent) 55%, #fff));
}

.site-pages-analytics {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

@media (min-width: 980px) {
  .site-pages-analytics--pro {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    align-items: stretch;
  }
}

.site-pages-pro-card {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.4rem;
  min-width: 0;
  padding: 0.5rem 0.6rem 0.5rem;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in oklch, var(--admin-border, #d7e4db) 88%, transparent);
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, var(--admin-primary, #1f6b42) 8%, transparent), transparent 55%),
    linear-gradient(165deg, #ffffff 0%, #f7fbf8 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 10px 22px -22px rgba(18, 48, 30, 0.4);
}

.site-pages-pro-card--richness {
  background:
    radial-gradient(120% 90% at 0% 0%, color-mix(in oklch, #1d4ed8 9%, transparent), transparent 50%),
    radial-gradient(90% 70% at 100% 100%, color-mix(in oklch, #7c3aed 7%, transparent), transparent 45%),
    linear-gradient(165deg, #ffffff 0%, #f8fafc 100%);
}

.site-pages-pro-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  min-width: 0;
}

.site-pages-pro-card__eyebrow {
  margin: 0;
  font-size: 0.52rem;
  font-weight: 750;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--admin-primary, #1f6b42) 75%, #64748b);
  line-height: 1.1;
}

.site-pages-pro-card--richness .site-pages-pro-card__eyebrow {
  color: color-mix(in oklch, #1d4ed8 70%, #64748b);
}

.site-pages-pro-card__head h3 {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: var(--admin-foreground, #12301e);
  line-height: 1.15;
}

.site-pages-pro-card__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 1.15rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--admin-primary, #1f6b42) 18%, transparent);
  background: color-mix(in oklch, var(--admin-primary, #1f6b42) 10%, #fff);
  color: var(--admin-primary, #1f6b42);
  font-size: 0.58rem;
  font-weight: 750;
}

.site-pages-pro-card__badge.is-accent {
  border-color: color-mix(in oklch, #1d4ed8 22%, transparent);
  background: color-mix(in oklch, #1d4ed8 10%, #fff);
  color: #1d4ed8;
}

.site-pages-pro-status {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.55rem 0.7rem;
  align-items: center;
}

@media (max-width: 560px) {
  .site-pages-pro-status {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
  }
}

.site-pages-pro-ring {
  --rate: 0;
  position: relative;
  width: 5.5rem;
  height: 5.5rem;
  flex-shrink: 0;
}

.site-pages-pro-ring__meter {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(#0f766e calc(var(--rate) * 1%), #e7efea 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 0.55rem), #000 calc(100% - 0.54rem));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 0.55rem), #000 calc(100% - 0.54rem));
}

.site-pages-pro-ring__core {
  position: absolute;
  inset: 0.55rem;
  display: grid;
  place-content: center;
  text-align: center;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 1px color-mix(in oklch, #0f766e 10%, transparent);
}

.site-pages-pro-ring__core strong {
  font-size: 1rem;
  font-weight: 850;
  letter-spacing: -0.03em;
  line-height: 1;
  color: #0f766e;
}

.site-pages-pro-ring__core span {
  margin-top: 0.1rem;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.site-pages-pro-tracks {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
}

.site-pages-pro-track__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
  margin-bottom: 0.18rem;
  font-size: 0.66rem;
  color: var(--admin-foreground, #12301e);
}

.site-pages-pro-track__meta > span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 700;
}

.site-pages-pro-track__meta i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
}

.site-pages-pro-track__meta b {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}

.site-pages-pro-track__meta em {
  font-style: normal;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--muted-foreground);
}

.site-pages-pro-track__rail {
  height: 0.4rem;
  border-radius: 999px;
  background: #e8f0eb;
  overflow: hidden;
}

.site-pages-pro-track__rail > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  min-width: 0;
  transition: width 0.45s ease;
}

.site-pages-pro-columns {
  display: grid;
  gap: 0;
  min-width: 0;
}

.site-pages-pro-columns__chart {
  width: 100%;
  height: 7.25rem;
  min-width: 0;
}

.site-pages-chart-empty {
  display: grid;
  place-items: center;
  min-height: 5rem;
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted-foreground);
}

.site-pages-pro .site-card {
  border-radius: 0.75rem;
  border-color: var(--admin-border, #d7e4db);
  box-shadow: 0 8px 24px -22px rgba(18, 48, 30, 0.4);
  min-width: 0;
}

.site-pages-pro .site-card-head {
  padding: 0.65rem 0.85rem 0.55rem;
}

.site-pages-pro .site-card-head h2 {
  font-size: 0.9rem;
}

.site-pages-pro .site-card-body {
  padding: 0 0.85rem 0.85rem;
}

.site-pages-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.55rem;
}

.site-pages-table-shell {
  border: 1px solid var(--admin-border, #edf3ef);
  border-radius: 0.65rem;
  overflow: auto;
  background: #fff;
  -webkit-overflow-scrolling: touch;
}

.site-pages-table-shell .admin-table {
  min-width: 44rem;
  width: 100%;
}

.site-pages-table-shell .admin-table-head th {
  background: color-mix(in oklch, var(--admin-hero-bg, #e3f8e9) 55%, #fff);
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  font-size: 0.7rem;
}

.site-pages-table-shell .admin-table-row td {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  vertical-align: middle;
}

.site-pages-col-num {
  width: 2.75rem;
  text-align: center;
  white-space: nowrap;
}

.site-pages-table-shell .admin-table-head th.site-pages-col-num {
  text-align: center;
}

.site-pages-row-num {
  display: inline-grid;
  place-items: center;
  min-width: 1.55rem;
  height: 1.55rem;
  padding: 0 0.3rem;
  border-radius: 0.35rem;
  background: color-mix(in oklch, var(--admin-hero-bg, #e3f8e9) 70%, #fff);
  color: var(--admin-primary, #1f6b42);
  font-size: 0.68rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.site-pages-table-shell .admin-table-row.is-disabled {
  opacity: 0.72;
}

.site-pages-title {
  display: grid;
  gap: 0.12rem;
  max-width: 22rem;
}

.site-pages-title strong {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: var(--admin-foreground, #12301e);
}

.site-pages-title span {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.68rem;
  color: var(--muted-foreground);
  font-weight: 500;
}

.site-pages-doc-badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.1rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 0.58rem;
  font-weight: 750;
}

.site-pages-path {
  font-size: 0.7rem;
  color: #475569;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.35rem;
  padding: 0.15rem 0.4rem;
}

.site-pages-footer {
  margin-top: 0.45rem;
  font-size: 0.68rem;
  color: var(--muted-foreground);
}

.site-pages-empty-cell {
  text-align: center;
  color: var(--muted-foreground);
  padding: 1.25rem 0.85rem !important;
}

@media (max-width: 899px) {
  .site-pages-table-shell {
    border: 0;
    border-radius: 0;
    overflow: visible;
    background: transparent;
  }

  .site-pages-table-shell .admin-table {
    min-width: 0;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .site-pages-table-shell .admin-table-head {
    display: none;
  }

  .site-pages-table-shell tbody {
    display: grid;
    gap: 0.5rem;
  }

  .site-pages-table-shell .admin-table-row {
    display: grid;
    gap: 0.45rem;
    padding: 0.7rem 0.75rem;
    border: 1px solid var(--admin-border, #d7e4db);
    border-radius: 0.7rem;
    background: #fff;
    box-shadow: 0 4px 14px -16px rgba(18, 48, 30, 0.35);
  }

  .site-pages-table-shell .admin-table-row td {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    gap: 0.45rem;
    align-items: center;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
  }

  .site-pages-table-shell .admin-table-row td::before {
    content: attr(data-label);
    font-size: 0.6rem;
    font-weight: 750;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }

  .site-pages-table-shell .admin-table-row td.site-pages-col-num {
    grid-template-columns: auto 1fr;
    order: -1;
  }

  .site-pages-table-shell .admin-table-row td.site-pages-col-num::before,
  .site-pages-table-shell .admin-table-row td.site-pages-col-page::before,
  .site-pages-table-shell .admin-table-row td.admin-users-actions-col::before {
    display: none;
  }

  .site-pages-table-shell .admin-table-row td.site-pages-col-page {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 0.35rem !important;
    margin-bottom: 0.15rem;
    border-bottom: 1px solid color-mix(in oklch, var(--admin-border, #d7e4db) 70%, transparent) !important;
  }

  .site-pages-table-shell .admin-table-row td.admin-users-actions-col {
    grid-template-columns: minmax(0, 1fr);
  }

  .site-pages-table-shell .admin-user-row-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .site-pages-title {
    max-width: none;
  }
}

`

s = s.slice(0, idx) + pagesCss + marker + '\n' + s.slice(idx + marker.length).replace(/^\n/, '')
fs.writeFileSync(path, s)
console.log(JSON.stringify({
  ok: true,
  hasKpi: s.includes('.site-pages-kpi-grid'),
  hasPro: s.includes('.site-pages-pro-card'),
  hasTable: s.includes('.site-pages-table-shell'),
  len: s.length,
}))
