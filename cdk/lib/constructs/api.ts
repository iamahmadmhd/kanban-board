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

        // Cognito User Pool Authorizer
        this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            cognitoUserPools: [props.userPool],
            identitySource: 'method.request.header.Authorization',
        });

        // REST API Gateway
        this.api = new apigateway.RestApi(this, 'Api', {
            restApiName: props.apiName,
            description: 'Kanban Board API with Cognito authentication',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization'],
                allowCredentials: true,
            },
            deployOptions: {
                stageName: 'v1',
                tracingEnabled: true,
            },
        });

        // Common Lambda environment variables
        const commonEnv = {
            TABLE_NAME: props.table.tableName,
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
            runtime: lambda.Runtime.NODEJS_22_X,
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
            runtime: lambda.Runtime.NODEJS_22_X,
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
            runtime: lambda.Runtime.NODEJS_22_X,
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

        boards.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        boards.addMethod('POST', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        const boardById = boards.addResource('{boardId}');

        boardById.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        boardById.addMethod('PUT', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        boardById.addMethod('DELETE', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
    }

    private createListRoutes(lambda: lambdaNodejs.NodejsFunction): void {
        const boards = this.api.root.getResource('boards') || this.api.root.addResource('boards');
        const boardById = boards.getResource('{boardId}') || boards.addResource('{boardId}');
        const lists = boardById.addResource('lists');

        lists.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        lists.addMethod('POST', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        const listById = lists.addResource('{listId}');

        listById.addMethod('PUT', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        listById.addMethod('DELETE', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
    }

    private createCardRoutes(lambda: lambdaNodejs.NodejsFunction): void {
        const boards = this.api.root.getResource('boards') || this.api.root.addResource('boards');
        const boardById = boards.getResource('{boardId}') || boards.addResource('{boardId}');
        const lists = boardById.getResource('lists') || boardById.addResource('lists');
        const listById = lists.getResource('{listId}') || lists.addResource('{listId}');
        const cards = listById.addResource('cards');

        cards.addMethod('GET', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        cards.addMethod('POST', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        const cardById = cards.addResource('{cardId}');

        cardById.addMethod('PUT', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        cardById.addMethod('DELETE', new apigateway.LambdaIntegration(lambda), {
            authorizer: this.authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
    }
}
