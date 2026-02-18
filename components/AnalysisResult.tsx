import React from 'react';
import { AnalysisResult as AnalysisResultType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface AnalysisResultProps {
  result: AnalysisResultType;
  onReset: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset }) => {
  const getScoreColor = (score: number) => {
    if (score < 50) return '#ef4444'; // red-500
    if (score < 80) return '#eab308'; // yellow-500
    return '#22c55e'; // green-500
  };

  const scoreColor = getScoreColor(result.score);
  
  const data = [
    { name: 'Score', value: result.score },
    { name: 'Remaining', value: 100 - result.score },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Texto copiado para a área de transferência!");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 p-6 text-white text-center relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-1">Resultado da Análise</h2>
            <p className="text-slate-400 text-sm">Baseado na IA Gemini 2.0 Flash</p>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-slate-900"></div>
      </div>

      <div className="p-6 md:p-8">
        
        {/* Score Section */}
        <div className="flex flex-col items-center mb-10">
            <div className="w-48 h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="score" fill={scoreColor} />
                            <Cell key="remaining" fill="#e2e8f0" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center -mt-4">
                    <span className="text-5xl font-bold text-slate-800">{result.score}</span>
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Compatibilidade</span>
                </div>
            </div>
            
            <div className="w-full bg-slate-50 rounded-lg p-4 border border-slate-100 text-center -mt-8 relative z-10">
                <p className="text-slate-700 font-medium italic">"{result.veredito_final}"</p>
            </div>
        </div>

        {/* ATS Keywords Section */}
        <div className="mb-8">
            <h3 className="flex items-center text-slate-800 font-bold mb-4 text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Palavras-Chave Ausentes (ATS)
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
                {result.palavras_chave_ausentes.length > 0 ? (
                    result.palavras_chave_ausentes.map((keyword, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {keyword}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </span>
                    ))
                ) : (
                    <span className="text-sm text-green-600 font-medium">Parabéns! Nenhuma palavra-chave crítica faltando.</span>
                )}
            </div>
        </div>

        {/* AI Suggested Content Rewrite (New Feature) */}
        {result.sugestao_resumo_profissional && (
            <div className="mb-8 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-75 group-hover:opacity-100 transition duration-200 blur opacity-20"></div>
                <div className="relative bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="flex items-center text-slate-800 font-bold text-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Sugestão de Resumo Profissional
                        </h3>
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Otimizado</span>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-3">
                        A IA reescreveu seu resumo incorporando as palavras-chave acima. Substitua no seu CV para aumentar a relevância.
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 text-sm leading-relaxed italic relative">
                        "{result.sugestao_resumo_profissional}"
                        <button 
                            onClick={() => copyToClipboard(result.sugestao_resumo_profissional)}
                            className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Copiar texto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m2 4h6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Action Plan Section */}
        <div className="mb-8 bg-indigo-50 rounded-xl p-5 border border-indigo-100">
            <h3 className="flex items-center text-indigo-900 font-bold mb-4 text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Plano de Ação Imediato
            </h3>
            <ul className="space-y-3">
                {result.plano_acao.map((acao, index) => (
                    <li key={index} className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-200 text-indigo-700 text-xs font-bold mr-3 mt-0.5">
                            {index + 1}
                        </div>
                        <p className="text-sm text-indigo-900 font-medium">{acao}</p>
                    </li>
                ))}
            </ul>
        </div>

        {/* Detailed Feedback Grid */}
        <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <h3 className="flex items-center text-green-700 font-bold mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    O que você já tem
                </h3>
                <ul className="space-y-2">
                    {result.pontos_fortes.map((ponto, index) => (
                        <li key={index} className="flex items-start text-sm text-slate-700">
                            <span className="mr-2 mt-1.5 h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                            {ponto}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <h3 className="flex items-center text-red-700 font-bold mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    O que falta
                </h3>
                <ul className="space-y-2">
                    {result.pontos_fracos.map((ponto, index) => (
                        <li key={index} className="flex items-start text-sm text-slate-700">
                            <span className="mr-2 mt-1.5 h-1.5 w-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                            {ponto}
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        <button 
            onClick={onReset}
            className="w-full mt-8 bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Nova Análise
        </button>
      </div>
    </div>
  );
};

export default AnalysisResult;