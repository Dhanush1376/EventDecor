import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { Button } from '../Button';

function runAxe(container) {
  return new Promise((resolve, reject) => {
    axe.run(container, { rules: { region: { enabled: false } } }, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

describe('accessibility smoke (WCAG axe-core)', () => {
  it('Button has no serious/critical violations', async () => {
    const { container } = render(<Button>Continue</Button>);
    const results = await runAxe(container);
    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact)
    );
    expect(blocking).toEqual([]);
  });
});
