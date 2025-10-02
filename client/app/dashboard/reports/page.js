'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState('traffic');
  const [dateRange, setDateRange] = useState('7d');
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  const reportTypes = [
    {
      id: 'traffic',
      name: 'Traffic Report',
      description: 'DNS query volume and patterns',
      icon: '📊',
      fields: ['Total Queries', 'Top Domains', 'Query Types', 'Geographic Distribution']
    },
    {
      id: 'security',
      name: 'Security Report',
      description: 'Blocked queries and threats',
      icon: '🔒',
      fields: ['Blocked Queries', 'Threat Types', 'Source IPs', 'Attack Patterns']
    },
    {
      id: 'performance',
      name: 'Performance Report',
      description: 'Response times and system metrics',
      icon: '⚡',
      fields: ['Response Times', 'System Load', 'Uptime', 'Error Rates']
    },
    {
      id: 'domain',
      name: 'Domain Report',
      description: 'Domain management activities',
      icon: '🌐',
      fields: ['Domain Changes', 'Record Updates', 'Zone Transfers', 'DNSSEC Status']
    }
  ];

  const handleGenerateReport = (format) => {
    const reportName = reportTypes.find(r => r.id === selectedReport)?.name;
    alert(`Generating ${reportName} in ${format} format for ${dateRange} period...`);
  };

  const handleScheduleReport = () => {
    alert('Report scheduling feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Reports</h1>
            <p className="text-slate-600">Generate detailed reports about your DNS infrastructure</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Types */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Types</h2>
                <div className="space-y-3">
                  {reportTypes.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${selectedReport === report.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{report.icon}</span>
                        <div>
                          <h3 className="font-medium text-slate-800">{report.name}</h3>
                          <p className="text-sm text-slate-600">{report.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Report Configuration */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">
                  {reportTypes.find(r => r.id === selectedReport)?.name} Configuration
                </h2>

                {/* Date Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 3 Months</option>
                    <option value="1y">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Report Fields */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Report Fields</label>
                  <div className="space-y-2">
                    {reportTypes.find(r => r.id === selectedReport)?.fields.map((field) => (
                      <label key={field} className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-slate-700">{field}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-4">Export Options</label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleGenerateReport('PDF')}
                      variant="primary"
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export PDF</span>
                    </Button>

                    <Button
                      onClick={() => handleGenerateReport('CSV')}
                      variant="secondary"
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export CSV</span>
                    </Button>

                    <Button
                      onClick={handleScheduleReport}
                      variant="secondary"
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Schedule</span>
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h3 className="font-medium text-slate-800 mb-2">Report Preview</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    This report will include data from the {dateRange} period with the selected fields.
                  </p>
                  <div className="bg-white rounded border p-4">
                    <div className="text-center text-slate-500">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Report preview will appear here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Recent Reports</h2>
            </div>
            <div className="p-6">
              <div className="text-center text-slate-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No reports generated yet</p>
                <p className="text-sm">Generate your first report to see it here</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
