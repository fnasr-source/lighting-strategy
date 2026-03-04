'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type IntakeQuestion = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'phone' | 'email';
  required: boolean;
  options?: string[];
};

type EventTypeResponse = {
  eventType: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    durationMin: number;
    timezone: string;
    intakeQuestions: IntakeQuestion[];
  };
  slots: Array<{
    startAt: string;
    endAt: string;
    timezone: string;
    hostUserIds: string[];
    primaryHostUserId: string;
  }>;
};

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = String(params?.slug || '');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [eventData, setEventData] = useState<EventTypeResponse | null>(null);
  const [slots, setSlots] = useState<EventTypeResponse['slots']>([]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [responses, setResponses] = useState<Record<string, string>>({});

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  useEffect(() => {
    if (!slug) return;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/scheduling/event-types/${slug}?timezone=${encodeURIComponent(timezone)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load event type');

        setEventData(data);
        setSlots(data.slots || []);

        const date = new Date();
        setSelectedDate(date.toISOString().slice(0, 10));

        const qs = new URLSearchParams(window.location.search);
        const prefillName = qs.get('name') || '';
        const prefillEmail = qs.get('email') || '';
        if (prefillName || prefillEmail) {
          setForm((prev) => ({ ...prev, name: prefillName || prev.name, email: prefillEmail || prev.email }));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load booking page');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [slug, timezone]);

  useEffect(() => {
    if (!eventData?.eventType?.id) return;

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 21);

    const run = async () => {
      try {
        const res = await fetch('/api/scheduling/slots/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventTypeId: eventData.eventType.id,
            timezone,
            dateRange: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setSlots(data.slots || []);
        }
      } catch {
        // Keep initial slots
      }
    };

    run();
  }, [eventData?.eventType?.id, timezone]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((slot) => {
      const local = new Date(slot.startAt).toLocaleDateString('en-CA', { timeZone: timezone });
      return local === selectedDate;
    });
  }, [slots, selectedDate, timezone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select a time slot.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/scheduling/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          invitee: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            company: form.company,
            timezone,
          },
          slot: { startAt: selectedSlot },
          intakeResponses: responses,
          source: { type: 'public' },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      const query = new URLSearchParams({
        bookingId: data.bookingId,
        startAt: data.startAt,
        endAt: data.endAt,
        manageUrl: data.manageUrl || '',
        meetingLink: data.meetingLink || '',
      });

      router.push(`/book/${slug}/confirm?${query.toString()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32 }}>Loading booking page...</div>;
  }

  if (!eventData) {
    return <div style={{ padding: 32 }}>{error || 'Booking page unavailable.'}</div>;
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f7f9ff 0%, #eef2ff 100%)', padding: '30px 16px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 16 }}>
        <section className="card" style={{ height: 'fit-content' }}>
          <h1 style={{ margin: 0, color: 'var(--aw-navy)' }}>{eventData.eventType.name}</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>{eventData.eventType.description || 'Book your session with Admireworks.'}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Duration: <strong>{eventData.eventType.durationMin} min</strong> · Timezone: <strong>{timezone}</strong>
          </p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Select Date</label>
            <input
              className="form-input"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot('');
              }}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="form-label">Available Times</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slotsForDate.length === 0 && (
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No slots available for this date.</span>
              )}
              {slotsForDate.map((slot) => {
                const label = new Date(slot.startAt).toLocaleTimeString('en-US', {
                  timeZone: timezone,
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const active = selectedSlot === slot.startAt;

                return (
                  <button
                    type="button"
                    key={slot.startAt}
                    onClick={() => setSelectedSlot(slot.startAt)}
                    style={{
                      border: active ? '2px solid var(--aw-navy)' : '1px solid var(--card-border)',
                      background: active ? 'var(--aw-navy)' : '#fff',
                      color: active ? '#fff' : 'var(--foreground)',
                      borderRadius: 8,
                      padding: '7px 12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Your Details</h2>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>

            {(eventData.eventType.intakeQuestions || []).map((q) => (
              <div key={q.id} className="form-group">
                <label className="form-label">{q.label}{q.required ? ' *' : ''}</label>
                {q.type === 'textarea' ? (
                  <textarea className="form-input" required={q.required} rows={3} value={responses[q.id] || ''} onChange={(e) => setResponses((p) => ({ ...p, [q.id]: e.target.value }))} />
                ) : q.type === 'select' ? (
                  <select className="form-input" required={q.required} value={responses[q.id] || ''} onChange={(e) => setResponses((p) => ({ ...p, [q.id]: e.target.value }))}>
                    <option value="">Select...</option>
                    {(q.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input className="form-input" type={q.type === 'email' ? 'email' : 'text'} required={q.required} value={responses[q.id] || ''} onChange={(e) => setResponses((p) => ({ ...p, [q.id]: e.target.value }))} />
                )}
              </div>
            ))}

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
