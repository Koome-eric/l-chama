'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  TrendingUp,
  User,
  HelpCircle,
  Settings,
  HeartHandshake,
  PiggyBank,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Sidebar nav — every item points at a real route in the app. A couple
// (Deposit, Withdraw) are lightweight placeholder
// pages for now since there's no ledger model behind them yet, but they
// live in the same dashboard shell so they're real, navigable pages
// rather than dead links.
// ─────────────────────────────────────────────
const menuItems = [
  { href: '/panel', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/team', label: 'Team Members', icon: Users },
  { href: '/panel?tab=loan-account', label: 'Contribute', icon: HandCoins, match: '/panel' },
  { href: '/invest', label: 'Invest', icon: PiggyBank },
  { href: '/campaigns', label: 'Campaigns', icon: HeartHandshake },
  { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/transactions', label: 'Transactions', icon: Repeat },
  { href: '/reports', label: 'Reports', icon: TrendingUp },
];

const bottomItems = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/help', label: 'Help Center', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar({
  children,
  hasLastRespectCover = false,
}: {
  children: React.ReactNode;
  hasLastRespectCover?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const items = hasLastRespectCover
    ? [
        ...menuItems.slice(0, 4),
        { href: '/last-respect', label: 'Last Respect Cover', icon: HeartHandshake },
        ...menuItems.slice(4),
      ]
    : menuItems;

  const isActive = (item: { href: string; match?: string }) => {
    const [itemPath, itemQuery] = item.href.split('?');
    if (itemQuery) {
      const itemTab = new URLSearchParams(itemQuery).get('tab');
      return pathname === itemPath && currentTab === itemTab;
    }
    return pathname === itemPath && !currentTab;
  };

  const renderItem = (item: (typeof menuItems)[number]) => {
    const active = isActive(item);
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.label}
          className={cn(
            'rounded-xl transition-colors',
            active && 'bg-primary/10 text-primary shadow-sm font-medium'
          )}
        >
          <Link href={item.href} className="flex items-center gap-3">
            <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
            <span className="truncate">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <Link href="/panel" className="flex items-center gap-2.5 px-1 py-1">
            <Image
              src="/lchama-icon.png"
              alt="L-Chama"
              width={66}
              height={77}
              className="h-8 w-auto shrink-0"
            />
            <span className="font-headline text-lg font-bold whitespace-nowrap group-data-[collapsible=icon]:hidden">
              L-CHAMA
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex flex-col justify-between">
          <SidebarMenu>{items.map(renderItem)}</SidebarMenu>
          <SidebarMenu>{bottomItems.map(renderItem)}</SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur px-4 sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto flex items-center gap-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'h-9 w-9 rounded-lg' } }}
            />
          </div>
        </header>

        <main className="flex-1 bg-muted/40">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
