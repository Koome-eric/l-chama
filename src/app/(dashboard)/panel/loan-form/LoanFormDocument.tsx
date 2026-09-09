import Link from 'next/link';
import { PrintButton } from './PrintButton';

export interface LoanFormData {
  chamaName: string;
  requesterName?: string;
  requesterEmail?: string;
  amount?: number;
  purpose?: string;
  months?: number;
  interestRate?: number;
  processingFee?: number;
  repaymentWeeks?: number;
  totalRepayable?: number;
  date?: string;
  guarantors?: { name: string; signatureName: string; signedAt: string }[];
}

function formatKES(n?: number) {
  if (n === undefined || n === null) return '________________';
  return `KES ${n.toLocaleString()}`;
}

// One printable page: fill in known fields (or leave blank lines for a
// hand-completed physical copy), with fixed formula terms and two
// guarantor signature blocks at the bottom — matches the digital
// guarantor e-signature flow so both versions carry the same terms.
export function LoanFormDocument({ data, blank = false }: { data: LoanFormData; blank?: boolean }) {
  const line = (value?: string | number | null) =>
    value !== undefined && value !== null && value !== '' ? String(value) : '_______________________';

  return (
    <div className="loan-form-print mx-auto max-w-2xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/panel" className="text-sm text-primary underline">← Back to Dashboard</Link>
        <PrintButton />
      </div>

      <div className="border border-black p-6 text-sm leading-relaxed">
        <h1 className="text-center text-lg font-bold uppercase mb-1">L-CHAMA Loan Application &amp; Guarantee Form</h1>
        <p className="text-center text-xs mb-4">Chama: {line(data.chamaName)} &nbsp;·&nbsp; Date: {line(data.date || new Date().toLocaleDateString())}</p>

        <hr className="my-3 border-black" />

        <h2 className="font-semibold mb-2">1. Applicant Details</h2>
        <table className="w-full text-sm mb-3">
          <tbody>
            <tr><td className="py-1 pr-2 font-medium w-40">Full Name:</td><td>{line(data.requesterName)}</td></tr>
            <tr><td className="py-1 pr-2 font-medium">Email/Phone:</td><td>{line(data.requesterEmail)}</td></tr>
            <tr><td className="py-1 pr-2 font-medium">Loan Amount:</td><td>{blank ? '_______________________' : formatKES(data.amount)}</td></tr>
            <tr><td className="py-1 pr-2 font-medium">Purpose:</td><td>{line(data.purpose)}</td></tr>
            <tr><td className="py-1 pr-2 font-medium">Term (months, max 6):</td><td>{line(data.months)}</td></tr>
          </tbody>
        </table>

        <h2 className="font-semibold mb-2">2. Loan Terms (fixed chama formula)</h2>
        <table className="w-full text-sm mb-3">
          <tbody>
            <tr><td className="py-1 pr-2 w-64">Interest rate (2.5% per month × term)</td><td>{blank ? '____%' : `${data.interestRate ?? ''}%`}</td></tr>
            <tr><td className="py-1 pr-2">Processing fee (2.5% of loan amount, paid upfront)</td><td>{blank ? '_______________________' : formatKES(data.processingFee)}</td></tr>
            <tr><td className="py-1 pr-2">Repayment period (weekly)</td><td>{blank ? '____ weeks' : `${data.repaymentWeeks ?? ''} weeks`}</td></tr>
            <tr><td className="py-1 pr-2">Total repayable (principal + interest)</td><td className="font-semibold">{blank ? '_______________________' : formatKES(data.totalRepayable)}</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-700 mb-3">
          The processing fee is payable upfront, before disbursement. The total repayable amount is
          spread evenly across the weekly schedule below.
        </p>

        <h2 className="font-semibold mb-2">3. Applicant Declaration</h2>
        <p className="text-xs mb-4">
          I confirm the information above is accurate and I agree to repay this loan in full,
          according to the weekly schedule, plus the stated interest and processing fee.
        </p>
        <div className="flex justify-between mb-6">
          <div className="w-1/2">
            <p className="border-b border-black h-8"></p>
            <p className="text-xs mt-1">Applicant Signature</p>
          </div>
          <div className="w-1/3">
            <p className="border-b border-black h-8"></p>
            <p className="text-xs mt-1">Date</p>
          </div>
        </div>

        <h2 className="font-semibold mb-2">4. Guarantor Confirmation (2 required)</h2>
        <p className="text-xs mb-3">
          As guarantor, I confirm I understand I am personally liable for this loan if the borrower
          defaults, up to the amount guaranteed, and I agree to guarantee it.
        </p>

        {[0, 1].map((i) => {
          const g = data.guarantors?.[i];
          return (
            <div key={i} className="mb-4 border-t border-dashed border-black pt-3">
              <p className="text-xs font-medium mb-2">Guarantor {i + 1}</p>
              <table className="w-full text-sm mb-2">
                <tbody>
                  <tr><td className="py-1 pr-2 w-40">Full Name:</td><td>{g ? g.name : '_______________________'}</td></tr>
                </tbody>
              </table>
              <div className="flex justify-between">
                <div className="w-1/2">
                  <p className="border-b border-black h-8 italic text-sm pt-1">{g ? `"${g.signatureName}"` : ''}</p>
                  <p className="text-xs mt-1">Guarantor Signature</p>
                </div>
                <div className="w-1/3">
                  <p className="border-b border-black h-8 text-sm pt-1">{g ? new Date(g.signedAt).toLocaleDateString() : ''}</p>
                  <p className="text-xs mt-1">Date</p>
                </div>
              </div>
            </div>
          );
        })}

        <h2 className="font-semibold mb-2 mt-4">5. Approved By (Team Leader / Admin)</h2>
        <div className="flex justify-between">
          <div className="w-1/2">
            <p className="border-b border-black h-8"></p>
            <p className="text-xs mt-1">Signature</p>
          </div>
          <div className="w-1/3">
            <p className="border-b border-black h-8"></p>
            <p className="text-xs mt-1">Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
