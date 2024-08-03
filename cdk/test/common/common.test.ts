import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VpcStack } from '../../stacks/common/vpc';
import { EcsClusterStack } from '../../stacks/common/ecs-cluster';

describe('EcsCluster Test', () => {
    let vpcTemplate: Template;
    let ecsClusterTemplate: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const vpcStack = new VpcStack(app, 'VpcStack');
        const clusterStack = new EcsClusterStack(app, 'ecsClusterStack', { vpc: vpcStack.vpc });

        vpcTemplate = Template.fromStack(vpcStack);
        ecsClusterTemplate = Template.fromStack(clusterStack);
    });

    it('has Vpc resource', () => {
        vpcTemplate.hasResourceProperties('AWS::EC2::VPC', {});
      });

    it('has ECS Cluster resource', () => {
        ecsClusterTemplate.hasResourceProperties('AWS::ECS::Cluster', {});
    });
});