import { MetadataGrid, CTAButton } from '../../components';

export const SystemErrorAlertTemplate = (data: any) => {
  const { errorType, errorMessage, stackTrace, environment, requestContext, severity } = data;

  const severityColor = severity === 'critical' ? '#ef4444' : '#f59e0b';
  const badgeColor = severity === 'critical' ? '#fee2e2' : '#fef3c7';

  const content = `
    <div style="margin-bottom: 24px;">
      <div style="display: inline-block; background: ${badgeColor}; color: ${severityColor}; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; font-family: sans-serif; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
        ${severity} ALERT
      </div>
      <h2 style="margin: 0 0 8px 0; color: #111827; font-family: sans-serif;">System Failure: ${errorType}</h2>
      <p style="margin: 0; color: #4b5563; font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 6px; border-left: 4px solid ${severityColor};">
        ${errorMessage}
      </p>
    </div>

    ${MetadataGrid({
      title: 'Context',
      data: {
        Environment: environment || 'production',
        Timestamp: new Date().toISOString(),
        'Request ID': requestContext?.id || 'N/A',
        'User ID': requestContext?.userId || 'N/A',
        Endpoint: requestContext?.url || 'Background Job',
      },
    })}

    <h3 style="margin: 32px 0 12px 0; color: #111827; font-family: sans-serif; font-size: 16px;">Stack Trace</h3>
    <pre style="background: #18181b; color: #f4f4f5; padding: 16px; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${stackTrace || 'No stack trace available.'}</pre>

    <div style="margin-top: 32px; display: flex; gap: 12px;">
      ${CTAButton('View Logs', `https://your-logging-provider.com/logs?query=${requestContext?.id}`, 'primary')}
      ${CTAButton('Acknowledge in Sentry', `https://sentry.io`, 'secondary')}
    </div>
  `;

  return {
    html: content,
    subject: `System Error [${severity.toUpperCase()}]: ${errorType} in ${environment || 'production'}`,
    preheader: errorMessage.substring(0, 100),
  };
};
