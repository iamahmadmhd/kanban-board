# Kanban Board CDK Infrastructure

## Build and deploy API

npm run build
npx cdk deploy --require-approval never

## Test API locally with SAM

npx cdk synth
sam local start-api --template-file cdk.out/KanbanStack.template.json

## Local development with DynamoDB Local

docker run -p 8000:8000 amazon/dynamodb-local
export LOCAL_DYNAMODB=true
export LOCAL_AUTH=true

## Test API endpoints

curl -H "X-Local-User: testuser" http://localhost:3000/boards
curl -H "X-Local-User: testuser" -X POST -d '{"title":"My Board"}' http://localhost:3000/boards