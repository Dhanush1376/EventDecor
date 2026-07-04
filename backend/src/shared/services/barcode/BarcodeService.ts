import bwipjs from 'bwip-js';
import logger from '../../../config/logger';

export class BarcodeService {
  /**
   * Generates a Code 128 barcode as a PNG Buffer
   * @param data The string to encode
   * @returns Promise<Buffer> PNG Buffer
   */
  static async generateCode128Buffer(data: string): Promise<Buffer> {
    try {
      return await new Promise((resolve, reject) => {
        bwipjs.toBuffer(
          {
            bcid: 'code128',
            text: data,
            scale: 3,
            height: 15,
            includetext: true,
            textxalign: 'center',
            backgroundcolor: 'FFFFFF', // Ensure white background
            paddingheight: 2,
            paddingwidth: 2,
          },
          (err: any, png: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(png);
            }
          },
        );
      });
    } catch (error: any) {
      logger.error(`Error generating barcode for ${data}:`, error.message);
      throw error;
    }
  }

  /**
   * Generates a Code 128 barcode as a Base64 string
   * @param data The string to encode
   * @returns Promise<string> Base64 data URI
   */
  static async generateCode128Base64(data: string): Promise<string> {
    const buffer = await this.generateCode128Buffer(data);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}
