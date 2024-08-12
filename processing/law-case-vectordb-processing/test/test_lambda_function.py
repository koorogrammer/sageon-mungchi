import pytest
from unittest.mock import patch, MagicMock

import os, sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "_lambda"))
from lambda_function import lambda_handler


@patch("lambda_function.boto3.client")
@patch.dict(
    "os.environ",
    {"ECR_REPOSITORY_URI": "test-ecr-repo-uri", "ROLE_ARN": "test-role-arn"},
)
def test_lambda_handler(mock_boto3_client):
    mock_sm = MagicMock()
    mock_boto3_client.return_value = mock_sm

    lambda_handler({}, {})

    mock_sm.create_processing_job.assert_called_once()
