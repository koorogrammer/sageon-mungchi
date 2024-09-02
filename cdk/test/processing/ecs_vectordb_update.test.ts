import * as cdk from 'aws-cdk-lib';
import { Match } from 'aws-cdk-lib/assertions';
import { Template } from 'aws-cdk-lib/assertions';
import { VpcStack } from '../../stacks/common/vpc';
import { VectorDBUpdateLambdaStack } from '../../stacks/processing/ecs_vectordb_update';

describe('VectorDBUpdateLambdaStack Test', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const vpcStack = new VpcStack(app, 'VpcStack');
        const stack = new VectorDBUpdateLambdaStack(vpcStack.vpc, 'VectorDBUpdateLambdaStack', {
            vpc: vpcStack.vpc,
            loadBalancerDns: 'loadBalancerDns'
        });

        template = Template.fromStack(stack);
    });

    it('has iam policy', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([{
                    Action: [
                        "ecs:DescribeServices",
                        "ecs:ListTasks",
                        "ecs:DescribeTasks",
                        "ecs:RunTask"
                    ],
                    Effect: 'Allow',
                    Resource: "*"
                }])
            }
        });
    });

    it('has proper network setting', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupEgress: [{
                CidrIp: '0.0.0.0/0'
            }]
        })
    });

    it('has Lambda function resource', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    ECS_API_URL: 'http://loadBalancerDns/v1/vectordb/'
                }
            }
        });
    });
});