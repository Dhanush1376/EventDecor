# Deployment & CI/CD Pipeline

EventDecor is designed to be deployed as a set of scalable, stateless containers.

## 1. Infrastructure Architecture

For production, the recommended deployment topology is:

- **Frontend**: Deployed to a CDN (Vercel, Netlify, or AWS CloudFront/S3).
- **Backend API**: Deployed as Docker containers via AWS ECS, Google Cloud Run, or Kubernetes.
- **Background Workers**: A separate Docker container running purely `workerIndex.ts` to process queues independently from web traffic.
- **MongoDB**: Managed MongoDB Atlas Cluster.
- **Redis**: Managed Redis instance (AWS ElastiCache, Upstash).

## 2. CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automates validation.

### On Pull Request

Whenever a PR is opened against `main`:

1. **Linting**: Runs ESLint (`npm run lint`).
2. **Type Checking**: Runs TypeScript compiler (`npx tsc --noEmit`).
3. **Tests**: Runs Jest test suites.
4. If any step fails, the PR is blocked from merging.

### On Merge to Main (Continuous Deployment)

_Note: Depending on the hosting provider, this step might be managed by the provider (e.g., Vercel automatically deploys the frontend)._
For the backend:

1. Docker image is built.
2. Image is pushed to a container registry (ECR, DockerHub).
3. The deployment platform is triggered to pull the new image and perform a rolling update.

## 3. Production Environment Variables

In production, ensure you override the local defaults:

- `NODE_ENV=production`
- `CORS_ORIGIN=https://eventdecor.com`
- `PORT=80` (or injected by the platform)
- `LOG_LEVEL=info` or `error` (to prevent verbose debugging logs)

## 4. Release Checklist

Before tagging a major release:

- Ensure `swagger.yaml` is up-to-date with the latest API changes.
- Ensure all automated tests pass.
- Verify that there are no critical vulnerability alerts (`npm audit`).
