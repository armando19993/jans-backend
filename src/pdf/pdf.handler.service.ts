import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfHandlerService {
  private readonly pdfDirectory = 'public/pdfs';

  constructor() {
    this.ensurePdfDirectoryExists();
  }

  private ensurePdfDirectoryExists() {
    const fullPath = path.join(process.cwd(), this.pdfDirectory);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  async savePdf(fileName: string, base64Data: string): Promise<string> {
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    const fullPath = path.join(process.cwd(), this.pdfDirectory, fileName);
    
    await fs.promises.writeFile(fullPath, pdfBuffer);
    return `${process.env.APP_URL || 'http://localhost:4000'}/pdfs/${fileName}`;
  }
}