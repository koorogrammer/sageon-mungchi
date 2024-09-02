import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { join } from 'path';

export class VectorDBSagemakerProcessingLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Docker Image 등록
        const image = new  DockerImageAsset(this, 'VectorDBImage', {
            directory: join(__dirname, '../../../processing/law-case-vectordb-processing/processing'),
        });

        // SageMaker Processing Job Role 생성
        const role = new iam.Role(this, 'VectorDBSageMakerProcessingRole', {
            assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
        });
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'));

        // lambda role
        const lambdaRole = new iam.Role(this, 'VectorDBSageMakerProcessingLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));

        // lambda function 생성
        const lambdaFunction = new lambda.Function(this, 'VectorDBSagemakerProcessingFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'lambda_function.lambda_handler',
            code: lambda.Code.fromAsset(join(__dirname, '../../../processing/law-case-vectordb-processing/_lambda')),
            environment: {
                ECR_REPOSITORY_URI: image.imageUri, // ECR에 푸시된 Docker 이미지 URI
                ROLE_ARN: role.roleArn,
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(15),
        });

        // event rule 생성
        const rule = new events.Rule(this, 'VectorDBSagemakerProcessingRule', {
            schedule: events.Schedule.cron({ minute: '0', hour: '22', day: '1', month: '*', year: '*' }), // KST 오전 7시 (UTC 22시)
        });
        rule.addTarget(new targets.LambdaFunction(lambdaFunction));
    }
}