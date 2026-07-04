import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import logger from '../config/logger';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface S3UploadParams {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export const s3Upload = async (
  file: S3UploadParams,
  folder: string = 'documents',
): Promise<any> => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'siri-prod-bucket';
  const key = `${folder}/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    if (process.env.AWS_ACCESS_KEY_ID) {
      await s3Client.send(command);
    } else {
      logger.warn('[S3] Missing AWS credentials, mocking S3 upload for local testing');
    }

    return {
      url: `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`,
      key: key,
    };
  } catch (error) {
    logger.error('Error uploading to S3:', error);
    throw error;
  }
};
