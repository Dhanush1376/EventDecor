import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function EmailSmtpPanel({
  testRecipientEmail,
  setTestRecipientEmail,
  handleSmtpTest,
  testingSmtp,
  smtpTestResult,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
          SMTP Configurations Check
        </h3>
        <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1.5 font-medium leading-relaxed">
          Inspect whether the mandatory environment variables for transactional mailing are
          correctly loaded on this platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              SMTP Host
            </span>
            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
              smtp.gmail.com
            </span>
          </div>
          <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              SMTP Port
            </span>
            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
              587
            </span>
          </div>
          <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              Transporter SSL Bypass
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[var(--admin-success-light)] text-[var(--admin-success)]">
              rejectUnauthorized: false
            </span>
          </div>
          <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              Encryption Layer
            </span>
            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
              STARTTLS
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            Run Connection Verification
          </h3>
          <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1.5 font-medium leading-relaxed">
            Send a premium luxury test email to verify correct SMTP handshake, domain signing
            (SPF/DKIM/DMARC), and server socket connectivity.
          </p>
        </div>

        <form onSubmit={handleSmtpTest} className="space-y-4">
          <div className="space-y-2">
            <label className="admin-label">Recipient Test Email Address</label>
            <div className="flex gap-3">
              <input
                type="email"
                required
                placeholder="e.g. admin@siriartsandcrafts.com"
                value={testRecipientEmail}
                onChange={(e) => setTestRecipientEmail(e.target.value)}
                className="admin-input flex-1"
              />
              <button type="submit" disabled={testingSmtp} className="admin-btn h-11 shrink-0 px-6">
                {testingSmtp ? (
                  'Verifying...'
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    Verify Transporter
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {smtpTestResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-[var(--admin-radius-lg)] border p-5 mt-5 ${
                smtpTestResult.success
                  ? 'bg-[var(--admin-success-light)] border-[#bbf7d0]'
                  : 'bg-[#fff1f2] border-[#fecdd3]'
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`material-symbols-outlined text-[24px] ${
                    smtpTestResult.success ? 'text-[#16a34a]' : 'text-[#e11d48]'
                  }`}
                >
                  {smtpTestResult.success ? 'check_circle' : 'error'}
                </span>
                <div className="space-y-3 w-full">
                  <div>
                    <h4
                      className={`text-[14px] font-bold ${smtpTestResult.success ? 'text-[#166534]' : 'text-[#9f1239]'}`}
                    >
                      {smtpTestResult.success ? 'Test email sent' : 'SMTP Connection Failed'}
                    </h4>
                    <p
                      className={`text-[12px] font-medium mt-1 ${smtpTestResult.success ? 'text-[#15803d]' : 'text-[#be123c]'}`}
                    >
                      {smtpTestResult.message}
                    </p>
                  </div>

                  {!smtpTestResult.success && smtpTestResult.errorMessage && (
                    <div className="bg-[#ffe4e6] border border-[#fecdd3] rounded-[var(--admin-radius-md)] p-4 font-mono text-[11px] leading-relaxed break-all text-[#9f1239]">
                      <strong className="block mb-1">Diagnostic Stack:</strong>{' '}
                      {smtpTestResult.errorMessage}
                    </div>
                  )}

                  {smtpTestResult.success && smtpTestResult.details && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#bbf7d0] text-[12px] text-[#15803d]">
                      <div>
                        <strong>Message ID:</strong>{' '}
                        <span className="font-mono text-[11px] break-all ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                          {smtpTestResult.messageId}
                        </span>
                      </div>
                      <div>
                        <strong>SMTP Account:</strong>{' '}
                        <span className="font-mono text-[11px] ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                          {smtpTestResult.details.user}
                        </span>
                      </div>
                      <div>
                        <strong>Target Host:</strong>{' '}
                        <span className="font-mono text-[11px] ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                          {smtpTestResult.details.host}:{smtpTestResult.details.port}
                        </span>
                      </div>
                      <div>
                        <strong>Recipient:</strong>{' '}
                        <span className="font-mono text-[11px] ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                          {smtpTestResult.details.recipient}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
