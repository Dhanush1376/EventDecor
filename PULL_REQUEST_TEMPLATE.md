## Description

Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context.

Fixes # (issue)

## Type of change

Please delete options that are not relevant.

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update
- [ ] Refactoring / Tech Debt Cleanup

## Architecture & Code Quality Checklist

- [ ] My code follows the domain-driven controller/routes structure.
- [ ] I have not introduced any N+1 queries.
- [ ] Read-only database operations use `.lean()`.
- [ ] Controllers are thin orchestrators; complex logic is in `services/`.
- [ ] I have not introduced any circular dependencies.

## Testing Checklist

- [ ] I have added/updated integration tests that prove my fix is effective or that my feature works.
- [ ] All new and existing tests passed (`npm run test`).
- [ ] Mocks are only used for external boundaries (Redis, Razorpay, Cloudinary).

## Deployment & Documentation

- [ ] I have updated the documentation accordingly (if applicable).
- [ ] I have verified this works locally in a Docker/Dev environment.
- [ ] Any new environment variables have been added to `.env.example`.
