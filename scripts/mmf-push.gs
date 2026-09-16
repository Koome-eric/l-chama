/**
 * Ludeva Investment (MMF) Account — Excel/Sheets → database push script.
 *
 * Reads unpushed rows from the "Member Data" tab and posts them to the
 * app's /api/member-reports/sync webhook, where they land in the
 * MemberReport table and show up on the member's Investment Account
 * page and the chama-wide performance reports.
 *
 * NOTE: this file wasn't part of the files handed over for this change —
 * the .gs bound to the live "Ludeva Investment Performance" sheet wasn't
 * included, only the workbook and the /api/member-reports/sync route it
 * posts to. This is written to match that route's contract exactly (see
 * the comment at the top of route.ts) and the "Member Data" tab's actual
 * columns. If a different script is already bound to the live sheet,
 * diff it against this one rather than assuming this is a drop-in
 * replacement — in particular, check whether it already reports success
 * back in a `{"processed":...,"results":[...]}` shape (an entry in the
 * sheet's Push Log suggests it might), which this version does not.
 *
 * SETUP
 * 1. In the workbook, the "Member Data" tab's header row (row 4) should
 *    contain at least:
 *      memberEmail, accountNo, memberName, date, principal, rate, roi,
 *      withholdingTax, withdrawal, closingBal, quarter, periodLabel,
 *      notes, memberPhone, _pushStatus, _pushedAt
 *
 *    memberPhone is a second identifier: the app matches a row to a
 *    member by email first, and falls back to phone if the email on the
 *    row doesn't resolve to an account (e.g. a phone-only sign-up).
 *    accountNo, withholdingTax and quarter are kept on the sheet for
 *    reference but are not part of what gets pushed — the MemberReport
 *    table this writes to doesn't have columns for them.
 * 2. Add a "Push Log" tab for the success/failure log.
 * 3. File > Project properties > Script properties, set:
 *      MEMBER_REPORTS_API_URL = https://<your-app-domain>/api/member-reports/sync
 *      MEMBER_REPORTS_API_KEY = <same value as the app's MEMBER_REPORTS_SYNC_SECRET env var>
 * 4. Run pushMemberReportRows() manually, or wrap it in a time-driven
 *    trigger (Triggers > Add Trigger) to sync automatically.
 */
function pushMemberReportRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Member Data');
  const logSheet = ss.getSheetByName('Push Log');
  const apiUrl = PropertiesService.getScriptProperties().getProperty('MEMBER_REPORTS_API_URL');
  const apiKey = PropertiesService.getScriptProperties().getProperty('MEMBER_REPORTS_API_KEY');

  const data = sheet.getDataRange().getValues();
  const headers = data[3]; // header row
  const rows = data.slice(5); // skip header + instructions row

  const statusCol = headers.indexOf('_pushStatus');
  const pushedAtCol = headers.indexOf('_pushedAt');

  rows.forEach((row, i) => {
    const rowIndex = i + 6;
    if (row[statusCol] === '✅ Pushed') return;
    if (!row[headers.indexOf('memberEmail')] && !row[headers.indexOf('memberPhone')]) return;

    const payload = {
      email: row[headers.indexOf('memberEmail')],
      phone: row[headers.indexOf('memberPhone')],
      name: row[headers.indexOf('memberName')],
      date: row[headers.indexOf('date')],
      principal: row[headers.indexOf('principal')],
      rate: row[headers.indexOf('rate')],
      roi: row[headers.indexOf('roi')],
      withdrawal: row[headers.indexOf('withdrawal')],
      closingBalance: row[headers.indexOf('closingBal')],
      period: row[headers.indexOf('periodLabel')],
      notes: row[headers.indexOf('notes')],
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-sync-secret': apiKey },
        payload: JSON.stringify({ rows: [payload] }),
        muteHttpExceptions: true,
      });

      sheet.getRange(rowIndex, statusCol + 1).setValue('✅ Pushed');
      sheet.getRange(rowIndex, pushedAtCol + 1).setValue(new Date());
      logSheet.appendRow([new Date(), payload.email || payload.phone, '✅ Success', response.getContentText()]);
    } catch (err) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('❌ Failed');
      logSheet.appendRow([new Date(), payload.email || payload.phone, '❌ Network error', err.message]);
    }
  });
}
