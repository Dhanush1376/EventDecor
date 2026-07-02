import api from '../../services/api';

class BackupService {
  /**
   * Fetch main dashboard metrics and health
   */
  async fetchDashboard() {
    const response = await api.get('/admin/backup/dashboard');
    return response.data;
  }

  /**
   * Fetch paginated backup history
   */
  async fetchBackupHistory(params = { page: 1, limit: 20 }) {
    const response = await api.get('/admin/backup/history', { params });
    return response.data;
  }

  /**
   * Fetch single backup details
   */
  async fetchBackupDetail(id) {
    const response = await api.get(`/admin/backup/${id}`);
    return response.data;
  }

  /**
   * Trigger a manual backup
   */
  async triggerBackup(type = 'full', schedule = 'manual') {
    const response = await api.post('/admin/backup/trigger', { type, schedule });
    return response.data;
  }

  /**
   * Trigger an emergency backup
   */
  async triggerEmergencyBackup(reason) {
    const response = await api.post('/admin/backup/emergency', { reason });
    return response.data;
  }

  /**
   * Fetch overall system health
   */
  async fetchHealth() {
    const response = await api.get('/admin/backup/health');
    return response.data;
  }

  /**
   * Fetch storage analytics (capacity, breakdown)
   */
  async fetchStorageAnalytics() {
    const response = await api.get('/admin/backup/storage');
    return response.data;
  }

  /**
   * Fetch storage heatmap data
   */
  async fetchStorageHeatMap() {
    const response = await api.get('/admin/backup/storage/heatmap');
    return response.data;
  }

  /**
   * Fetch performance metrics
   */
  async fetchPerformanceMetrics() {
    const response = await api.get('/admin/backup/performance');
    return response.data;
  }

  /**
   * Fetch cost estimates and optimizations
   */
  async fetchCostEstimates() {
    const response = await api.get('/admin/backup/costs');
    return response.data;
  }

  /**
   * Fetch retention policies
   */
  async fetchRetentionPolicy() {
    const response = await api.get('/admin/backup/retention');
    return response.data;
  }

  /**
   * Update retention policies
   */
  async updateRetentionPolicy(policy) {
    const response = await api.put('/admin/backup/retention', policy);
    return response.data;
  }

  /**
   * Fetch immutable audit trail
   */
  async fetchAuditTrail(params = { page: 1, limit: 50 }) {
    const response = await api.get('/admin/backup/audit', { params });
    return response.data;
  }

  /**
   * Export audit trail as CSV
   */
  async exportAuditTrail(params = {}) {
    const response = await api.get('/admin/backup/audit/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Simulate a restore (dry-run)
   */
  async simulateRestore(backupId, options = {}) {
    const response = await api.post('/admin/backup/restore/simulate', { backupId, ...options });
    return response.data;
  }

  /**
   * Get estimated timeline for a restore
   */
  async fetchRestoreTimeline(backupId) {
    const response = await api.get(`/admin/backup/restore/timeline/${backupId}`);
    return response.data;
  }

  /**
   * Execute actual restore pipeline
   */
  async executeRestore(backupId, options = {}) {
    const response = await api.post('/admin/backup/restore/execute', { backupId, ...options });
    return response.data;
  }

  /**
   * Fetch restore operations history
   */
  async fetchRestoreHistory() {
    const response = await api.get('/admin/backup/restore/history');
    return response.data;
  }

  /**
   * Make a backup immutable
   */
  async lockBackup(id) {
    const response = await api.post(`/admin/backup/${id}/lock`);
    return response.data;
  }

  /**
   * Run checksum and signature verification
   */
  async verifyBackup(id) {
    const response = await api.post(`/admin/backup/${id}/verify`);
    return response.data;
  }

  /**
   * Get Point-in-Time Recovery available range
   */
  async fetchPitrRange() {
    const response = await api.get('/admin/backup/pitr/available');
    return response.data;
  }

  /**
   * Execute PITR restore
   */
  async pitrRestore(timestamp, options = {}) {
    const response = await api.post('/admin/backup/pitr/restore', { timestamp, ...options });
    return response.data;
  }

  /**
   * Run automated disaster recovery drill
   */
  async initiateDrDrill() {
    const response = await api.post('/admin/backup/dr/drill');
    return response.data;
  }

  /**
   * Fetch DR Readiness score
   */
  async fetchDrReadiness() {
    const response = await api.get('/admin/backup/dr/readiness');
    return response.data;
  }

  /**
   * Fetch AI anomalies
   */
  async fetchAnomalies() {
    const response = await api.get('/admin/backup/anomalies');
    return response.data;
  }

  /**
   * Run a chaos test scenario
   */
  async runChaosTest(scenario) {
    const response = await api.post('/admin/backup/chaos/run', { scenario });
    return response.data;
  }

  /**
   * Fetch AI recommendations
   */
  async fetchRecommendations() {
    const response = await api.get('/admin/backup/recommendations');
    return response.data;
  }

  /**
   * Fetch dependency visualization graph
   */
  async fetchDependencyGraph() {
    const response = await api.get('/admin/backup/dependencies/graph');
    return response.data;
  }

  /**
   * Fetch encryption key history
   */
  async fetchKeyHistory() {
    const response = await api.get('/admin/backup/keys/history');
    return response.data;
  }

  /**
   * Rotate encryption key
   */
  async rotateKey() {
    const response = await api.post('/admin/backup/keys/rotate');
    return response.data;
  }
}

export default new BackupService();
