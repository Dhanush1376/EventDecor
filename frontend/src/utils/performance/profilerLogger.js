// Lightweight profiler to collect baseline metrics without relying on React DevTools Extension UI

const metrics = {};

export const logRenderMetrics = (
  id,
  phase,
  actualDuration,
  baseDuration,
  _startTime,
  _commitTime,
) => {
  if (!metrics[id]) {
    metrics[id] = {
      renderCount: 0,
      totalActualDuration: 0,
      maxActualDuration: 0,
      phases: { mount: 0, update: 0 },
    };
  }

  const stat = metrics[id];
  stat.renderCount += 1;
  stat.totalActualDuration += actualDuration;
  if (actualDuration > stat.maxActualDuration) {
    stat.maxActualDuration = actualDuration;
  }
  stat.phases[phase] += 1;

  // Log to console if it's a slow render or every 10th render to avoid spamming
  if (actualDuration > 10 || stat.renderCount % 5 === 0) {
    // Disabled console table to prevent console noise
    /*
    console.table({
      Component: id,
      Phase: phase,
      'Duration (ms)': actualDuration.toFixed(2),
      'Base Duration (ms)': baseDuration.toFixed(2),
      'Total Renders': stat.renderCount,
      'Avg Duration (ms)': (stat.totalActualDuration / stat.renderCount).toFixed(2),
    });
    */
  }
};

// Expose metrics to window for easy programmatic extraction via Playwright/Console
window.__GET_PROFILER_METRICS = () => metrics;
