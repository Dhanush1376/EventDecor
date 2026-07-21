import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Shield from 'lucide-react/dist/esm/icons/shield';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Cloud from 'lucide-react/dist/esm/icons/cloud';
import Server from 'lucide-react/dist/esm/icons/server';
import DownloadCloud from 'lucide-react/dist/esm/icons/download-cloud';
import Zap from 'lucide-react/dist/esm/icons/zap';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Database from 'lucide-react/dist/esm/icons/database';
import backupService from '../../services/backupService';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import './BackupCenter.css';

// Sub-components
import BackupHistory from './BackupHistory';
import RestoreWizard from './RestoreWizard';
import DisasterRecoveryPanel from './DisasterRecoveryPanel';
import RetentionManager from './RetentionManager';
import AuditTrail from './AuditTrail';

const BackupCenter = () => {
  const [healthData, setHealthData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dashboardRes = await backupService.fetchDashboard();
      setHealthData(dashboardRes.health);
      setRecommendations(dashboardRes.recommendations);
      setStats(dashboardRes.stats);

      const storageRes = await backupService.fetchStorageAnalytics();
      setStorageData(storageRes);
    } catch (error) {
      console.error('Failed to fetch backup dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async (type) => {
    if (
      await confirm({
        title: 'Trigger Backup',
        message: `Trigger a manual ${type} backup now?`,
        type: 'info',
      })
    ) {
      try {
        await backupService.triggerBackup(type, 'manual');
        toast.success('Backup initiated successfully. Check History tab for progress.');
      } catch (err) {
        toast.error('Failed to start backup: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Helper for active tab styling
  const isActive = (path) => (location.pathname === `/admin/backup-center${path}` ? 'active' : '');

  if (loading && !healthData) {
    return (
      <div className="backup-center-container flex justify-center items-center">
        Loading Enterprise Backup System...
      </div>
    );
  }

  // Define the Overview Component (Default Route)
  const Overview = () => (
    <div className="dashboard-grid">
      {/* Top Stats Row */}
      <div className="glass-card col-span-3">
        <div className="card-title">
          <Shield size={18} /> System Health
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            {/* Circular Gauge */}
            <svg viewBox="0 0 36 36" className="w-full h-full text-emerald-500">
              <path
                className="text-gray-700"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="100, 100"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${healthData?.score || 0}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
              {healthData?.score || 0}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">
              Grade: <span className="text-white font-bold">{healthData?.grade}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Excellent readiness</div>
          </div>
        </div>
      </div>

      <div className="glass-card col-span-3">
        <div className="card-title">
          <HardDrive size={18} /> Total Protected Data
        </div>
        <div className="metric-value">
          {(storageData?.totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
        </div>
        <div className="metric-label text-emerald-400">+1.2 GB this month</div>
      </div>

      <div className="glass-card col-span-3">
        <div className="card-title">
          <Activity size={18} /> Backup Success Rate
        </div>
        <div className="metric-value">99.8%</div>
        <div className="metric-label text-emerald-400">Last 30 days</div>
      </div>

      <div className="glass-card col-span-3">
        <div className="card-title">
          <Cloud size={18} /> Cloud Providers
        </div>
        <div className="flex gap-2 mt-2">
          <span className="status-badge status-completed">AWS S3</span>
          <span className="status-badge status-completed">GitHub</span>
          <span className="status-badge status-completed">Local</span>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="glass-card col-span-8">
        <div className="card-title">
          <Zap size={18} className="text-amber-400" /> Smart Recommendations
        </div>
        <div className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50"
              >
                {rec.priority === 'critical' ? (
                  <AlertTriangle className="text-red-500 shrink-0 mt-1" size={16} />
                ) : rec.priority === 'high' ? (
                  <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={16} />
                ) : (
                  <CheckCircle className="text-blue-400 shrink-0 mt-1" size={16} />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-white m-0">{rec.description}</h4>
                  <p className="text-xs text-gray-400 m-0 mt-1">Impact: {rec.estimatedImpact}</p>
                </div>
                {rec.actionable && (
                  <button className="btn-outline ml-auto text-xs py-1 px-3 h-fit">Apply</button>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400">
              All systems optimized. No recommendations at this time.
            </div>
          )}
        </div>
      </div>

      {/* Dependency Coverage Map (Simplified) */}
      <div className="glass-card col-span-4">
        <div className="card-title">
          <Database size={18} /> Protection Coverage
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Database size={14} /> MongoDB Atlas
            </span>
            <span className="status-badge status-completed">Protected</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Cloud size={14} /> Cloudinary Media
            </span>
            <span className="status-badge status-completed">Synced</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Server size={14} /> Environment Configs
            </span>
            <span className="status-badge status-completed">Versioned</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Zap size={14} /> Redis Cache
            </span>
            <span className="status-badge status-warning">Ephemeral</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="backup-center-container">
      <div className="backup-header">
        <div className="backup-title">
          <h1>Enterprise Backup & DR</h1>
          <p>Protecting {stats?.totalBackups || 0} historical snapshots across 3 regions</p>
        </div>
        <div className="backup-actions">
          <button
            onClick={() => handleTriggerBackup('full')}
            className="btn-primary flex items-center gap-2"
          >
            <DownloadCloud size={16} /> Backup Now
          </button>
          <button
            onClick={() => handleTriggerBackup('snapshot')}
            className="btn-danger flex items-center gap-2"
          >
            <AlertTriangle size={16} /> Emergency Snapshot
          </button>
        </div>
      </div>

      <div className="backup-tabs">
        <Link to="/admin/backup-center" className={`tab-btn ${isActive('')}`}>
          Overview
        </Link>
        <Link to="/admin/backup-center/history" className={`tab-btn ${isActive('/history')}`}>
          History & Logs
        </Link>
        <Link to="/admin/backup-center/restore" className={`tab-btn ${isActive('/restore')}`}>
          Restore Wizard
        </Link>
        <Link to="/admin/backup-center/dr" className={`tab-btn ${isActive('/dr')}`}>
          Disaster Recovery
        </Link>
        <Link to="/admin/backup-center/retention" className={`tab-btn ${isActive('/retention')}`}>
          Retention & Keys
        </Link>
        <Link to="/admin/backup-center/audit" className={`tab-btn ${isActive('/audit')}`}>
          Audit Trail
        </Link>
      </div>

      <div className="backup-content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/history" element={<BackupHistory />} />
          <Route path="/restore" element={<RestoreWizard />} />
          <Route path="/dr" element={<DisasterRecoveryPanel />} />
          <Route path="/retention" element={<RetentionManager />} />
          <Route path="/audit" element={<AuditTrail />} />
        </Routes>
      </div>
    </div>
  );
};

export default BackupCenter;
