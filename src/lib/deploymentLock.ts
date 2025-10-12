/**
 * Deployment Lock System
 *
 * Prevents accidental deployments by requiring manual unlock.
 * Guards against "npm run build" in CI/CD pipelines.
 */

const LOCK_FILE_CHECK = import.meta.env.VITE_DEPLOYMENT_UNLOCKED === 'true';

export function checkDeploymentLock(): { locked: boolean; message?: string } {
  if (LOCK_FILE_CHECK) {
    return { locked: false };
  }

  return {
    locked: true,
    message: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  DEPLOYMENT LOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This build is locked to prevent accidental deployments.

To unlock:
  1. Add to your .env file:
     VITE_DEPLOYMENT_UNLOCKED=true

  2. Run build again:
     npm run build

Why? This safeguard prevents CI/CD from deploying
incomplete code during development sprints.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  };
}

export function assertDeploymentUnlocked(): void {
  const { locked, message } = checkDeploymentLock();

  if (locked) {
    console.error(message);
    throw new Error('DEPLOYMENT_LOCKED');
  }
}
