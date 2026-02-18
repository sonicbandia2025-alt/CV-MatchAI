import React, { useEffect, useState } from 'react';

interface AdModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const AdModal: React.FC<AdModalProps> = ({ isOpen, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (isOpen) {
      // Reset timer when opened
      setTimeLeft(15);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (timeLeft === 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden text-center">
        
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Apoiando o Projeto</h2>
          <p className="text-slate-500 mt-2">
            Estamos processando seu currículo gratuitamente. Por favor, aguarde alguns segundos.
          </p>
        </div>

        <div className="mb-8">
          <div className="text-4xl font-black text-slate-800 tabular-nums">
            {timeLeft}s
          </div>
          <p className="text-sm text-slate-400 mt-1">para liberar sua análise</p>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-linear" 
            style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
          ></div>
        </div>
        
        <p className="text-xs text-slate-400 italic">
          Obrigado por sua paciência! A IA está lendo seu perfil.
        </p>
      </div>
    </div>
  );
};

export default AdModal;