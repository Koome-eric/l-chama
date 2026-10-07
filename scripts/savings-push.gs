/**
 * L-Chama Savings Account — Google Sheets → database push script.
 *
 * Pairs with LChama_Savings_Data.xlsx. Reads unpushed rows from the
 * "Savings Data" tab and posts them to the app's /api/savings/sync
 * webhook. Plain running balance — no interest: opening + deposit -
 * payout = closing.
 *
 * A row is matched to an account by Member Email first; if that doesn't
 * resolve to a user (e.g. the member signed up by phone only), Phone
 * Number is used as a fallback identifier.
 *
 * SETUP
 * 1. Extensions > Apps Script, paste this in as Code.gs.
 * 2. Project Settings (gear icon) > Script Properties, add:
 *      SAVINGS_API_URL = https://www.ludevaplc.co.ke/api/savings/sync
 *      SAVINGS_API_KEY = <same value as SAVINGS_SYNC_SECRET in the app's env>
 * 3. Run pushSavingsRows() once manually to authorize it.
 * 4. Triggers (clock icon) > Add Trigger > pushSavingsRows, time-driven,
 *    e.g. every hour — so new rows sync automatically.
 *
 * DUPLICATE FIX (v2) — why rows used to be pushed twice, and what changed:
 *   - The old script pushed one row per HTTP call and only marked the row
 *     "✅ Pushed" AFTER the server answered. With a few hundred rows that
 *     can exceed Apps Script's 6-minute limit, or an hourly trigger can
 *     start while the previous run is still going: the server had already
 *     saved the rows, but the sheet never said so, so the next run pushed
 *     them again.
 *   - Fix 1: a script lock — only one run at a time; an overlapping run
 *     exits immediately.
 *   - Fix 2: rows are sent in batches of 50 and their status cells are
 *     written right after each batch, not per row at the very end.
 *   - Fix 3 (server): /api/savings/sync now updates an existing entry
 *     (same member + account no. + date + period label) instead of
 *     inserting a new one, so even a repeated push can no longer create
 *     a duplicate. "Failed" rows can safely be retried.
 */
const BATCH_SIZE = 50;

function pushSavingsRows() {
  // Only one run at a time. If a previous (slow) run is still going, skip.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) {
    console.log('Another run is still in progress — skipping this one.');
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Savings Data');
    const logSheet = ss.getSheetByName('Push Log');
    const props = PropertiesService.getScriptProperties();
    const apiUrl = props.getProperty('SAVINGS_API_URL');
    const apiKey = props.getProperty('SAVINGS_API_KEY');

    if (!apiUrl) throw new Error('SAVINGS_API_URL is missing from Script Properties.');
    if (!apiKey) throw new Error('SAVINGS_API_KEY is missing from Script Properties.');

    const data = sheet.getDataRange().getValues();
    const headers = data[3]; // row 4
    const rows = data.slice(5); // row 6 onward (row 5 is the worked example)

    const col = (name) => headers.indexOf(name);
    const emailCol = col('Member Email');
    const phoneCol = col('Phone Number');
    const statusCol = col('Push Status');
    const pushedAtCol = col('Pushed At');

    // Collect rows still to push, remembering their sheet row number.
    const pending = [];
    rows.forEach((row, i) => {
      if (!row[emailCol] && !row[phoneCol]) return; // blank row — no identifier at all
      if (row[statusCol] === '✅ Pushed') return;
      pending.push({
        rowIndex: i + 6,
        payload: {
          memberEmail: row[emailCol],
          memberPhone: row[phoneCol],
          accountNo: row[col('Account No.')],
          memberName: row[col('Member Name')],
          date: formatCell(row[col('Date')]),
          openingBalance: row[col('Opening Balance')],
          deposit: row[col('Deposit')],
          payout: row[col('Payout')],
          closingBalance: row[col('Closing Balance')],
          periodLabel: row[col('Period Label')],
          notes: row[col('Notes')],
        },
      });
    });

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      let ok = false;
      let detail = '';

      try {
        const response = UrlFetchApp.fetch(apiUrl, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-sync-secret': apiKey },
          payload: JSON.stringify({ records: batch.map((b) => b.payload) }),
          muteHttpExceptions: true,
        });
        const code = response.getResponseCode();
        ok = code >= 200 && code < 300;
        detail = ok ? response.getContentText() : 'HTTP ' + code + ' ' + response.getContentText();
      } catch (err) {
        detail = 'Network error: ' + err.message;
      }

      // Write the status of this batch immediately.
      const now = new Date();
      batch.forEach((b) => {
        sheet.getRange(b.rowIndex, statusCol + 1).setValue(ok ? '✅ Pushed' : '❌ Failed');
        if (ok) sheet.getRange(b.rowIndex, pushedAtCol + 1).setValue(now);
      });
      logSheet.appendRow([
        now,
        batch.length + ' row(s): ' + batch[0].payload.memberEmail + ' …',
        ok ? '✅ Success' : '❌ Failed',
        detail,
      ]);
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }
}

// Dates come back from Sheets as JS Date objects — send a clean YYYY-MM-DD.
function formatCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value;
}
