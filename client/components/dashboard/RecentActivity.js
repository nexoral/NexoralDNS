'use client';

export default function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: 'zone_created',
      message: 'New DNS zone created for example.com',
      time: '2 minutes ago',
      icon: '🌐',
      color: 'green'
    },
    {
      id: 2,
      type: 'record_updated',
      message: 'A record updated for api.example.com',
      time: '5 minutes ago',
      icon: '📝',
      color: 'blue'
    },
    {
      id: 3,
      type: 'security_alert',
      message: 'Suspicious query pattern detected',
      time: '10 minutes ago',
      icon: '⚠️',
      color: 'red'
    },
    {
      id: 4,
      type: 'backup_completed',
      message: 'Automated backup completed successfully',
      time: '1 hour ago',
      icon: '💾',
      color: 'green'
    },
    {
      id: 5,
      type: 'zone_deleted',
      message: 'DNS zone removed for old-site.com',
      time: '2 hours ago',
      icon: '🗑️',
      color: 'red'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-600 border-green-200',
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      red: 'bg-red-100 text-red-600 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200'
    };
    return colors[color];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
          <p className="text-sm text-slate-600">Latest system events and changes</p>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${getColorClasses(activity.color)}`}>
              <span className="text-sm">{activity.icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 font-medium">{activity.message}</p>
              <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
            </div>

            {/* Action Button */}
            <button className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 text-center">
        <button className="text-sm text-slate-600 hover:text-slate-800 transition-colors">
          Load More Activities
        </button>
      </div>
    </div>
  );
}
