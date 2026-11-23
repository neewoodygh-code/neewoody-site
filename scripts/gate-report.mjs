// Weekly stage-gate report for Carpentry Concierge (owner 2026-11-23: "monitor these things").
// READ-ONLY: every query is a single SELECT run with `wrangler d1 execute concierge --remote`; the script refuses
// anything else. It changes nothing in the database. Shows the numbers against the boxes in MVP_GATES.md.
// Run: node scripts/gate-report.mjs   (needs Node 18+ and wrangler logged in, as scripts/check-live.mjs does)
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const now = new Date();
const ym = (d) => d.toISOString().slice(0, 7);
const THIS = ym(now), LAST = ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));

function q(sql) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (!/^SELECT\b/i.test(s) || /;|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA|ATTACH)\b/i.test(s) || s.includes('"'))
    throw new Error('refused: not a single read-only SELECT');
  const out = execSync(`npx wrangler d1 execute concierge --remote --json --command "${s}"`,
    { cwd: join(ROOT, 'concierge-api'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
}

// regular = approved, not a founder, not an admin: the members who owe GHS 50 a month
const REG = "status='approved' AND is_founder=0 AND role!='admin'";
const m = q(`SELECT
  (SELECT COUNT(*) FROM members) AS total,
  (SELECT COUNT(*) FROM members WHERE status='approved') AS approved,
  (SELECT COUNT(*) FROM members WHERE status='pending') AS pending,
  (SELECT COUNT(*) FROM members WHERE status='suspended') AS suspended,
  (SELECT COUNT(*) FROM members WHERE status='approved' AND is_founder=1) AS founders,
  (SELECT COUNT(*) FROM members WHERE ${REG}) AS regular,
  (SELECT COUNT(*) FROM members WHERE verified=1) AS verified,
  (SELECT COUNT(*) FROM members WHERE joined_at >= datetime('now','-30 days')) AS joined30,
  (SELECT COUNT(DISTINCT p.member_phone) FROM payments p JOIN members x ON x.phone=p.member_phone WHERE p.period='${THIS}' AND x.${REG.replace(/ AND /g, ' AND x.')}) AS paidThis,
  (SELECT COUNT(DISTINCT p.member_phone) FROM payments p JOIN members x ON x.phone=p.member_phone WHERE p.period='${LAST}' AND x.${REG.replace(/ AND /g, ' AND x.')}) AS paidLast,
  (SELECT COUNT(*) FROM payments a WHERE a.period='${LAST}' AND EXISTS (SELECT 1 FROM payments b WHERE b.member_phone=a.member_phone AND b.period='${THIS}')
     AND EXISTS (SELECT 1 FROM members x WHERE x.phone=a.member_phone AND x.is_founder=0 AND x.role!='admin')) AS renewed,
  (SELECT COUNT(*) FROM members WHERE status='approved' AND last_login >= datetime('now','-7 days')) AS active7,
  (SELECT COUNT(*) FROM members WHERE status='approved' AND last_login >= datetime('now','-30 days')) AS active30,
  (SELECT COUNT(*) FROM members WHERE status='approved' AND IFNULL(photo_url,'')!='' AND IFNULL(area,'')!=''
     AND (member_type!='carpenter' OR IFNULL(specialties,'[]')!='[]')) AS complete`)[0];

const a = q(`SELECT
  (SELECT COUNT(*) FROM jobs) AS jobs, (SELECT COUNT(*) FROM jobs WHERE created_at >= datetime('now','-30 days')) AS jobs30,
  (SELECT COUNT(*) FROM jobs WHERE status='filled') AS jobsFilled,
  (SELECT COUNT(*) FROM buy_requests) AS buys, (SELECT COUNT(*) FROM buy_requests WHERE created_at >= datetime('now','-30 days')) AS buys30,
  (SELECT COUNT(*) FROM buy_requests WHERE status='filled') AS buysFilled,
  (SELECT COUNT(*) FROM client_jobs) AS clientJobs, (SELECT COUNT(*) FROM client_jobs WHERE status IN ('approved','filled')) AS clientJobsLive,
  (SELECT COUNT(*) FROM client_jobs WHERE status='filled') AS clientJobsFilled,
  (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM orders WHERE status='fulfilled') AS ordersDone,
  (SELECT COUNT(*) FROM callouts) AS callouts, (SELECT COUNT(*) FROM callouts WHERE created_at >= datetime('now','-30 days')) AS callouts30`)[0];

const t = q(`SELECT
  (SELECT COUNT(*) FROM saved_cutlists) AS cutlists, (SELECT COUNT(DISTINCT member_phone) FROM saved_cutlists) AS cutlistMembers,
  (SELECT COUNT(*) FROM saved_cutlists WHERE updated_at >= datetime('now','-30 days')) AS cutlists30,
  (SELECT COUNT(*) FROM cutsheet_data) AS cutsheetMembers,
  (SELECT IFNULL(SUM(json_array_length(json_extract(data,'$.list'))),0) FROM cutsheet_data) AS cutsheetProjects,
  (SELECT COUNT(*) FROM cutsheet_data WHERE updated_at >= datetime('now','-30 days')) AS cutsheet30,
  (SELECT COUNT(*) FROM pricing_configs WHERE IFNULL(quotes,'')!='' AND quotes!='[]') AS pricingMembers,
  (SELECT IFNULL(SUM(json_array_length(quotes)),0) FROM pricing_configs WHERE json_valid(quotes)) AS quotes,
  (SELECT COUNT(*) FROM invoice_data) AS invoiceMembers,
  (SELECT IFNULL(SUM(json_array_length(json_extract(data,'$.list'))),0) FROM invoice_data) AS invoices,
  (SELECT COUNT(*) FROM invoice_data WHERE updated_at >= datetime('now','-30 days')) AS invoice30`)[0];

const tabs = q(`SELECT json_extract(meta,'$.tab') AS tab, COUNT(*) AS n FROM usage_events WHERE name='tab' AND created_at >= datetime('now','-30 days') GROUP BY tab ORDER BY n DESC LIMIT 10`);

const pct = (x, y) => (y ? Math.round(100 * x / y) + '%' : 'n/a');
const box = (on) => (on ? '[x]' : '[ ]');
const L = [];
L.push(`CARPENTRY CONCIERGE: STAGE-GATE REPORT  ${now.toISOString().slice(0, 10)}  (read-only, months ${LAST} and ${THIS})`, '');
L.push('MEMBERS');
L.push(`  ${m.total} in total: ${m.approved} approved (${m.founders} founders, ${m.regular} regular), ${m.pending} pending (unpaid sign-ups), ${m.suspended} suspended`);
L.push(`  ${m.joined30} joined in the last 30 days; ${m.verified} carry the Verified mark; founding places left: ${Math.max(0, 100 - m.founders)} of 100`);
L.push(`  Regular members paid for ${THIS}: ${m.paidThis} of ${m.regular} (${pct(m.paidThis, m.regular)}); paid for ${LAST}: ${m.paidLast}`);
L.push(`  Renewed from ${LAST} into ${THIS}: ${m.renewed} of ${m.paidLast} (${pct(m.renewed, m.paidLast)})${now.getUTCDate() < 10 ? '  (early in the month, so this will rise)' : ''}`);
L.push(`  Logged in during the last 7 days: ${m.active7}; last 30 days: ${m.active30} (of ${m.approved} approved)`);
L.push(`  Complete profiles (photo, area, trades): ${m.complete} of ${m.approved} (${pct(m.complete, m.approved)})`, '');
L.push('MARKETPLACE (all time / last 30 days / marked filled or done)');
L.push(`  Day-work jobs posted: ${a.jobs} / ${a.jobs30} / ${a.jobsFilled}`);
L.push(`  Buy-for-me requests: ${a.buys} / ${a.buys30} / ${a.buysFilled}`);
L.push(`  Client jobs from Hire a Carpenter: ${a.clientJobs} received, ${a.clientJobsLive} approved, ${a.clientJobsFilled} filled`);
L.push(`  Storefront orders: ${a.orders}, ${a.ordersDone} fulfilled;  safety call-outs: ${a.callouts} (${a.callouts30} in 30 days)`, '');
L.push('TOOLS (saved to accounts; use without saving is not counted yet)');
L.push(`  Cutlists: ${t.cutlists} saved by ${t.cutlistMembers} members (${t.cutlists30} changed in 30 days)`);
L.push(`  Cut Sheet: ${t.cutsheetProjects} projects across ${t.cutsheetMembers} members (${t.cutsheet30} accounts changed in 30 days)`);
L.push(`  Job Pricing: ${t.quotes} quotes across ${t.pricingMembers} members`);
L.push(`  Invoices: ${t.invoices} documents across ${t.invoiceMembers} members (${t.invoice30} accounts changed in 30 days)`, '');
L.push('MOST-OPENED MEMBER-AREA TABS, LAST 30 DAYS');
L.push('  ' + (tabs.length ? tabs.map((r) => `${r.tab} ${r.n}`).join(' · ') : 'none recorded'), '');
L.push('GATE 1  signal of life');
L.push(`  ${box(m.regular + m.founders >= 15)} 15-20 paying members (${m.founders + m.paidThis} paid up this month)`);
L.push(`  ${box(a.jobs + a.buys >= 5)} a handful of real job and buy-for-me posts (${a.jobs + a.buys} in total)`);
L.push(`  [ ] at least one documented real outcome (${a.jobsFilled + a.buysFilled + a.clientJobsFilled} posts marked filled: ask the members behind them)`);
L.push(`  ${box(m.complete / Math.max(1, m.approved) >= 0.5)} most profiles complete (${pct(m.complete, m.approved)})`);
L.push('GATE 2  MVP validated');
L.push(`  ${box(m.paidLast >= 10 && m.renewed / m.paidLast >= 0.5)} 50-60% monthly renewal (${m.renewed} of ${m.paidLast}${m.paidLast < 10 ? ': too few regular members yet to judge' : ''})`);
L.push(`  [ ] a stable core of weekly-active members (${m.active7} this week: watch the trend)`);
L.push(`  ${box(m.renewed > 0)} non-founder GHS 50 payers who renew (${m.renewed})`);
L.push('  [ ] connection events trending up (needs contact-click counting, not built)');
L.push('  [ ] carpenter vetting defined and running (to decide)');
console.log(L.join('\n'));
