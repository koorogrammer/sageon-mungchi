import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VpcStack } from '../../stacks/common/vpc';
import { EcsClusterStack } from '../../stacks/common/ecs-cluster';
import { EcsApiStack } from '../../stacks/api/api-ecs';

describe('EcsCluster Test', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const vpcStack = new VpcStack(app, 'VpcStack');
        const clusterStack = new EcsClusterStack(app, 'ecsClusterStack', { vpc: vpcStack.vpc });
        const apiStack = new EcsApiStack(app, 'ecsApiStack', { vpc: vpcStack.vpc, cluster: clusterStack.cluster });

        template = Template.fromStack(apiStack);
    });

    it('has ecs service resource', () => {
        template.hasResourceProperties('AWS::ECS::Service', {});
    });
    
    it('has ecs task definition resource', () => {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [{
                PortMappings: [{
                    ContainerPort: 80,
                    Protocol: 'tcp',
                }],
            }],
        });
    });

    it('has application load balancer resource', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {});
    });

    it('has application load balancer listner resource', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
            Port: 80,
            Protocol: 'HTTP',
        });
    });

    it('has application load balancer target group resource', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
            Port: 80,
            Protocol: 'HTTP',
            HealthCheckPath: '/',
        });
    });

    it('has security group resource', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupIngress: [{
                FromPort: 80,
                ToPort: 80,
            }]
        });
    });

    it('has ecs service log group resource', () => {
        template.hasResourceProperties('AWS::Logs::LogGroup', {});
    });

    it('it has proper role policy', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            ManagedPolicyArns: [
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
                },
            ],
    })});
});