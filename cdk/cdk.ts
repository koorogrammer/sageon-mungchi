#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { VpcStack } from './stacks/common/vpc';
import { EcsClusterStack } from './stacks/common/ecs-cluster';

import { EcsApiStack } from './stacks/api/api-ecs';
import { EcsViewStack } from './stacks/view/view-ecs';

const app = new cdk.App();

// 공통 스택
const vpcStack = new VpcStack(app, 'VpcStack');
const ecsClusterStack = new EcsClusterStack(app, 'BalpumEcsClusterStack', { vpc: vpcStack.vpc });

// API 서비스 스택
new EcsApiStack(app, 'BalpumApiEcsStack', { vpc: vpcStack.vpc, cluster: ecsClusterStack.cluster });

// View 서비스 스택
new EcsViewStack(app, 'BalpumViewEcsStack', { vpc: vpcStack.vpc, cluster: ecsClusterStack.cluster });