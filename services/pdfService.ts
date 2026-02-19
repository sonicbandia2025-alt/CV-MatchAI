import * as pdfjsLib from 'pdfjs-dist';

// Versão estrita para garantir compatibilidade entre o código e o worker
const PDFJS_VERSION = '4.10.38';

// Configura o worker para carregar de um CDN (Cloudflare).
// Isso é CRUCIAL para GitHub Pages, pois evita problemas de caminho relativo ao tentar carregar o arquivo 'pdf.worker.min.mjs' da pasta assets.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Carrega o documento
    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    // Itera sobre todas as páginas
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extrai o texto e junta com espaços
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
          
        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`Erro ao extrair texto da página ${i}:`, pageError);
        continue; // Tenta continuar com as outras páginas
      }
    }

    if (!fullText.trim()) {
      throw new Error("O PDF parece estar vazio ou é uma imagem escaneada (sem OCR). Por favor, use um PDF com texto selecionável.");
    }

    return fullText;
  } catch (error: any) {
    console.error('Erro geral na extração do PDF:', error);
    
    if (error.name === 'PasswordException') {
      throw new Error('O arquivo PDF está protegido por senha. Remova a senha e tente novamente.');
    } else if (error.message && error.message.includes('vazio')) {
      throw error;
    } else {
      throw new Error('Não foi possível ler o arquivo PDF. Tente salvar o arquivo novamente como PDF padrão.');
    }
  }
};