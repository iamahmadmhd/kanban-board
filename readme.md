# Kanban Board

A serverless Kanban board application built with AWS CDK, DynamoDB, API Gateway, Lambda, Cognito, and Next.js.

## Architecture

This project consists of two main components:

- **Backend (CDK)**: AWS serverless infrastructure including DynamoDB, Lambda functions, API Gateway with Cognito authentication
- **Frontend (Next.js)**: Modern web application with server-side rendering and OAuth/OIDC authentication flow

## Features

- 🔐 **AWS Cognito Authentication** - Secure user authentication with OAuth 2.0 / OIDC
- 🗃️ **DynamoDB Single-Table Design** - Efficient data modeling for boards, lists, and cards
- ⚡ **Serverless Architecture** - Lambda functions with Node.js 22.x runtime
- 🎨 **Modern UI** - Next.js 15 with React 19, Tailwind CSS, and shadcn/ui components
- 🔄 **Redis Sessions** - Server-side session management with Redis
- 🚀 **Infrastructure as Code** - Complete AWS infrastructure defined with CDK

## Repository Structure

```text
├── cdk/                    # AWS CDK infrastructure
│   ├── bin/               # CDK app entry point
│   ├── lib/
│   │   ├── constructs/    # Reusable CDK constructs
│   │   │   ├── api.ts     # API Gateway & Lambda setup
│   │   │   ├── cognito.ts # Cognito User Pool configuration
│   │   │   └── dynamodb.ts # DynamoDB table definition
│   │   ├── lambda/        # Lambda function handlers
│   │   │   ├── boards/    # Board CRUD operations
│   │   │   ├── lists/     # List CRUD operations
│   │   │   └── cards/     # Card CRUD operations
│   │   ├── shared/        # Shared utilities and types
│   │   │   ├── types/     # TypeScript type definitions
│   │   │   └── utils/     # Database, API, and auth utilities
│   │   └── kanban-stack.ts # Main CDK stack
│   └── package.json
│
└── frontend/              # Next.js frontend application
    ├── src/
    │   ├── app/          # Next.js app directory
    │   │   ├── api/      # API routes (auth callbacks, session)
    │   │   └── page.tsx  # Main page
    │   ├── components/   # React components
    │   ├── hooks/        # Custom React hooks
    │   └── lib/          # Utility libraries (auth, oauth, redis, session)
    └── package.json
```

## Prerequisites

- **Node.js** v20+ (recommended v22+)
- **AWS CLI** configured with credentials
- **AWS CDK** v2 installed globally: `npm install -g aws-cdk`
- **Redis** instance (for session storage)
- **npm** for package management

## Environment Setup

### CDK Environment Variables

Create `cdk/.env` based on `cdk/.env.example`:

```bash
# AWS Configuration
CDK_DEFAULT_ACCOUNT=your-aws-account-id
CDK_DEFAULT_REGION=your-aws-region
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```bash
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cognito Configuration (from CDK outputs)
NEXT_PUBLIC_COGNITO_DOMAIN=https://kanban-{account}.auth.{region}.amazoncognito.com
NEXT_PUBLIC_COGNITO_ISSUER_URL=https://cognito-idp.{region}.amazonaws.com/{userPoolId}
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id

# OAuth Scopes
NEXT_PUBLIC_SCOPE=openid profile email

# Redis URL
REDIS_URL=redis://localhost:6379
```

## Deployment

### 1. Deploy Backend Infrastructure

```bash
cd cdk

# Install dependencies
npm install

# Bootstrap CDK (first time only)
npm run cdk:bootstrap

# Deploy the stack
npm run cdk:deploy

# Or with auto-approval
npx cdk deploy --require-approval never
```

**Important CDK Outputs**: After deployment, note these outputs for frontend configuration:

- `UserPoolId`
- `UserPoolClientId`
- `CognitoHostedUiUrl`
- `ApiUrl`
- `Region`

### 2. Configure SSM Parameter (Frontend URL)

Before deploying, create an SSM parameter for the frontend URL:

```bash
aws ssm put-parameter \
  --name "/kanban/frontend-url" \
  --value "https://your-frontend-domain.com" \
  --type "String" \
  --region your-region
```

For local development:

```bash
aws ssm put-parameter \
  --name "/kanban/frontend-url" \
  --value "http://localhost:3000" \
  --type "String" \
  --region your-region
```

### 3. Start Redis (Local Development)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis locally
macOS: brew install redis && redis-server
Ubuntu: sudo apt install redis-server
```

### 4. Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Local Development Workflow

### Backend (SAM Local)

Test Lambda functions locally with AWS SAM:

```bash
cd cdk

# Synthesize CloudFormation template
npm run cdk:synth

# Start local API
npm run dev:api
```

This starts API Gateway locally on `http://localhost:3001`.

### Frontend Development

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Running Tests

```bash
cd cdk
npm test

# Watch mode
npm run test:watch
```

## API Endpoints

All endpoints require Cognito authentication via `Authorization: Bearer <token>` header.

### Boards

- `GET /boards` - List all boards for authenticated user
- `POST /boards` - Create a new board
- `GET /boards/{boardId}` - Get board details
- `PUT /boards/{boardId}` - Update board
- `DELETE /boards/{boardId}` - Delete board

### Lists

- `GET /boards/{boardId}/lists` - Get all lists in a board
- `POST /boards/{boardId}/lists` - Create a new list
- `PUT /boards/{boardId}/lists/{listId}` - Update list
- `DELETE /boards/{boardId}/lists/{listId}` - Delete list

### Cards

- `GET /boards/{boardId}/lists/{listId}/cards` - Get all cards in a list
- `POST /boards/{boardId}/lists/{listId}/cards` - Create a new card
- `PUT /boards/{boardId}/lists/{listId}/cards/{cardId}` - Update card
- `DELETE /boards/{boardId}/lists/{listId}/cards/{cardId}` - Delete card

## Database Schema (DynamoDB)

Single-table design with the following access patterns:

```text
PK                  SK                  GSI1PK              GSI1SK
USER#{userId}       BOARD#{boardId}     USER#{userId}       BOARD#{boardId}
BOARD#{boardId}     LIST#{listId}       BOARD#{boardId}     LIST#{listId}
LIST#{listId}       CARD#{cardId}       LIST#{listId}       CARD#{cardId}
```

## Authentication Flow

1. User clicks "Login" → Redirects to `/api/auth/login`
2. Server generates PKCE parameters, stores in Redis session
3. Redirects to Cognito Hosted UI
4. User authenticates with Cognito
5. Cognito redirects back to `/api/auth/callback` with authorization code
6. Server exchanges code for tokens, verifies ID token
7. Stores tokens and user info in Redis session
8. Sets httpOnly session cookie
9. Redirects to dashboard

## Code Quality

### Linting

```bash
# CDK
cd cdk
npm run lint

# Frontend
cd frontend
npm run lint
```

### Formatting

```bash
# CDK
cd cdk
npm run prettier:write

# Frontend
cd frontend
npm run prettier:write
```

## Cleanup

To avoid AWS charges, destroy the stack when done:

```bash
cd cdk
npm run cdk:destroy
```

## Tech Stack

### Backend

- **AWS CDK** v2 - Infrastructure as Code
- **AWS Lambda** (Node.js 22.x) - Serverless compute
- **API Gateway** - REST API
- **DynamoDB** - NoSQL database
- **Cognito** - User authentication
- **TypeScript** - Type-safe development
- **Zod** - Runtime validation

### Frontend

- **Next.js 15** - React framework
- **React 19** - UI library
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - Component library
- **Redis** - Session storage
- **jose** - JWT verification
- **openid-client** - OAuth/OIDC client

## Known Issues & Tips

- **Session Cookie Issues**: Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain
- **Cognito Redirect URLs**: Must match exactly with configured callback URLs in CDK
- **Redis Connection**: Frontend requires Redis for session management
- **CDK Bootstrap**: Run once per account/region: `cdk bootstrap`
- **CORS**: API Gateway is configured with permissive CORS for development

## License

This project is licensed under the MIT License.

## Contact

Repository Owner: [@iamahmadmhd](https://github.com/iamahmadmhd)

---

Built with ❤️ using AWS CDK and Next.js