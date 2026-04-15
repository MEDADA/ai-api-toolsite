import { env } from '../config/env.js';
import { OssObjectType } from '@ai-toolsite/shared';

interface StsToken {
  AccessKeyId: string;
  AccessKeySecret: string;
  SecurityToken: string;
  Expiration: string;
  bucket: string;
  endpoint: string;
  upload_dir: string;
}

const dirMap: Record<OssObjectType, string> = {
  UPLOAD: 'uploads',
  RESULT: 'results',
  THUMBNAIL: 'thumbnails',
};

export const ossService = {
  async generateStsToken(userId: string, type: OssObjectType): Promise<StsToken> {
    // TODO: Integrate real OSS STS
    // For now, return mock token — replace with ali-oss STS SDK call
    const uploadDir = `${dirMap[type]}/${userId}/`;

    return {
      AccessKeyId: env.OSS_ACCESS_KEY_ID,
      AccessKeySecret: env.OSS_ACCESS_KEY_SECRET,
      SecurityToken: 'MOCK_STS_TOKEN_REPLACE_WITH_REAL',
      Expiration: new Date(Date.now() + 3600 * 1000).toISOString(),
      bucket: env.OSS_BUCKET,
      endpoint: `https://${env.OSS_BUCKET}.${env.OSS_REGION}.aliyuncs.com`,
      upload_dir: uploadDir,
    };
  },

  getFileUrl(ossKey: string): string {
    return `https://${env.OSS_BUCKET}.${env.OSS_REGION}.aliyuncs.com/${ossKey}`;
  },
};
