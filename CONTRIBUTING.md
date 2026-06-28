# Contributing to EventDecor

First off, thank you for considering contributing to EventDecor! It's people like you that make this project such a great enterprise application.

## 1. Local Development Setup

To get the project running locally, please refer to our [Local Development Guide](docs/guides/local-development.md).

## 2. Git Workflow

We use a feature-branch workflow. Please follow these steps for your contributions:

1. **Branch Naming**:
   - `feature/short-description` for new features
   - `fix/short-description` for bug fixes
   - `docs/short-description` for documentation updates
   - `chore/short-description` for routine tasks

2. **Commit Messages**:
   Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat: add new payment gateway`
   - `fix: resolve N+1 query in products`
   - `docs: update API documentation`

3. **Pull Requests**:
   - Push your branch to the remote repository.
   - Open a Pull Request against the `main` branch.
   - Fill out the provided Pull Request template completely.

## 3. Coding Standards

- **TypeScript**: Strict mode is enabled. Do not use `any`; use proper interfaces or `unknown`.
- **Linting & Formatting**: We use ESLint and Prettier. Ensure `npm run lint` passes before pushing.
- **Architecture**: Follow the domain-driven controller/routes structure. Refer to the [Folder Structure Guide](docs/engineering/folder-structure.md).
- **SRP Violations**: Controllers should remain thin orchestration layers. Heavy business logic belongs in `src/services/`.

## 4. Testing

- Write integration tests for all critical business flows.
- Ensure your changes do not break existing tests (`npm run test`).
- Mocks should only be used for external systems (e.g., Razorpay, Redis, Cloudinary).

## 5. Security & Performance

- Do not introduce N+1 queries. Use Mongoose `populate` effectively or batch queries.
- Read-only endpoints should use `.lean()` for performance.
- Validate all user input using schemas in the API layer.

Once your PR is submitted, a maintainer will review it. Thank you for your contribution!
