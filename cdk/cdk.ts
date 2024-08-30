#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { VectorDBSagemakerProcessingLambdaStack } from './stacks/processing/vectordb_sagemaker_processing';
import { VectorDBUpdateLambdaStack } from './stacks/processing/ecs_vectordb_update';

import { VpcStack } from './stacks/common/vpc';
import { EcsClusterStack } from './stacks/common/ecs-cluster';

import { EcsApiStack } from './stacks/api/api-ecs';
import { EcsViewStack } from './stacks/view/view-ecs';

const app = new cdk.App();

// processing 스택
new VectorDBSagemakerProcessingLambdaStack(app, 'VectorDBSagemakerProcessingLambdaStack');

// 공통 스택
const vpcStack = new VpcStack(app, 'VpcStack');
const ecsClusterStack = new EcsClusterStack(app, 'SageonMungchiEcsClusterStack', { vpc: vpcStack.vpc });

// API 서비스 스택
const ecsApiStack = new EcsApiStack(app, 'SageonMungchiApiEcsStack', { vpc: vpcStack.vpc, cluster: ecsClusterStack.cluster });
new VectorDBUpdateLambdaStack(app, 'VectorDBUpdateLambdaStack', { vpc: vpcStack.vpc, loadBalancerDns: ecsApiStack.loadBalancerDns });

// View 서비스 스택
// new EcsViewStack(app, 'SageonMungchiViewEcsStack', { vpc: vpcStack.vpc, cluster: ecsClusterStack.cluster });