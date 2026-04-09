import { Activity, CheckCircle, Clock, User } from 'lucide-react';

export default function StatsCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Ümumi', value: stats.total, icon: Activity, color: 'blue' },
    { label: 'Kodlanmış', value: stats.coded, icon: CheckCircle, color: 'green' },
    { label: 'Gözləmədə', value: stats.pending, icon: Clock, color: 'yellow' },
    { label: 'Mənim kodlamalarım', value: stats.myCodings, icon: User, color: 'purple' },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const percent = stats.total > 0 ? Math.round((stats.coded / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`border rounded-lg p-4 ${colorMap[c.color]}`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={18} />
              <span className="text-sm font-medium">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Ümumi irəliləyiş</span>
          <span className="font-medium">{percent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
