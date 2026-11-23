import { extractText } from 'unpdf';
import { CustomError } from '../middlewares/errorHandler.middleware.js';

// Text of a PDF with selectable text (AD-114); also read by the report from the full process (AD-152).
const pdfText = async (file: Uint8Array): Promise<string> => {
  if (Buffer.from(file.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new CustomError('unsupported_file_type', 415);
  }
  try {
    return (await extractText(file, { mergePages: true })).text;
  } catch (error) {
    throw new CustomError('unsupported_file_type', 415, error instanceof Error ? error.message : undefined);
  }
};

// Text of the PDF; a PDF without selectable text is refused.
export const extractPdfText = async (file: Buffer): Promise<string> => {
  if (!Buffer.isBuffer(file)) throw new CustomError('unsupported_file_type', 415);
  const text = await pdfText(new Uint8Array(file));
  if (!text.trim()) throw new CustomError('pdf_without_text', 422);
  return text;
};
