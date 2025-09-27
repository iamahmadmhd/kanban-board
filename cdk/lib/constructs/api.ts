import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface KanbanApiProps {
    table: dynamodb.Table;
    userPool: cognito.UserPool;
    apiName?: string;
}

export class KanbanApi extends Construct {
    public readonly api: apigateway.RestApi;
    public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;

    constructor(scope: Construct, id: string, props: KanbanApiProps) {
        super(scope, id);

        // JWT Authorizer for Cognito
        this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            cognitoUserPools: [props.userPool],
            identitySource: 'method.request.header.Authorization',
        });

        // REST API Gateway
        this.api = new apigateway.RestApi(this, 'Api', {
            restApiName: props.apiName || 'kanban-api',
            description: 'Kanban Board API',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization'],
            },
            deployOptions: {
                stageName: 'prod',
                tracingEnabled: true,
            },
        });

        // Common Lambda environment variables
        const commonEnv = {
            TABLE_NAME: props.table.tableName,
            LOCAL_AUTH: 'false',
        };

        // Lambda execution role with DynamoDB permissions
        const lambdaRole = new iam.Role(this, 'LambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
        });

        // Grant DynamoDB permissions to Lambda role
        props.table.grantReadWriteData(lambdaRole);

        // Board Lambda functions
        const boardsLambda = new lambdaNodejs.NodejsFunction(this, 'BoardsFunction', {
            entry: path.join(__dirname, '../lambda/boards/handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_18_X,
            environment: commonEnv,
            role: lambdaRole,
            bundling: {
                minify: true,
                sourceMap: false,
                target: 'es2022',
            },
        });

        // Lists Lambda function
        const listsLambda = new lambdaNodejs.NodejsFunction(this, 'ListsFunction', {
            entry: path.join(__dirname, '../lambda/lists/handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_18_X,
            environment: commonEnv,
            role: lambdaRole,
            bundling: {
                minify: true,
                sourceMap: false,
                target: 'es2022',
            },
        });

        // Cards Lambda function
        const cardsLambda = new lambdaNodejs.NodejsFunction(this, 'CardsFunction', {
            entry: path.join(__dirname, '../lambda/cards/handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_18_X,
            environment: commonEnv,
            role: lambdaRole,
            bundling: {
                minify: true,
                sourceMap: false,
                target: 'es2022',
            },
        });

        // API Routes
        this.createBoardRoutes(boardsLambda);
        this.createListRoutes(listsLambda);
        this.createCardRoutes(cardsLambda);
    }

    private createBoardRoutes(lambda: lambdaNodejs.NodejsFunction): void {
        const boards = this.api.root.addResource('boards');

        // GET /boards - List all boards for user
        boards.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // POST /boards - Create new board
        boards.addMethod('POST', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // Board-specific routes
        const boardById = boards.addResource('{boardId}');

        // GET /boards/{boardId} - Get specific board
        boardById.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // PUT /boards/{boardId} - Update board
        boardById.addMethod('PUT', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // DELETE /boards/{boardId} - Delete board
        boardById.addMethod('DELETE', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });
    }

    private createListRoutes(lambda: lambdaNodejs.NodejsFunction): void {
        const boards = this.api.root.getResource('boards') || this.api.root.addResource('boards');
        const boardById = boards.getResource('{boardId}') || boards.addResource('{boardId}');
        const lists = boardById.addResource('lists');

        // GET /boards/{boardId}/lists - Get all lists for board
        lists.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // POST /boards/{boardId}/lists - Create new list
        lists.addMethod('POST', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // List-specific routes
        const listById = lists.addResource('{listId}');

        // PUT /boards/{boardId}/lists/{listId} - Update list
        listById.addMethod('PUT', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // DELETE /boards/{boardId}/lists/{listId} - Delete list
        listById.addMethod('DELETE', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });
    }

    private createCardRoutes(lambda: lambdaNodejs.NodejsFunction): void {
        const boards = this.api.root.getResource('boards') || this.api.root.addResource('boards');
        const boardById = boards.getResource('{boardId}') || boards.addResource('{boardId}');
        const lists = boardById.getResource('lists') || boardById.addResource('lists');
        const listById = lists.getResource('{listId}') || lists.addResource('{listId}');
        const cards = listById.addResource('cards');

        // GET /boards/{boardId}/lists/{listId}/cards - Get all cards for list
        cards.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // POST /boards/{boardId}/lists/{listId}/cards - Create new card
        cards.addMethod('POST', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // Card-specific routes
        const cardById = cards.addResource('{cardId}');

        // PUT /boards/{boardId}/lists/{listId}/cards/{cardId} - Update card
        cardById.addMethod('PUT', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });

        // DELETE /boards/{boardId}/lists/{listId}/cards/{cardId} - Delete card
        cardById.addMethod('DELETE', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
        });
    }
}
