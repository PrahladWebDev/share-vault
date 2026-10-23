// Tonal surface + matching icon container per color (full class names so Tailwind keeps them).
const colorMap = {
  brand: { surface: 'bg-brand-600/10', icon: 'bg-brand-600/25 text-brand-200' },
  green: { surface: 'bg-emerald-500/10', icon: 'bg-emerald-500/25 text-emerald-200' },
  blue: { surface: 'bg-blue-500/10', icon: 'bg-blue-500/25 text-blue-200' },
  yellow: { surface: 'bg-yellow-500/10', icon: 'bg-yellow-500/25 text-yellow-200' },
  red: { surface: 'bg-red-500/10', icon: 'bg-red-500/25 text-red-200' },
  purple: { surface: 'bg-purple-500/10', icon: 'bg-purple-500/25 text-purple-200' },
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'brand' }) => {
  const c = colorMap[color] || colorMap.brand;

  return (
    <div
      className={`${c.surface} border border-vault-border/50 rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-400 mb-1.5">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
