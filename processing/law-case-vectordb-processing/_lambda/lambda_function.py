import boto3
import os
from datetime import datetime


def lambda_handler(event, context):
    sm = boto3.client("sagemaker")
    dt_string = datetime.now().strftime("%Y%m%d-%H%M")  # UST

    response = sm.create_processing_job(
        ProcessingJobName=f"law-case-vectordb-processing-{dt_string}",
        ProcessingResources={
            "ClusterConfig": {
                "InstanceCount": 1,
                "InstanceType": "ml.t3.medium",
                "VolumeSizeInGB": 10,
            }
        },
        StoppingCondition={"MaxRuntimeInSeconds": 3600},  # 1 hour
        AppSpecification={
            "ImageUri": os.environ["ECR_REPOSITORY_URI"],
            "ContainerEntrypoint": [
                "python3",
                "/opt/ml/processing/faiss_vector_db.py",
            ],
        },
        RoleArn=os.environ["ROLE_ARN"],
    )

    print(f"Processing job started: {response['ProcessingJobArn']}")

    return {
        "statusCode": 200,
        "body": f"Processing job {response['ProcessingJobArn']} started.",
    }
