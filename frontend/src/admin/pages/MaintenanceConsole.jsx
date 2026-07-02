import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMaintenanceSession } from '../hooks/useMaintenanceSession';
import { maintenanceService } from '../../services/api/maintenanceService';
import { SiriLogo } from '../../components/ui/SiriLogo';

export function MaintenanceConsole() {
  const { session, logout, clearSession } = useMaintenanceSession();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.token) {
      navigate('/admin');
      return;
    }

    const fetchData = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          maintenanceService.getStatus(),
          maintenanceService.getAuditLogs(session.token),
        ]);
        setStatus(statusRes.data);
        setLogs(logsRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) {
          clearSession();
          navigate('/admin');
        } else {
          toast.error('Failed to load console data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [session, navigate, clearSession]);

  const handleDisable = async () => {
    if (
      !window.confirm(
        'Are you sure you want to disable maintenance mode and bring the site back online?',
      )
    )
      return;

    setDisabling(true);
    try {
      await maintenanceService.disableMaintenance(session.token);
      toast.success('Maintenance mode disabled. Site is online.');
      await logout(); // Ends session and clears it
      navigate('/admin');
    } catch (err) {
      toast.error('Failed to disable maintenance mode');
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 lg:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="opacity-80 grayscale invert hidden sm:block">
              <SiriLogo size="40px" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Super Admin Console</h1>
              <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Secure session active
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm"
            >
              Sign Out
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">settings</span>
                System Status
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-lg">Maintenance Mode</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/20">
                      {status?.mode || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 text-wrap">
                    Public traffic is currently being blocked or restricted.
                  </p>
                </div>

                <button
                  onClick={handleDisable}
                  disabled={disabling}
                  className="mt-4 sm:mt-0 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {disabling ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">
                      power_settings_new
                    </span>
                  )}
                  Disable Maintenance
                </button>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">manage_search</span>
                Security Audit Logs
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-white/40 border-b border-white/5">
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Action</th>
                      <th className="pb-3 font-medium">Result</th>
                      <th className="pb-3 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td className="py-3 text-white/60">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 font-mono text-xs">{log.action}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.result === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="py-3 text-white/40 font-mono text-xs">{log.ip}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-white/40">
                          No audit logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">security</span>
                Session Info
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                    Expires In
                  </div>
                  <div className="font-mono text-xl">
                    {session?.expiresAt
                      ? Math.max(0, Math.floor((new Date(session.expiresAt) - new Date()) / 60000))
                      : 0}{' '}
                    mins
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                    Session Token
                  </div>
                  <div className="font-mono text-xs bg-black/50 p-2 rounded truncate text-white/60">
                    {session?.token}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl text-sm text-white/60 leading-relaxed">
              <strong className="text-white block mb-2">Notice</strong>
              While in maintenance mode, all automated backend jobs continue to run. You can safely
              navigate the admin dashboard by clicking "Go to Dashboard". The public store will
              remain offline until you explicitly disable maintenance mode here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
