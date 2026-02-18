import * as pdfjsLib from 'pdfjs-dist';

// Set strict version for worker to match the package version in importmap
const PDFJS_VERSION = '4.10.38';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document using the array buffer
    // casting to any to avoid strict type checks on the library import structure
    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract string content with basic spacing
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
          
        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`Error extracting text from page ${i}:`, pageError);
        continue; // Try to continue with other pages even if one fails
      }
    }

    if (!fullText.trim()) {
      throw new Error("O PDF parece estar vazio ou é uma imagem digitalizada sem texto selecionável.");
    }

    return fullText;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    
    // Provide more specific error messages
    if (error.name === 'PasswordException') {
      throw new Error('O arquivo PDF está protegido por senha.');
    } else if (error.message && error.message.includes('vazio')) {
      throw error;
    } else {
      throw new Error('Falha ao ler o arquivo PDF. Tente salvar o arquivo novamente ou use outro formato PDF.');
    }
  }
};