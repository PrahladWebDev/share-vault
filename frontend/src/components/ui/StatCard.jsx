const StatCard = ({ icon: Icon, label, value, sub, color = 'brand' }) => {
  const colorMap = {
    brand: 'from-brand-600/20 to-brand-800/10 border-brand-700/30 text-brand-400',
    green: 'from-emerald-600/20 to-emerald-800/10 border-emerald-700/30 text-emerald-400',
    blue: 'from-blue-600/20 to-blue-800/10 border-blue-700/30 text-blue-400',
    yellow: 'from-yellow-600/20 to-yellow-800/10 border-yellow-700/30 text-yellow-400',
    red: 'from-red-600/20 to-red-800/10 border-red-700/30 text-red-400',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-700/30 text-purple-400',
  };

  const cls = colorMap[color] || colorMap.brand;

  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg bg-current/10 ${cls.split(' ').pop()}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
