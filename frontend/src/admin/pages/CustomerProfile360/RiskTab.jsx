import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RiskTab({ fraudSignals }) {
  const hasSignals = fraudSignals && fraudSignals.length > 0;

  // Basic risk calculation based on signals
  const riskScore = hasSignals
    ? fraudSignals.reduce(
        (acc, sig) => acc + (sig.severity === 'high' ? 30 : sig.severity === 'medium' ? 15 : 5),
        0,
      )
    : 0;

  const riskLevel = riskScore > 60 ? 'High' : riskScore > 20 ? 'Medium' : 'Low';
  const riskColor =
    riskLevel === 'High'
      ? 'text-red-600 bg-red-50 border-red-200'
      : riskLevel === 'Medium'
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-green-600 bg-green-50 border-green-200';

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-xl border flex items-center justify-between ${riskColor}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 bg-white rounded-full shadow-sm`}>
            {riskLevel === 'Low' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <ShieldAlert
                className={`w-8 h-8 ${riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'}`}
              />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">Risk Profile: {riskLevel}</h2>
            <p className="text-sm font-medium mt-1 opacity-80">
              {riskLevel === 'Low'
                ? 'No significant fraud signals detected.'
                : 'Suspicious activity detected that requires review.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black">
            {Math.min(riskScore, 100)}
            <span className="text-lg opacity-70">/100</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mt-1 opacity-80">Risk Score</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Detected Signals</h3>
        </div>

        {hasSignals ? (
          <div className="divide-y divide-gray-100">
            {fraudSignals.map((signal, i) => (
              <div
                key={i}
                className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full ${
                    signal.severity === 'high'
                      ? 'bg-red-500'
                      : signal.severity === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                  }`}
                ></div>
                <div>
                  <p className="font-medium text-gray-900">{signal.description}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Severity: <span className="capitalize font-medium">{signal.severity}</span>
                  </p>
                </div>
                <span className="ml-auto text-xs text-gray-400 font-medium">
                  {new Date(signal.detectedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Clean Record</p>
            <p className="text-sm text-gray-400 mt-1">
              This customer has no recorded fraud or risk signals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
