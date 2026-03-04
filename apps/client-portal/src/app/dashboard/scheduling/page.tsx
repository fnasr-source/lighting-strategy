'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CalendarClock, Plus, RefreshCw, Link as LinkIcon, Settings2, Users, Clock3 } from 'lucide-react';

interface EventType {
  id: string;
  slug: string;
  name: string;
  audienceCase: 'lead' | 'client' | 'team_partner';
  durationMin: number;
  routingMode: 'host_fixed' | 'round_robin_weighted' | 'collective_required';
  isActive: boolean;
  timezone: string;
}

interface Booking {
  id: string;
  eventName: string;
  eventSlug: string;
  status: string;
  startAt: string;
  invitee: { name?: string; email?: string; timezone?: string };
  primaryHostUserId?: string;
}

interface Host {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  timezone: string;
  active: boolean;
  google?: { connected?: boolean; lastError?: string; lastSyncAt?: string };
}

interface HostMap {
  id: string;
  eventTypeId: string;
  hostUserId: string;
  weight: number;
  active: boolean;
}

const DEFAULT_EVENT_FORM = {
  slug: '',
  name: '',
  audienceCase: 'lead' as EventType['audienceCase'],
  durationMin: 30,
  routingMode: 'round_robin_weighted' as EventType['routingMode'],
  timezone: 'Asia/Dubai',
};

export default function SchedulingPage() {
  const { hasPermission, user, profile } = useAuth();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostMaps, setHostMaps] = useState<HostMap[]>([]);

  const [activeTab, setActiveTab] = useState<'event_types' | 'bookings' | 'hosts'>('event_types');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_EVENT_FORM);
  const [editingId, setEditingId] = useState('');

  const [selectedEventForMap, setSelectedEventForMap] = useState('');
  const [mapHostId, setMapHostId] = useState('');
  const [mapWeight, setMapWeight] = useState(1);

  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  useEffect(() => {
    const unsubEvents = onSnapshot(
      query(collection(db, 'schedulingEventTypes'), orderBy('createdAt', 'desc')),
      (snap) => setEventTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventType))),
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'schedulingBookings'), orderBy('startAt', 'desc')),
      (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking))),
    );

    const unsubHosts = onSnapshot(
      query(collection(db, 'schedulingHosts'), orderBy('displayName', 'asc')),
      (snap) => setHosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Host))),
    );

    const unsubMaps = onSnapshot(
      query(collection(db, 'schedulingHostEventTypeMap'), orderBy('createdAt', 'desc')),
      (snap) => setHostMaps(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HostMap))),
    );

    return () => {
      unsubEvents();
      unsubBookings();
      unsubHosts();
      unsubMaps();
    };
  }, []);

  const canRead = hasPermission('campaigns:read');
  const canWrite = hasPermission('campaigns:write');

  const filteredBookings = useMemo(
    () => bookings.filter((b) => bookingStatusFilter === 'all' || b.status === bookingStatusFilter),
    [bookings, bookingStatusFilter],
  );

  const hostLookup = useMemo(() => {
    return hosts.reduce<Record<string, Host>>((acc, host) => {
      acc[host.uid] = host;
      return acc;
    }, {});
  }, [hosts]);

  if (!canRead) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-title">Access Denied</div>
      </div>
    );
  }

  const saveEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: '',
        audienceCase: form.audienceCase,
        durationMin: Number(form.durationMin) || 30,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        minNoticeMinutes: 120,
        bookingWindowDays: 30,
        cancelCutoffHours: 4,
        routingMode: form.routingMode,
        timezone: form.timezone || 'Asia/Dubai',
        reminderPolicy: { firstMinutesBefore: 1440, secondMinutesBefore: 60 },
        intakeQuestions: [],
        locationType: 'google_meet',
        locationDetails: '',
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'schedulingEventTypes', editingId), payload);
      } else {
        await addDoc(collection(db, 'schedulingEventTypes'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setForm(DEFAULT_EVENT_FORM);
      setEditingId('');
    } finally {
      setSaving(false);
    }
  };

  const editEventType = (item: EventType) => {
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      name: item.name,
      audienceCase: item.audienceCase,
      durationMin: item.durationMin,
      routingMode: item.routingMode,
      timezone: item.timezone,
    });
    setActiveTab('event_types');
  };

  const registerCurrentUserAsHost = async () => {
    if (!user || !profile) return;

    await setDoc(
      doc(db, 'schedulingHosts', user.uid),
      {
        uid: user.uid,
        email: profile.email || user.email || '',
        displayName: profile.displayName || user.displayName || profile.email || 'Team Member',
        timezone: 'Asia/Dubai',
        active: true,
        defaultAvailability: [
          { weekday: 1, startTime: '09:00', endTime: '17:00' },
          { weekday: 2, startTime: '09:00', endTime: '17:00' },
          { weekday: 3, startTime: '09:00', endTime: '17:00' },
          { weekday: 4, startTime: '09:00', endTime: '17:00' },
          { weekday: 5, startTime: '09:00', endTime: '17:00' },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const startGoogleConnect = async () => {
    if (!user) return;
    const token = await user.getIdToken();

    const res = await fetch('/api/scheduling/google/connect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ returnTo: '/dashboard/scheduling' }),
    });

    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Failed to connect Google Calendar');
    }
  };

  const addHostMap = async () => {
    if (!canWrite || !selectedEventForMap || !mapHostId) return;

    const existing = await getDocs(
      query(
        collection(db, 'schedulingHostEventTypeMap'),
        where('eventTypeId', '==', selectedEventForMap),
        where('hostUserId', '==', mapHostId),
      ),
    );

    if (!existing.empty) {
      alert('Host is already mapped to this event type.');
      return;
    }

    await addDoc(collection(db, 'schedulingHostEventTypeMap'), {
      eventTypeId: selectedEventForMap,
      hostUserId: mapHostId,
      weight: Number(mapWeight) || 1,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setMapHostId('');
    setMapWeight(1);
  };

  const seedDefaultEventTypes = async () => {
    if (!canWrite) return;

    const templates = [
      {
        slug: 'discovery-call',
        name: 'Discovery Call',
        audienceCase: 'lead',
        durationMin: 30,
        routingMode: 'round_robin_weighted',
      },
      {
        slug: 'client-review',
        name: 'Client Review',
        audienceCase: 'client',
        durationMin: 45,
        routingMode: 'collective_required',
      },
      {
        slug: 'team-partner-meeting',
        name: 'Team/Partner Meeting',
        audienceCase: 'team_partner',
        durationMin: 30,
        routingMode: 'host_fixed',
      },
    ] as const;

    for (const template of templates) {
      const exists = eventTypes.some((e) => e.slug === template.slug);
      if (exists) continue;

      await addDoc(collection(db, 'schedulingEventTypes'), {
        ...template,
        description: '',
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        minNoticeMinutes: 120,
        bookingWindowDays: 30,
        cancelCutoffHours: 4,
        timezone: 'Asia/Dubai',
        reminderPolicy: { firstMinutesBefore: 1440, secondMinutesBefore: 60 },
        intakeQuestions: template.slug === 'discovery-call'
          ? [
            { id: 'goal', label: 'What is your primary goal?', type: 'textarea', required: true },
            { id: 'timeline', label: 'Target timeline', type: 'text', required: false },
          ]
          : [],
        locationType: 'google_meet',
        locationDetails: '',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Scheduling</h1>
          <p className="page-subtitle">Calendly replacement: event types, bookings, routing, and calendar connection</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canWrite && (
            <button className="btn btn-secondary" onClick={seedDefaultEventTypes}>
              <Plus size={14} /> Seed Defaults
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => window.location.reload()}><RefreshCw size={14} /> Refresh</button>
          {!hosts.some((h) => h.uid === user?.uid) && canWrite && (
            <button className="btn btn-primary" onClick={registerCurrentUserAsHost}><Plus size={14} /> Register Me As Host</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn" style={{ background: activeTab === 'event_types' ? 'var(--aw-navy)' : 'var(--muted-bg)', color: activeTab === 'event_types' ? '#fff' : 'var(--foreground)' }} onClick={() => setActiveTab('event_types')}><Settings2 size={14} /> Event Types</button>
        <button className="btn" style={{ background: activeTab === 'bookings' ? 'var(--aw-navy)' : 'var(--muted-bg)', color: activeTab === 'bookings' ? '#fff' : 'var(--foreground)' }} onClick={() => setActiveTab('bookings')}><CalendarClock size={14} /> Bookings</button>
        <button className="btn" style={{ background: activeTab === 'hosts' ? 'var(--aw-navy)' : 'var(--muted-bg)', color: activeTab === 'hosts' ? '#fff' : 'var(--foreground)' }} onClick={() => setActiveTab('hosts')}><Users size={14} /> Hosts & Routing</button>
      </div>

      {activeTab === 'event_types' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Event Type' : 'Create Event Type'}</h3>
            <form onSubmit={saveEventType}>
              <div className="form-group"><label className="form-label">Slug *</label><input className="form-input" required value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="discovery-call" /></div>
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Audience Case</label><select className="form-input" value={form.audienceCase} onChange={(e) => setForm((p) => ({ ...p, audienceCase: e.target.value as EventType['audienceCase'] }))}><option value="lead">Lead</option><option value="client">Client</option><option value="team_partner">Team/Partner</option></select></div>
              <div className="form-group"><label className="form-label">Duration (minutes)</label><input className="form-input" type="number" min={15} value={form.durationMin} onChange={(e) => setForm((p) => ({ ...p, durationMin: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Routing Mode</label><select className="form-input" value={form.routingMode} onChange={(e) => setForm((p) => ({ ...p, routingMode: e.target.value as EventType['routingMode'] }))}><option value="round_robin_weighted">Round Robin Weighted</option><option value="host_fixed">Host Fixed</option><option value="collective_required">Collective Required</option></select></div>
              <div className="form-group"><label className="form-label">Timezone</label><input className="form-input" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} /></div>

              <button className="btn btn-primary" disabled={saving || !canWrite} type="submit" style={{ width: '100%' }}>
                {saving ? 'Saving...' : editingId ? 'Update Event Type' : 'Create Event Type'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Event Types</h3>
            {eventTypes.length === 0 && <p style={{ color: 'var(--muted)' }}>No event types yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eventTypes.map((item) => (
                <div key={item.id} style={{ border: '1px solid var(--card-border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>/{item.slug} · {item.durationMin}m · {item.routingMode}</div>
                    </div>
                    <span className={`status-pill status-${item.isActive ? 'active' : 'overdue'}`}>{item.isActive ? 'active' : 'inactive'}</span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" onClick={() => editEventType(item)}>Edit</button>
                    {canWrite && (
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          await updateDoc(doc(db, 'schedulingEventTypes', item.id), {
                            isActive: !item.isActive,
                            updatedAt: serverTimestamp(),
                          });
                        }}
                      >
                        {item.isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Bookings</h3>
            <select className="form-input" style={{ maxWidth: 180 }} value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invitee</th>
                  <th>Event</th>
                  <th>When</th>
                  <th>Host</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.invitee?.name || '-'}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{b.invitee?.email || ''}</div>
                    </td>
                    <td>{b.eventName || b.eventSlug}</td>
                    <td>{new Date(b.startAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{hostLookup[b.primaryHostUserId || '']?.displayName || b.primaryHostUserId || '-'}</td>
                    <td><span className={`status-pill status-${b.status === 'confirmed' ? 'active' : b.status === 'cancelled' ? 'overdue' : 'pending'}`}>{b.status}</span></td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr><td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No bookings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hosts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}><Users size={16} style={{ verticalAlign: 'middle' }} /> Hosts</h3>
            <button className="btn btn-primary" onClick={startGoogleConnect} style={{ marginBottom: 12 }}><LinkIcon size={14} /> Connect My Google Calendar</button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hosts.map((host) => (
                <div key={host.id} style={{ border: '1px solid var(--card-border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{host.displayName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{host.email} · {host.timezone}</div>
                    </div>
                    <span className={`status-pill status-${host.google?.connected ? 'active' : 'pending'}`}>{host.google?.connected ? 'google connected' : 'not connected'}</span>
                  </div>
                  {host.google?.lastError && <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--danger)' }}>{host.google.lastError}</div>}
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={async () => {
                      await updateDoc(doc(db, 'schedulingHosts', host.id), {
                        active: !host.active,
                        updatedAt: serverTimestamp(),
                      });
                    }}>{host.active ? 'Deactivate' : 'Activate'}</button>
                  </div>
                </div>
              ))}
              {hosts.length === 0 && <p style={{ color: 'var(--muted)' }}>No hosts yet. Register yourself as host first.</p>}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}><Clock3 size={16} style={{ verticalAlign: 'middle' }} /> Routing Map</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Assign hosts to event types with optional round-robin weights.</p>

            <div className="form-group"><label className="form-label">Event Type</label><select className="form-input" value={selectedEventForMap} onChange={(e) => setSelectedEventForMap(e.target.value)}><option value="">Select event type...</option>{eventTypes.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.slug})</option>)}</select></div>
            <div className="form-group"><label className="form-label">Host</label><select className="form-input" value={mapHostId} onChange={(e) => setMapHostId(e.target.value)}><option value="">Select host...</option>{hosts.map((h) => <option key={h.uid} value={h.uid}>{h.displayName}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Weight</label><input className="form-input" type="number" min={1} max={10} value={mapWeight} onChange={(e) => setMapWeight(Number(e.target.value || 1))} /></div>
            <button className="btn btn-primary" disabled={!canWrite || !selectedEventForMap || !mapHostId} onClick={addHostMap}>Add Mapping</button>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hostMaps
                .filter((m) => !selectedEventForMap || m.eventTypeId === selectedEventForMap)
                .map((m) => (
                  <div key={m.id} style={{ border: '1px solid var(--card-border)', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.82rem' }}>
                      <strong>{eventTypes.find((e) => e.id === m.eventTypeId)?.name || m.eventTypeId}</strong>
                      <div style={{ color: 'var(--muted)' }}>{hostLookup[m.hostUserId]?.displayName || m.hostUserId} · weight {m.weight}</div>
                    </div>
                    <button className="btn btn-secondary" onClick={async () => {
                      await updateDoc(doc(db, 'schedulingHostEventTypeMap', m.id), {
                        active: !m.active,
                        updatedAt: serverTimestamp(),
                      });
                    }}>{m.active ? 'Disable' : 'Enable'}</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
