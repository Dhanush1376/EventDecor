import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const WhatsAppReadinessDashboard = () => {
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await whatsappAutomationService.getAssessmentHistory();
      if (res.data?.success) {
        setHistory(res.data.data);
        if (res.data.data.length > 0) {
          setAssessment(res.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load history', error);
    }
  };

  const runAssessment = async () => {
    setLoading(true);
    toast.loading('Running full production certification...', { id: 'cert' });
    try {
      const res = await whatsappAutomationService.runAssessment();
      if (res.data?.success) {
        setAssessment(res.data.data);
        toast.success('Assessment complete', { id: 'cert' });
        fetchHistory();
      } else {
        toast.error('Assessment failed to execute', { id: 'cert' });
      }
    } catch (error) {
      toast.error('Assessment encountered an error', { id: 'cert' });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format) => {
    // In a real app, this would trigger a download endpoint.
    toast.success(`Exporting report as ${format.toUpperCase()}`);
    console.log(assessment);
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Pass':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const chartData = history
    .slice()
    .reverse()
    .map((a, i) => ({
      name: `Run ${i + 1}`,
      score: a.overallScore,
    }));

  if (!assessment && !loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <span className="material-icons-outlined text-4xl text-indigo-600">verified</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          Production Readiness Certification
        </h2>
        <p className="text-gray-500 mb-8 max-w-md text-center">
          Run a comprehensive 6-phase assessment to validate architecture, security, performance,
          disaster recovery, and operational readiness.
        </p>
        <button
          onClick={runAssessment}
          className="admin-btn-primary px-8 py-3 rounded-lg font-bold"
        >
          Run Initial Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${assessment?.isPassed ? 'bg-green-100' : 'bg-red-100'}`}
          >
            <span
              className={`material-icons-outlined text-3xl ${assessment?.isPassed ? 'text-green-600' : 'text-red-600'}`}
            >
              {assessment?.isPassed ? 'verified' : 'gpp_bad'}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Production Certification
            </h2>
            <p className="text-[13px] text-gray-500 mt-1 font-medium">
              Last assessed:{' '}
              {assessment ? new Date(assessment.executedAt).toLocaleString() : 'Running...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => downloadReport('pdf')}
            className="admin-btn-secondary py-2 text-[13px] flex items-center gap-2"
          >
            <span className="material-icons-outlined text-[16px]">picture_as_pdf</span>
            PDF
          </button>
          <button
            onClick={() => downloadReport('json')}
            className="admin-btn-secondary py-2 text-[13px] flex items-center gap-2"
          >
            <span className="material-icons-outlined text-[16px]">code</span>
            JSON
          </button>
          <button
            onClick={runAssessment}
            disabled={loading}
            className="admin-btn-primary py-2 text-[13px] flex items-center gap-2"
          >
            <span className="material-icons-outlined text-[16px]">
              {loading ? 'sync' : 'play_arrow'}
            </span>
            {loading ? 'Running...' : 'Run New Assessment'}
          </button>
        </div>
      </div>

      {assessment && (
        <>
          {/* Main Score Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-6">
                Overall Readiness Score
              </div>
              <div className="relative flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-gray-100"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="440"
                    strokeDashoffset={440 - (440 * assessment.overallScore) / 100}
                    className={
                      assessment.overallScore >= 70 &&
                      !assessment.findings.some((f) => f.severity === 'Critical')
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-gray-900">
                    {assessment.overallScore}
                  </span>
                  <span className="text-xs font-bold text-gray-500">/ 100</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                {assessment.isPassed ? (
                  <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold rounded-full text-[13px]">
                    PRODUCTION READY
                  </span>
                ) : (
                  <span className="px-4 py-1.5 bg-red-100 text-red-700 font-bold rounded-full text-[13px]">
                    NOT READY FOR PRODUCTION
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-2">
              <h3 className="font-bold text-[14px] text-gray-700 mb-4 uppercase tracking-wide">
                Risk Vectors
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: 'Security & Access',
                    score: assessment.riskScores.security,
                    color: 'bg-red-500',
                  },
                  {
                    label: 'Architecture & Correctness',
                    score: assessment.riskScores.maintainability,
                    color: 'bg-indigo-500',
                  },
                  {
                    label: 'Disaster Recovery & Reliability',
                    score: assessment.riskScores.reliability,
                    color: 'bg-orange-500',
                  },
                  {
                    label: 'Performance & Scale',
                    score: assessment.riskScores.scalability,
                    color: 'bg-blue-500',
                  },
                  {
                    label: 'Operational & Env',
                    score: assessment.riskScores.operational,
                    color: 'bg-green-500',
                  },
                ].map((risk, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-48 text-[13px] font-bold text-gray-700">{risk.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${risk.color}`}
                        style={{ width: `${risk.score}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-right text-[13px] font-black text-gray-900">
                      {risk.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('findings')}
                  className={`flex-1 py-4 text-center font-bold text-[13px] ${activeTab === 'findings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Detailed Findings ({assessment.findings.length})
                </button>
                <button
                  onClick={() => setActiveTab('gate')}
                  className={`flex-1 py-4 text-center font-bold text-[13px] ${activeTab === 'gate' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Readiness Gate Status
                </button>
              </div>

              <div className="p-0">
                {activeTab === 'findings' && (
                  <div className="divide-y divide-gray-100">
                    {assessment.findings
                      .sort((a, b) => {
                        const s = { Critical: 4, High: 3, Medium: 2, Low: 1, Pass: 0 };
                        return s[b.severity] - s[a.severity];
                      })
                      .map((f, i) => (
                        <div key={i} className="p-5 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getSeverityColor(f.severity)}`}
                              >
                                {f.severity}
                              </span>
                              <span className="text-[14px] font-bold text-gray-900">{f.phase}</span>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase">
                              {f.sourceType}
                            </span>
                          </div>
                          <p className="text-[13px] text-gray-700 font-medium mb-3">{f.evidence}</p>

                          {(f.rootCause || f.remediation) && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                              {f.rootCause && (
                                <div className="text-[12px]">
                                  <span className="font-bold text-gray-700">Root Cause: </span>
                                  <span className="text-gray-600">{f.rootCause}</span>
                                </div>
                              )}
                              {f.remediation && (
                                <div className="text-[12px]">
                                  <span className="font-bold text-gray-700">Remediation: </span>
                                  <span className="text-gray-600">{f.remediation}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {activeTab === 'gate' && (
                  <div className="p-6 text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-icons-outlined text-3xl text-gray-400">
                        security
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Production Gate is Active</h3>
                    <p className="text-[13px] max-w-md mx-auto">
                      The Readiness Gate dynamically blocks workflows from publishing if they fail
                      pre-flight validation. It currently intercepts API calls to ensure platform
                      stability.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-[14px] text-gray-700 mb-6 uppercase tracking-wide">
                Historical Trend
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WhatsAppReadinessDashboard;
