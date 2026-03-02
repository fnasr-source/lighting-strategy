import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Invoice | Admireworks',
    description: 'View and pay your invoice from Admireworks',
    robots: 'noindex, nofollow',
};

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
