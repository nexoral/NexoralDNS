export default function RuleCard({ rule, onToggle, onDelete }) {
  const getTypeIcon = (type) => {
    const icons = {
      blocklist: '🚫',
      reroute: '↗️',
      ttl: '⏱️',
      custom: '🏠'
    };
    return icons[type] || '📝';
  };

  const getStatusColor = (status) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getTypeIcon(rule.type)}</div>
          <div>
            <h3 className="font-medium text-slate-800">{rule.domain}</h3>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              {rule.target && <span>→ {rule.target}</span>}
              {rule.ip && <span>→ {rule.ip}</span>}
              {rule.ttl && <span>TTL: {rule.ttl}s</span>}
              <span>Created: {rule.created}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(rule.status)}`}>
            {rule.status}
          </span>

          <button
            onClick={onToggle}
            className={`p-2 rounded-md transition-colors ${rule.status === 'active'
                ? 'text-green-600 hover:bg-green-50'
                : 'text-slate-400 hover:bg-slate-50'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
