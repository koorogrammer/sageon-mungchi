import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { join } from 'path';

interface VpcStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    loadBalancerDns: string;
}

export class VectorDBUpdateLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: VpcStackProps) {
        super(scope, id, props);

        // Lambda role 생성
        const lambdaRole = new iam.Role(this, 'VectorDBUpdateLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        // lambda layer
        const requestsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'RequestsLayer', 'arn:aws:lambda:ap-northeast-2:770693421928:layer:Klayers-py310-requests:1');

        // Lambda function 생성
        const lambdaFunction = new lambda.DockerImageFunction(this, 'VectorDBUpdateLambdaFunction', {
            code: lambda.DockerImageCode.fromImageAsset(join(__dirname, '../../../processing/vectordb-update')),
            timeout: cdk.Duration.minutes(5),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            environment: {
                'ECS_API_URL': `http://${props.loadBalancerDns}/v1/vectordb/`
            },
        });

        // event bridge rule 생성
        const rule = new events.Rule(this, 'VectorDBUpdateRule', {
            eventPattern: {
                source: ['aws.s3'],
                detailType: ['Object Created'],
                detail: {
                    bucket: {
                        name: ['sageon-mungchi-service']
                      },
                      object: {
                        key: [{ prefix: 'vector_db/faiss/' }] 
                      }
                },
              },
        });
        rule.addTarget(new targets.LambdaFunction(lambdaFunction));

        // Lambda의 ECS 및 네트워크 인터페이스 접속을 위한 권한 부여
        lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
              'ecs:DescribeServices',
              'ecs:ListTasks',
              'ecs:DescribeTasks',
              'ecs:RunTask',
            ],
            resources: ['*'],
          }));
          lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ec2:DescribeNetworkInterfaces', 'ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface', 'ec2:DescribeInstances'],
            resources: ['*'],
          }));
    }
}