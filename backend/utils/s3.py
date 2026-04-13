import os
import boto3


AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")


def parse_s3_uri(s3_uri: str) -> tuple[str, str]:
    if not s3_uri:
        raise ValueError("s3_uri가 비어 있습니다.")

    if not s3_uri.startswith("s3://"):
        raise ValueError(f"올바른 s3 uri 형식이 아닙니다: {s3_uri}")

    without_scheme = s3_uri.replace("s3://", "", 1)
    bucket, key = without_scheme.split("/", 1)
    return bucket, key


def get_s3_client():
    return boto3.client("s3", region_name=AWS_REGION)


def create_presigned_get_url(s3_uri: str, expires_in: int = 3600) -> str:
    bucket, key = parse_s3_uri(s3_uri)

    s3_client = get_s3_client()
    return s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": bucket,
            "Key": key,
        },
        ExpiresIn=expires_in,
    )