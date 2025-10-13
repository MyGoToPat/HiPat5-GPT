import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { runAllChecks, type CheckResult } from '@/admin/diagnostics/checks';
import AdminGuard from '@/components/guards/AdminGuard';

export default function DiagnosticsPage() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  useEffect(() => {
    runChecks();
  }, []);

  async function runChecks() {
    setLoading(true);
    try {
      const results = await runAllChecks();
      setChecks(results);
    } catch (err) {
      console.error('Error running diagnostics:', err);
    } finally {
      setLoading(false);
    }
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const totalCount = checks.length;

  const toggleExpand = (checkName: string) => {
    setExpandedCheck(expandedCheck === checkName ? null : checkName);
  };

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
            <button
              onClick={runChecks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Rerun All Checks
            </button>
          </div>
          <p className="text-gray-600">
            Comprehensive system health checks for all MVP requirements
          </p>
        </div>

        {loading && checks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Checks</div>
                <div className="text-3xl font-bold text-gray-900">{totalCount}</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Passing</div>
                <div className="text-3xl font-bold text-green-600">{passCount}</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Failing</div>
                <div className="text-3xl font-bold text-red-600">{failCount}</div>
              </div>
            </div>

            {/* Overall Status */}
            {failCount === 0 && totalCount > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-semibold">
                  <CheckCircle size={20} />
                  All systems operational
                </div>
              </div>
            )}

            {failCount > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 font-semibold">
                  <XCircle size={20} />
                  {failCount} check{failCount !== 1 ? 's' : ''} failing
                </div>
              </div>
            )}

            {/* Check Results */}
            <div className="space-y-3">
              {checks.map((check) => (
                <div
                  key={check.name}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(check.name)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {check.status === 'pass' ? (
                        <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle size={24} className="text-red-600 flex-shrink-0" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">{check.name}</div>
                        <div className="text-sm text-gray-600">{check.details}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          check.status === 'pass'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {check.status === 'pass' ? 'PASS' : 'FAIL'}
                      </span>

                      {expandedCheck === check.name ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedCheck === check.name && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Details</div>
                          <div className="text-sm text-gray-900">{check.details}</div>
                        </div>

                        {check.error && (
                          <div>
                            <div className="text-xs font-semibold text-red-700 mb-1">Error</div>
                            <pre className="text-xs text-red-900 bg-red-50 p-2 rounded border border-red-200 overflow-x-auto">
                              {check.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {checks.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No checks available
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">About Diagnostics</h3>
          <p className="text-sm text-blue-800 mb-2">
            This page runs comprehensive checks to verify all MVP requirements are met.
            Checks include:
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Routes and component availability</li>
            <li>Database tables and RPC functions</li>
            <li>Role gating and access control</li>
            <li>TMWYA formatter exactness</li>
            <li>Talk/TTS configuration</li>
            <li>Deploy lock verification</li>
          </ul>
        </div>
      </div>
    </AdminGuard>
  );
}
