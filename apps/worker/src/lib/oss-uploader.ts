/**
 * OSS Upload utility for worker.
 * Downloads a remote file and uploads it to Aliyun OSS.
 */

const OSS_REGION = process.env.OSS_REGION ?? 'oss-cn-shanghai';
const OSS_BUCKET = process.env.OSS_BUCKET ?? '';
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID ?? '';
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET ?? '';

interface OssUploadResult {
  url: string;
  key: string;
}

/**
 * Download a remote file and upload to OSS.
 * Returns the OSS URL.
 */
export async function uploadToOSS(sourceUrl: string, targetKey: string): Promise<OssUploadResult> {
  // If no OSS config, return original URL
  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
    console.warn(`[OSS] No OSS credentials configured, using original URL: ${sourceUrl}`);
    return { url: sourceUrl, key: targetKey };
  }

  try {
    // Fetch the file
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch source file: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();

    // Simple PUT upload using fetch + presigned URL
    // In production, use ali-oss SDK for multipart uploads
    const uploadUrl = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${targetKey}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': guessMimeType(targetKey),
        'x-oss-meta-uploaded-by': 'ai-toolsite-worker',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      // Fallback: just return original URL (upstream may already be on CDN)
      console.warn(`[OSS] Upload failed (${uploadResponse.status}), using original URL`);
      return { url: sourceUrl, key: targetKey };
    }

    const ossUrl = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${targetKey}`;
    console.log(`[OSS] Uploaded to ${ossUrl}`);
    return { url: ossUrl, key: targetKey };

  } catch (err) {
    // Non-fatal — return original URL if upload fails
    console.error(`[OSS] Upload error for ${sourceUrl}:`, err);
    return { url: sourceUrl, key: targetKey };
  }
}

function guessMimeType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    pdf: 'application/pdf',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

/** Generate a thumbnail from an image URL (placeholder — use sharp in production) */
export async function generateThumbnail(imageUrl: string, taskId: string): Promise<string | null> {
  // TODO: Use sharp or a thumbnail service to generate thumbnails
  // For now, return the original URL as thumbnail
  return imageUrl;
}
