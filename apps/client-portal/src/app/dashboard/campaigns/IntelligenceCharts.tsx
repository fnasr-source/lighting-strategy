'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';

type TimeSeriesPoint = {
  date: string;
  spend: number;
  value: number;
  conversions: number;
  roas: number;
  cvr: number;
};

type FunnelData = {
  label: string;
  value: number;
};

type ChannelData = {
  platform: string;
  spend: number;
  value: number;
  conversions: number;
  efficiency: number;
};

type ForecastPoint = {
  date: string;
  actual: number;
  forecast: number;
};

export type ChartConfig = {
  id: string;
  title: string;
  subtitle?: string;
  dataKey: string;
  color: string;
  formatter?: (value: number) => string;
  yLabel?: string;
};

const money = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct = (value: number): string => `${(value * 100).toFixed(2)}%`;
const tooltipMoney = (value: number | string | undefined): string => {
  if (typeof value === 'number') return money(value);
  if (typeof value === 'string') return value;
  return '0';
};

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ minHeight: 320 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{title}</h3>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.75rem' }}>{subtitle}</p>}
      </div>
      <div style={{ width: '100%', height: 250 }}>{children}</div>
    </div>
  );
}

export function TimeSeriesChart({
  data,
  config,
}: {
  data: TimeSeriesPoint[];
  config: ChartConfig[];
}) {
  return (
    <ChartCard title="Multi-Channel Time Series" subtitle="Spend, value, and performance trend by date">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number | string | undefined, name?: string) => [tooltipMoney(value), name || '']} />
          <Legend />
          {config.map((item) => (
            <Line
              key={item.id}
              type="monotone"
              dataKey={item.dataKey}
              name={item.title}
              stroke={item.color}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SpendOutcomeChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <ChartCard title="Spend vs Outcome" subtitle="Dual-axis performance for spend and value">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number | string | undefined, name?: string) => [tooltipMoney(value), name || '']} />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#ef4444" fill="#ef444433" />
          <Area yAxisId="right" type="monotone" dataKey="value" name="Value" stroke="#16a34a" fill="#16a34a33" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FunnelChart({ data }: { data: FunnelData[] }) {
  return (
    <ChartCard title="Funnel Journey" subtitle="Impression to conversion flow">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number | string | undefined) => tooltipMoney(value)} />
          <Bar dataKey="value" fill="#0f4c81" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ChannelContributionChart({ data }: { data: ChannelData[] }) {
  return (
    <ChartCard title="Channel Contribution" subtitle="Spend, value, and conversions by channel">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="platform" tick={{ fontSize: 11 }} width={90} />
          <Tooltip formatter={(value: number | string | undefined, name?: string) => [tooltipMoney(value), name || '']} />
          <Legend />
          <Bar dataKey="spend" fill="#f97316" radius={[0, 4, 4, 0]} />
          <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SocialBacklogChart({
  unresolved,
  breaches,
  points,
}: {
  unresolved: number;
  breaches: number;
  points: TimeSeriesPoint[];
}) {
  const mapped = points.map((point, index) => ({
    date: point.date,
    unresolved: Math.max(0, Math.round(unresolved * (0.8 + (index / Math.max(1, points.length - 1)) * 0.4))),
    breaches: Math.max(0, Math.round(breaches * (0.7 + (index / Math.max(1, points.length - 1)) * 0.5))),
  }));

  return (
    <ChartCard title="Conversation SLA & Backlog" subtitle="Unresolved social interactions and high-severity SLA breaches">
      <ResponsiveContainer>
        <LineChart data={mapped}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="unresolved" stroke="#eab308" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="breaches" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <ChartCard title="Pacing & Forecast" subtitle="Projected value trend based on current run-rate">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number | string | undefined, name?: string) => [tooltipMoney(value), name || '']} />
          <Legend />
          <Line type="monotone" dataKey="actual" stroke="#0f766e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="forecast" stroke="#9333ea" strokeDasharray="5 5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopicHeatmap({ topics }: { topics: Array<{ topic: string; count: number }> }) {
  const max = Math.max(...topics.map((item) => item.count), 1);

  return (
    <ChartCard title="Sentiment Topic Heatmap" subtitle="Most frequent social listening themes">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {topics.map((item) => {
          const intensity = item.count / max;
          const alpha = 0.15 + (intensity * 0.55);
          return (
            <div
              key={item.topic}
              style={{
                borderRadius: 10,
                border: '1px solid var(--card-border)',
                background: `rgba(15, 76, 129, ${alpha})`,
                color: intensity > 0.6 ? '#fff' : 'var(--foreground)',
                padding: 12,
                minHeight: 90,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'capitalize' }}>{item.topic.replace('_', ' ')}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{item.count}</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export function formatPercent(value: number): string {
  return pct(value);
}

export function formatMoney(value: number): string {
  return money(value);
}
