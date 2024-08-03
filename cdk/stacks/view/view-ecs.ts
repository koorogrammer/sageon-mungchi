import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationTargetGroup, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as path from 'path';

interface VpcStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
}

export class EcsViewStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: VpcStackProps) {
        super(scope, id, props);

        // Docker Image 등록
        const currentDir = __dirname;
        const image = new DockerImageAsset(this, 'BalpumViewImage', {
            directory: path.resolve(currentDir, '../../../view'),
        });

        // ECS Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'BalpumViewTaskDef', {
            memoryLimitMiB: 8192, 
            cpu: 4096,
        });
        const containerImage = ecs.ContainerImage.fromDockerImageAsset(image);
        const container = taskDefinition.addContainer('BalpumViewContainer', {
            image: containerImage,
            logging: new ecs.AwsLogDriver({
                streamPrefix: 'BalpumViewContainer',
            }),
        });
        container.addPortMappings({
            containerPort: 80,
            protocol: ecs.Protocol.TCP,
        });

        // Security Group 설정
        const securityGroup = new ec2.SecurityGroup(this, 'BalpumViewSecurityGroup', {
            vpc: props.vpc,
            allowAllOutbound: true,
        });

        // ECS Service 생성
        const service = new ecs.FargateService(this, 'BalpumViewService', {
            cluster: props.cluster,
            taskDefinition: taskDefinition,
            desiredCount: 1,
            assignPublicIp: true,
            vpcSubnets: {
                subnets: props.vpc.publicSubnets,
            },
        });

        // ALB 생성
        const lb = new ApplicationLoadBalancer(this, 'BalpumViewLB', {
            vpc: props.vpc,
            internetFacing: true,
        });
        const targetGroup = new ApplicationTargetGroup(this, 'BalpumViewTargetGroup', {
            vpc: props.vpc,
            port: 80,
            protocol: ApplicationProtocol.HTTP,
            targets: [service],
            healthCheck: {
                path: "/",
                interval: cdk.Duration.seconds(30),
            }
        });
        lb.addListener('BalpumViewListener', {
            port: 80,
            open: true,
            defaultTargetGroups: [targetGroup]
        });

        // Serverless를 위한 Auto Scaling 
        const scalableTarget = service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 2,
        });
        scalableTarget.scaleOnRequestCount('BalpumViewRequestScaling', {
            requestsPerTarget: 1000,
            targetGroup: targetGroup,
            scaleOutCooldown: cdk.Duration.seconds(60),
        });
    }
}
