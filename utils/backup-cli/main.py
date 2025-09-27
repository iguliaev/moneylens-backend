#!/usr/bin/env python3


import argparse
from supabase import create_client, Client
import os
import logging


def setup_logging(level=None):
    if level is None:
        level = os.getenv("LOG_LEVEL", "ERROR").upper()

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )


def get_client() -> Client:
    url: str = os.getenv("SUPABASE_URL")
    key: str = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY environment variables must be set."
        )

    client: Client = create_client(url, key)
    return client


def list_files(args):
    client = get_client()
    objects = client.storage.from_(args.bucket).list(path=args.path or "")
    for obj in objects:
        print(obj["name"])


def upload_file(args):
    client = get_client()
    with open(args.file, "rb") as f:
        response = client.storage.from_(args.bucket).upload(file=f, path=args.dest)
    print(f"Uploaded to {response.full_path}")


def prune_files(args):
    client = get_client()
    objects = client.storage.from_(args.bucket).list(path=args.path or "")

    # Sort files by updated_at descending
    objects.sort(key=lambda x: x["updated_at"], reverse=True)

    to_delete = []

    if args.days:
        from datetime import datetime, timedelta

        cutoff_date = datetime.now() - timedelta(days=args.days)
        for obj in objects:
            obj_date = datetime.strptime(obj["updated_at"], "%Y-%m-%dT%H:%M:%S.%fZ")
            if obj_date < cutoff_date:
                to_delete.append(obj)

    if args.keep:
        to_delete.extend(objects[args.keep :])

    to_delete = list(
        {obj["name"]: obj for obj in to_delete}.values()
    )  # Remove duplicates

    if args.dry_run:
        print("Files that would be deleted:")
        for obj in to_delete:
            print(obj["name"])

    else:
        path_to_delete = [f"{args.path or ''}/{obj['name']}" for obj in to_delete]
        response = client.storage.from_(args.bucket).remove(path_to_delete)
        for obj in response:
            print(f"Deleted {obj['name']}")


def build_parser():
    parser = argparse.ArgumentParser(description="Supabase Storage Backup Utility")

    parser.add_argument(
        "--log-level", default=None, help="Log level (DEBUG|INFO|WARNING|ERROR)"
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List files in a bucket")
    list_parser.add_argument("-b", "--bucket", required=True, help="Bucket name")
    list_parser.add_argument("-p", "--path", help="Path within the bucket")
    list_parser.set_defaults(func=list_files)

    upload_parser = subparsers.add_parser("upload", help="Upload a file to a bucket")
    upload_parser.add_argument("-b", "--bucket", required=True, help="Bucket name")
    upload_parser.add_argument("-f", "--file", required=True, help="Local file path")
    upload_parser.add_argument(
        "-d", "--dest", required=True, help="Destination path in bucket"
    )
    upload_parser.set_defaults(func=upload_file)

    prune_parser = subparsers.add_parser("prune", help="Prune old files in a bucket")
    prune_parser.add_argument("-b", "--bucket", required=True, help="Bucket name")
    prune_parser.add_argument(
        "-k", "--keep", type=int, default=7, help="Number of recent files to keep"
    )
    prune_parser.add_argument(
        "-d",
        "--days",
        type=int,
        default=7,
        help="Delete files older than this many days",
    )
    prune_parser.add_argument("-p", "--path", help="Path within the bucket")
    prune_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show files to be deleted without deleting",
    )

    prune_parser.set_defaults(func=prune_files)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    try:
        args.func(args)
    except Exception as e:
        logger.error(f"Error occurred: {e}")


if __name__ == "__main__":
    main()
