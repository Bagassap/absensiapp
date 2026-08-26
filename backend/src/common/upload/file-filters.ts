import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.ms-powerpoint', // .ppt (format lama)
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword', // .doc (format lama)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

function mimeFileFilter(allowed: string[]): MulterOptions['fileFilter'] {
  return (_req, file, cb) => {
    if (!allowed.includes(file.mimetype)) {
      cb(new BadRequestException(`Tipe file tidak didukung: ${file.mimetype}`), false);
      return;
    }
    cb(null, true);
  };
}

export const imageUploadOptions: Pick<MulterOptions, 'fileFilter' | 'limits'> = {
  fileFilter: mimeFileFilter(IMAGE_MIME_TYPES),
  limits: { fileSize: 5 * 1024 * 1024 },
};

export const documentUploadOptions: Pick<MulterOptions, 'fileFilter' | 'limits'> = {
  fileFilter: mimeFileFilter(DOCUMENT_MIME_TYPES),
  limits: { fileSize: 20 * 1024 * 1024 },
};
