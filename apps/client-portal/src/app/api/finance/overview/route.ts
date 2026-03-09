import { NextRequest, NextResponse } from 'next/server';
import { loadFinanceSnapshot } from '@/lib/finance-admin';
import { computeFinanceOverview } from '@/lib/finance';
import { verifyApiUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await verifyApiUser(req.headers.get('authorization'));
  if (!user || !['owner', 'admin', 'team'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const horizon = Number(req.nextUrl.searchParams.get('horizon') || '90');
  const snapshot = await loadFinanceSnapshot();
  const overview = computeFinanceOverview({
    cashAccounts: snapshot.cashAccounts,
    invoices: snapshot.invoices,
    payments: snapshot.payments,
    expenses: snapshot.expenses,
    recurringExpenses: snapshot.recurringExpenses,
    recurringInvoices: snapshot.recurringInvoices,
    proposals: snapshot.proposals,
    financeInbox: snapshot.financeInbox,
    financeAlerts: snapshot.financeAlerts,
    baseCurrency: snapshot.settings.baseCurrency,
    horizonDays: horizon,
  });

  return NextResponse.json({ success: true, baseCurrency: snapshot.settings.baseCurrency, overview });
}
