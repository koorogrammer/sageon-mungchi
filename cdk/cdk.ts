#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { VectorDBSagemakerProcessingStack } from './stacks/processing/vectordb_sagemaker_processing';

import { VpcStack } from './stacks/common/vpc';
import { EcsClusterStack } from './stacks/common/ecs-cluster';

import { EcsApiStack } from './stacks/api/api-ecs';
import { EcsViewStack } from './stacks/view/view-ecs';

const app = new cdk.App();

// processing 스택
new VectorDBSagemakerProcessingStack(app, 'VectorDBSagemakerProcessingStack');

// 공통 스택
const vpcStack = new VpcStack(app, 'VpcStack');
const ecsClusterStack = new EcsClusterStack(app, 'SageonMungchiEcsClusterStack', { vpc: vpcStack.vpc });

// API 서비스 스택
new EcsApiStack(app, 'SageonMungchiApiEcsStack', { vpc: vpcStack.vpc, cluster: ecsClusterStack.cluster });

// View 서비스 스택
new EcsViewStack(app, 'SageonMungchiViewEcsStack', { vpc: vpcStack.vpc, cluster: ecsClusterStack.cluster });