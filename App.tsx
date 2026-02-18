import React, { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import AdModal from './components/AdModal';
import AnalysisResult from './components/AnalysisResult';
import { AnalysisResult as AnalysisResultType, ProcessingState } from './types';
import { extractTextFromPDF } from './services/pdfService';
import { analyzeResume } from './services/geminiService';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  // Step 1: Handle File Selection
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setProcessingState({ status: 'idle' });
  };

  // Step 2: Trigger the process (Show Ad First)
  const handleStartAnalysis = async () => {
    if (!file || !jobDescription.trim()) {
      alert("Por favor, faça upload do currículo e cole a descrição da vaga.");
      return;
    }
    
    // Start Extraction immediately while waiting for ad? 
    // Ideally we extract first to ensure valid PDF, then show ad while "analyzing".
    setProcessingState({ status: 'extracting', message: 'Lendo PDF...' });
    
    try {
      const text = await extractTextFromPDF(file);
      setExtractedText(text);
      // Once text is ready, open the "Ad" (Gamification/Monetization simulation)
      setIsAdOpen(true);
      setProcessingState({ status: 'analyzing', message: 'Aguardando verificação...' });
    } catch (error: any) {
      setProcessingState({ status: 'error', message: error.message || 'Erro ao ler PDF.' });
    }
  };

  // Step 3: Executed when Ad countdown finishes
  const handleAdComplete = useCallback(async () => {
    setIsAdOpen(false);
    
    if (!extractedText) return;

    setProcessingState({ status: 'analyzing', message: 'Consultando IA Gemini...' });

    try {
      const analysisData = await analyzeResume(extractedText, jobDescription);
      setResult(analysisData);
      setProcessingState({ status: 'success' });
    } catch (error: any) {
      setProcessingState({ status: 'error', message: error.message || 'Erro na análise da IA.' });
    }
  }, [extractedText, jobDescription]);

  const handleReset = () => {
    setFile(null);
    setJobDescription('');
    setResult(null);
    setExtractedText(null);
    setProcessingState({ status: 'idle' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">CV Match<span className="text-blue-600">AI</span></h1>
          </div>
          <div className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
            BETA
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro */}
        {!result && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Otimize seu currículo com IA</h2>
            <p className="text-lg text-slate-600">
              Descubra se seu perfil combina com a vaga dos seus sonhos em segundos. Análise detalhada e implacável.
            </p>
          </div>
        )}

        {result ? (
          <AnalysisResult result={result} onReset={handleReset} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-8">
            
            {/* File Upload Section */}
            <FileUpload onFileSelect={handleFileSelect} selectedFile={file} />

            {/* Job Description Section */}
            <div>
              <label htmlFor="job-desc" className="block text-sm font-medium text-slate-700 mb-2">
                2. Descrição da Vaga
              </label>
              <div className="relative">
                <textarea
                  id="job-desc"
                  rows={6}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 border bg-slate-50 resize-none"
                  placeholder="Cole aqui o texto completo da descrição da vaga (Requisitos, Responsabilidades, etc)..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleStartAnalysis}
              disabled={!file || !jobDescription || processingState.status === 'extracting'}
              className={`w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white transition-all
                ${(!file || !jobDescription) 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
            >
              {processingState.status === 'extracting' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando PDF...
                </>
              ) : (
                "Analisar Compatibilidade"
              )}
            </button>

            {/* Error Message */}
            {processingState.status === 'error' && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Erro</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{processingState.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-center text-slate-400 mt-4">
              Seus dados são processados localmente e enviados apenas para a IA para análise momentânea. Nada é salvo.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} CV Match AI. Zero Cost Architecture.
        </div>
      </footer>

      {/* Ad Modal Simulator */}
      <AdModal isOpen={isAdOpen} onComplete={handleAdComplete} />
    </div>
  );
};

export default App;