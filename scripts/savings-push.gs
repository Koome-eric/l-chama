/**
 * Savings Account — Excel/Sheets → database push script.
 *
 * Same pattern as the existing Investments/MemberReport push script:
 * reads unpushed rows from a "Savings Data" sheet tab in the same
 * workbook Ludeva already uses, and posts them to the app's
 * /api/savings/sync webhook, using a running-balance formula instead
 * of the per-transaction MMF formula Investments uses.
 *
 * SETUP
 * 1. In the workbook, add a "Savings Data" tab with a header row (row 4,
 *    matching the existing sheet's convention of a couple of instruction
 *    rows above the header) containing at least:
 *      memberEmail, accountNo, memberName, date, openingBalance, deposit,
 *      withdrawal, monthlyRate, interestEarned, closingBalance,
 *      periodLabel, notes, _pushStatus, _pushedAt
 * 2. Add a "Push Log" tab for the success/failure log.
 * 3. File > Project properties > Script properties, set:
 *      SAVINGS_API_URL   = https://<your-app-domain>/api/savings/sync
 *      SAVINGS_API_KEY   = <same value as the app's SAVINGS_SYNC_SECRET env var>
 * 4. Run pushSavingsRows() manually, or wrap it in a time-driven trigger
 *    (Triggers > Add Trigger) to sync automatically.
 */
function pushSavingsRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Savings Data');
  const logSheet = ss.getSheetByName('Push Log');
  const apiUrl = PropertiesService.getScriptProperties().getProperty('SAVINGS_API_URL');
  const apiKey = PropertiesService.getScriptProperties().getProperty('SAVINGS_API_KEY');

  const data = sheet.getDataRange().getValues();
  const headers = data[3]; // header row
  const rows = data.slice(5); // skip header + instructions

  const statusCol = headers.indexOf('_pushStatus');
  const pushedAtCol = headers.indexOf('_pushedAt');

  rows.forEach((row, i) => {
    const rowIndex = i + 6;
    if (row[statusCol] === '✅ Pushed') return;

    const payload = {
      memberEmail: row[headers.indexOf('memberEmail')],
      accountNo: row[headers.indexOf('accountNo')],
      memberName: row[headers.indexOf('memberName')],
      date: row[headers.indexOf('date')],
      openingBalance: row[headers.indexOf('openingBalance')],
      deposit: row[headers.indexOf('deposit')],
      withdrawal: row[headers.indexOf('withdrawal')],
      monthlyRate: row[headers.indexOf('monthlyRate')],
      interestEarned: row[headers.indexOf('interestEarned')],
      closingBalance: row[headers.indexOf('closingBalance')],
      periodLabel: row[headers.indexOf('periodLabel')],
      notes: row[headers.indexOf('notes')],
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-sync-secret': apiKey },
        payload: JSON.stringify({ records: [payload] }),
        muteHttpExceptions: true,
      });

      sheet.getRange(rowIndex, statusCol + 1).setValue('✅ Pushed');
      sheet.getRange(rowIndex, pushedAtCol + 1).setValue(new Date());
      logSheet.appendRow([new Date(), payload.memberEmail, '✅ Success', response.getContentText()]);
    } catch (err) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('❌ Failed');
      logSheet.appendRow([new Date(), payload.memberEmail, '❌ Network error', err.message]);
    }
  });
}
