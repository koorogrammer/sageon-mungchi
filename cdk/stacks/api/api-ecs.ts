import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationTargetGroup, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';

interface VpcStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
}

export class EcsApiStack extends cdk.Stack {
    public readonly loadBalancerDns: string;

    constructor(scope: Construct, id: string, props: VpcStackProps) {
        super(scope, id, props);

        // Docker Image 등록
        const currentDir = __dirname;
        const image = new DockerImageAsset(this, 'SageonMungchiApiImage', {
            directory: path.resolve(currentDir, '../../../api'),
        });

        // 보안 그룹 설정
        const lbsecurityGroup = new ec2.SecurityGroup(this, 'SageonMungchiApiSecurityGroup', {
            vpc: props.vpc,
            allowAllOutbound: true,
        });
        lbsecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

        const ecsSecurityGroup = new ec2.SecurityGroup(this, 'SageonMungchiApiEcsSecurityGroup', {
            vpc: props.vpc,
            allowAllOutbound: true,
        });
        ecsSecurityGroup.addIngressRule(lbsecurityGroup, ec2.Port.tcp(80));

        // ECS Task Role 설정
        const taskRole = new iam.Role(this, 'SageonMungchiApiTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'));

        // ECS Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'SageonMungchiApiTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            taskRole: taskRole,
        });
        const containerImage = ecs.ContainerImage.fromDockerImageAsset(image);
        const container = taskDefinition.addContainer('SageonMungchiApiContainer', {
            image: containerImage,
            logging: new ecs.AwsLogDriver({
                streamPrefix: 'SageonMungchiApiContainer',
            }),
        });
        container.addPortMappings({
            containerPort: 80,
            protocol: ecs.Protocol.TCP,
        });

        // ECS Service 생성
        const service = new ecs.FargateService(this, 'SageonMungchiApiService', {
            cluster: props.cluster,
            taskDefinition: taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            vpcSubnets: {
                subnets: props.vpc.privateSubnets,
            },
            securityGroups: [ecsSecurityGroup],
        });

        // ALB 생성
        const lb = new ApplicationLoadBalancer(this, 'SageonMungchiApiLB', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: lbsecurityGroup,
        });
        const targetGroup = new ApplicationTargetGroup(this, 'SageonMungchiApiTargetGroup', {
            vpc: props.vpc,
            port: 80,
            protocol: ApplicationProtocol.HTTP,
            targets: [service],
            healthCheck: {
                path: "/",
                interval: cdk.Duration.seconds(30),
            }
        });
        lb.addListener('SageonMungchiApiListener', {
            port: 80,
            open: true,
            defaultTargetGroups: [targetGroup]
        });

        // Serverless를 위한 Auto Scaling 
        const scalableTarget = service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 2,
        });
        scalableTarget.scaleOnRequestCount('SageonMungchiApiRequestScaling', {
            requestsPerTarget: 1000,
            targetGroup: targetGroup,
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        // loadBalancer DNS
        new cdk.CfnOutput(this, 'SageonMungchiApiLoadBalancerDNS', {
            value: lb.loadBalancerDnsName,
        });
        this.loadBalancerDns = lb.loadBalancerDnsName;
    }
}
