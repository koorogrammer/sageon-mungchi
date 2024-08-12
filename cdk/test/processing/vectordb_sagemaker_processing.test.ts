import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VectorDBSagemakerProcessingStack } from '../../stacks/processing/vectordb_sagemaker_processing';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

describe('VectorDBSagemakerProcessing Test', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new VectorDBSagemakerProcessingStack(app, 'VectorDBSagemakerProcessingStack');

        template = Template.fromStack(stack);
    });

    it('has SageMaker Processing Job Role resource', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            ManagedPolicyArns: [
                {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            { 'Ref': 'AWS::Partition' },
                            ':iam::aws:policy/AmazonSageMakerFullAccess'
                        ]
                    ]
                },
                {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            { 'Ref': 'AWS::Partition' },
                            ':iam::aws:policy/AmazonS3FullAccess'
                        ]
                    ]
                },
                {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            { 'Ref': 'AWS::Partition' },
                            ':iam::aws:policy/AmazonBedrockFullAccess'
                        ]
                    ]
                }
            ]
        });
    });    

    it('has Lambda Role resource', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            ManagedPolicyArns: [
                {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            { 'Ref': 'AWS::Partition' },
                            ':iam::aws:policy/AmazonSageMakerFullAccess'
                        ]
                    ]
                }
            ]
        });
    })

    it('has Lambda Function resource', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'lambda_function.lambda_handler',
            Timeout: 15
        });
    });

    it('has Event Rule resource', () => {
        template.hasResourceProperties('AWS::Events::Rule', {
            ScheduleExpression: 'cron(0 22 1 * ? *)'
        });
    });
});