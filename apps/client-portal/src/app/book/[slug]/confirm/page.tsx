'use client';

import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';

function fmt(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function BookingConfirmPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();

  const bookingId = search.get('bookingId') || '';
  const startAt = search.get('startAt') || '';
  const endAt = search.get('endAt') || '';
  const meetingLink = search.get('meetingLink') || '';
  const manageUrl = search.get('manageUrl') || '';

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return (
    <main style={{ minHeight: '100vh', padding: '30px 16px', background: 'linear-gradient(135deg, #f7f9ff 0%, #eef2ff 100%)' }}>
      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0, color: 'var(--aw-navy)' }}>Booking Confirmed</h1>
        <p style={{ color: 'var(--muted)' }}>Your meeting has been scheduled successfully.</p>

        <div style={{ marginTop: 18, fontSize: '0.92rem' }}>
          {bookingId && <p><strong>Booking ID:</strong> {bookingId}</p>}
          {startAt && <p><strong>Start:</strong> {fmt(startAt, tz)} ({tz})</p>}
          {endAt && <p><strong>End:</strong> {fmt(endAt, tz)} ({tz})</p>}
          {meetingLink && (
            <p>
              <strong>Meeting Link:</strong>{' '}
              <a href={meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--aw-navy)' }}>
                Join Meeting
              </a>
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {manageUrl && (
            <a className="btn btn-secondary" href={manageUrl} target="_blank" rel="noopener noreferrer">
              Manage Booking
            </a>
          )}
          <Link className="btn btn-primary" href={`/book/${params.slug}`}>
            Book Another Slot
          </Link>
        </div>
      </div>
    </main>
  );
}
