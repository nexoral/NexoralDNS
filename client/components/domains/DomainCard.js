export default function DomainCard({ domain, onDelete, onManageRecords }) {
  const getStatusColor = (status) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-3xl">🌐</div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{domain.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <span>{domain.records} records</span>
              <span>Created: {domain.created}</span>
              <span>Modified: {domain.lastModified}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(domain.status)}`}>
            {domain.status}
          </span>

          <button
            onClick={onManageRecords}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
          >
            Manage Records
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
