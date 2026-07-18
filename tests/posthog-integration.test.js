import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

describe('PostHog integration', () => {
  it('wraps the app with an environment-configured PostHog provider', () => {
    const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
    const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    expect(packageJson.dependencies).toHaveProperty('posthog-js');
    expect(packageJson.dependencies).toHaveProperty('@posthog/react');
    expect(main).toContain('PostHogProvider');
    expect(main).toContain('PostHogErrorBoundary');
    expect(main).toContain('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN');
    expect(main).toContain('VITE_PUBLIC_POSTHOG_HOST');
    expect(envExample).toContain('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=');
    expect(envExample).toContain('VITE_PUBLIC_POSTHOG_HOST=');
  });
});
