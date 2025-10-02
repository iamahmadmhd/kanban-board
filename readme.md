# Kanban Board

Minimal Kanban board application. Infrastructure as code with AWS CDK and a Next.js frontend.

## Quick summary

This repo implements a serverless Kanban application. The CDK stack provisions backend infrastructure. The frontend is a Next.js app that talks to the backend APIs.

## Repo structure

```
/ (root)
├─ cdk/        # AWS CDK app and stacks
├─ frontend/   # Frontend application (Next.js)
```

## Prerequisites

- Node.js (recommended v20+)
- AWS CLI configured with an AWS account and region
- AWS CDK (v2) installed

## Local development

### Frontend

1. `cd frontend`
2. `npm install` or `pnpm install` (follow project preference)
3. `npm run dev` (or `npm start`) — opens local dev server

### CDK (local testing)

1. `cd cdk`
2. `npm install`
3. Bootstrap if needed: `cdk bootstrap` (provide account/region)
4. Deploy: `cdk deploy --all` or specific stack name

## Common environment variables

## Tests

- Unit tests reference environment variables such as `TABLE_NAME`. Ensure env is set when running tests.

## Known issues and tips

- Tests can fail with `TABLE_NAME is required` when `.env` or test environment variables are not set.
- Local AWS emulators require consistent AWS credentials and endpoint usage.
- CDK deployments require valid `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION`. Set them in your shell or CI environment.

## Contact

Repository owner: `iamahmadmhd`.
