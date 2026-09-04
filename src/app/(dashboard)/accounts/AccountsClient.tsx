'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, PiggyBank, Baby, Smartphone, CreditCard } from 'lucide-react';
import { formatKES } from '@/lib/chama-levels';
import { CountUp } from '@/components/motion/CountUp';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { JuniorApplicationDialog } from '@/components/payments/JuniorApplicationDialog';

type ProductType = 'STOCK' | 'SAVINGS' | 'JUNIOR';

type Product = {
  id: string;
  name: string;
  type: ProductType;
  description: string | null;
  roi: number;
  roiMax: number | null;
  minAmount: number;
  maxAmount: number | null;
};

type Account = {
  id: string;
  productId: string;
  productType: ProductType;
  balance: number;
  status: 'ACTIVE' | 'CLOSED';
};

type PaymentRow = {
  id: string;
  productName: string;
  channel: 'MPESA' | 'VISA_CARD';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  createdAt: string;
};

type JuniorApp = {
  id: string;
  childFullName: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  createdAt: string;
};

const PRODUCT_ICON: Record<ProductType, typeof TrendingUp> = {
  STOCK: TrendingUp,
  SAVINGS: PiggyBank,
  JUNIOR: Baby,
};

const PRODUCT_TONE: Record<ProductType, string> = {
  STOCK: 'bg-gold/15 text-gold',
  SAVINGS: 'bg-primary/10 text-primary',
  JUNIOR: 'bg-chama/10 text-chama',
};

const STATUS_VARIANT: Record<PaymentRow['status'], 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  SUCCESS: 'default',
  FAILED: 'destructive',
  CANCELLED: 'destructive',
};

const JUNIOR_STATUS_LABEL: Record<JuniorApp['status'], string> = {
  PENDING_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function AccountsClient({
  data,
}: {
  data: {
    defaultPhone: string;
    products: Product[];
    accounts: Account[];
    payments: PaymentRow[];
    juniorApplications: JuniorApp[];
  };
}) {
  const accountByProductId = new Map(data.accounts.map((a) => [a.productId, a]));
  const latestJuniorApp = data.juniorApplications[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.products.map((p) => {
          const Icon = PRODUCT_ICON[p.type];
          const account = accountByProductId.get(p.id);

          return (
            <Card
              key={p.id}
              className="flex flex-col rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
            >
              <CardHeader>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${PRODUCT_TONE[p.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                {p.description && <CardDescription className="line-clamp-3">{p.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-1 space-y-2 font-figures text-sm">
                <p>
                  <span className="font-sans text-muted-foreground">Return: </span>
                  <span className="font-semibold text-primary">
                    {p.roiMax ? `${p.roi}–${p.roiMax}` : `Up to ${p.roi}`}% p.a.
                  </span>
                </p>
                <p>
                  <span className="font-sans text-muted-foreground">Min amount: </span>
                  {formatKES(p.minAmount)}
                </p>
                {account && (
                  <p className="pt-1">
                    <span className="font-sans text-muted-foreground">Your balance: </span>
                    <span className="font-semibold">
                      KES <CountUp value={account.balance} />
                    </span>
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {p.type === 'JUNIOR' ? (
                  latestJuniorApp && latestJuniorApp.status !== 'REJECTED' ? (
                    <div className="w-full space-y-1.5">
                      <Badge variant={latestJuniorApp.status === 'APPROVED' ? 'default' : 'secondary'}>
                        {JUNIOR_STATUS_LABEL[latestJuniorApp.status]}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Application for {latestJuniorApp.childFullName}
                      </p>
                      {latestJuniorApp.status === 'APPROVED' && (
                        <PaymentDialog
                          productId={p.id}
                          productName={p.name}
                          minAmount={p.minAmount}
                          defaultPhone={data.defaultPhone}
                          trigger={
                            <button className="text-xs font-semibold text-primary underline underline-offset-2">
                              Fund this account
                            </button>
                          }
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full space-y-1.5">
                      <JuniorApplicationDialog />
                      {latestJuniorApp?.status === 'REJECTED' && (
                        <p className="text-xs text-destructive">
                          Previous application was rejected{latestJuniorApp.reviewNotes ? `: ${latestJuniorApp.reviewNotes}` : '.'} You can re-apply.
                        </p>
                      )}
                    </div>
                  )
                ) : (
                  <PaymentDialog
                    productId={p.id}
                    productName={p.name}
                    minAmount={p.minAmount}
                    defaultPhone={data.defaultPhone}
                  />
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 font-headline text-lg font-semibold">Payment History</h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet — fund an account above to get started.</p>
        ) : (
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {p.channel === 'MPESA' ? (
                          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {p.channel === 'MPESA' ? 'M-Pesa' : 'Visa Card'}
                      </span>
                    </TableCell>
                    <TableCell className="font-figures">{formatKES(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
