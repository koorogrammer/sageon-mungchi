import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

interface VpcStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
}

export class EcsClusterStack extends cdk.Stack {
    public readonly cluster: ecs.Cluster;

    constructor(scope: Construct, id: string, props: VpcStackProps) {
        super(scope, id, props);

        // ECS Cluster
        this.cluster = new ecs.Cluster(this, 'SageonMungchiCluster', { vpc: props.vpc });

        new cdk.CfnOutput(this, 'ClusterName', { value: this.cluster.clusterName });
        new cdk.CfnOutput(this, 'ClusterArn', { value: this.cluster.clusterArn });
    }
}
