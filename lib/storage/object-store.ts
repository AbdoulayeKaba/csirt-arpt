import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

let client: S3Client | null = null;

export function objectStoreEnabled(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY
  );
}

function bucket() {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error('S3_BUCKET manquant');
  return name;
}

function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
  }
  return client;
}

export async function putObject(key: string, body: Buffer, contentType?: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NoSuchKey' || name === 'NotFound') return null;
    throw error;
  }
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })).catch(() => undefined);
}

export async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export async function deletePrefix(prefix: string) {
  const keys = await listKeys(prefix);
  for (const key of keys) {
    await deleteObject(key);
  }
}
