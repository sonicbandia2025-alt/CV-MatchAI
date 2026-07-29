import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Schema for Gemini Structured Analysis
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "Uma pontuação de 0 a 100 indicando a compatibilidade do candidato com a vaga.",
    },
    pontos_fortes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 pontos fortes identificados no currículo em relação à vaga.",
    },
    pontos_fracos: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 pontos de atenção ou ausências no currículo que precisam ser melhorados.",
    },
    palavras_chave_ausentes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 5 a 8 palavras-chave técnicas ou hard skills EXATAS que constam na vaga mas NÃO constam no currículo (Crucial para ATS).",
    },
    plano_acao: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 a 5 ações práticas e diretas para aumentar o score.",
    },
    sugestao_resumo_profissional: {
      type: Type.STRING,
      description: "Um parágrafo de 'Resumo Profissional' reescrito (3 a 4 frases), altamente profissional, incorporando as palavras-chave ausentes.",
    },
    veredito_final: {
      type: Type.STRING,
      description: "Um resumo conciso de 2 linhas sobre as chances do candidato e recomendação final.",
    },
  },
  required: [
    "score",
    "pontos_fortes",
    "pontos_fracos",
    "palavras_chave_ausentes",
    "plano_acao",
    "sugestao_resumo_profissional",
    "veredito_final",
  ],
};

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "CV Match AI Server", timestamp: new Date().toISOString() });
});

// API Route for Analyzing Resume via Server-side Gemini API
app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Parâmetros 'resumeText' e 'jobDescription' são obrigatórios.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERRO: GEMINI_API_KEY não definida nas variáveis de ambiente.");
      return res.status(500).json({
        error: "Chave da API do Gemini não configurada no servidor. Configure a variável GEMINI_API_KEY.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Primary and fallback models
    const modelsToTry = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError: any = null;
    let responseText: string | null = null;

    const prompt = `
      Descrição da Vaga (Requirements):
      ${jobDescription}

      ---
      Conteúdo do Currículo (Candidate Profile):
      ${resumeText}
    `;

    const systemInstruction = `Você é um algoritmo de ATS (Applicant Tracking System) e um Recrutador Técnico RÍGIDO. 

    DIRETRIZES DE PONTUAÇÃO (CRITICAMENTE IMPORTANTE):
    1. CRITÉRIO DE ELIMINAÇÃO (Formação/Área): Se a vaga exige uma formação específica (ex: Educação Física, Direito, Medicina, Engenharia) e o candidato NÃO tem a formação exata ou experiência direta na área, o SCORE DEVE SER BAIXO (entre 0 e 35).
    
    2. NÃO COMPENSE COM SOFT SKILLS: "Comunicação", "Organização" ou "Vontade de aprender" NÃO devem aumentar o score se os requisitos técnicos obrigatórios (Hard Skills) não existirem. Soft skills valem no máximo 10% da nota.
    
    3. ESCALA DE SCORE REALISTA:
       - 0-40: Perfil incompatível.
       - 41-60: Perfil júnior ou transição de carreira.
       - 61-80: Perfil compatível.
       - 81-100: Perfil ideal.

    Sua tarefa:
    1. Analise friamente a compatibilidade técnica.
    2. Identifique as palavras-chave faltantes.
    3. Crie uma sugestão de texto para o 'Resumo Profissional'.
    
    Retorne APENAS JSON válido conforme o schema.`;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });

        if (response.text) {
          responseText = response.text;
          break; // Success!
        }
      } catch (err: any) {
        console.warn(`Attempt with model ${model} failed:`, err.message || err);
        lastError = err;
        // Continue to next model in loop if 503, 500, or 429 occurs
      }
    }

    if (!responseText) {
      throw lastError || new Error("A resposta da IA veio vazia de todos os modelos tentados.");
    }

    let cleanText = responseText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(cleanText);
    return res.json(result);
  } catch (error: any) {
    console.error("Gemini API Error in Server:", error);
    let errorMsg = "Falha ao analisar o currículo no servidor.";
    if (error.message?.includes("400")) errorMsg = "Erro de Requisição (400). Verifique se o PDF tem texto legível.";
    if (error.message?.includes("403")) errorMsg = "Erro de Permissão (403). Verifique se a Chave da API está válida.";
    if (error.message?.includes("429")) errorMsg = "Muitas requisições. Cota excedida temporariamente.";
    if (error.message?.includes("500") || error.message?.includes("503")) errorMsg = "Serviço da IA indisponível no momento. Tente novamente em instantes.";

    return res.status(500).json({ error: errorMsg, details: error.message });
  }
});

// Setup Frontend serving / Vite Dev Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 CV Match AI Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
