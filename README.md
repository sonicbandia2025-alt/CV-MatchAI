# 🚀 CV Match AI - Node.js & Full-Stack Ready

Analisador de currículos com Inteligência Artificial que compara arquivos PDF com descrições de vagas de emprego usando a API do **Google Gemini** e **Express + React (Vite)**.

O projeto foi totalmente convertido para uma arquitetura **Full-Stack Node.js**, ideal para versionamento no **GitHub** e hospedagem em plataformas como a **Hostinger (Node.js Application / VPS / Cloud)**.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express 5, CORS, ESBuild (bundler CJS de produção)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts
- **IA**: Google Gemini SDK (`@google/genai` com o modelo `gemini-3-flash-preview`)
- **Processamento de PDF**: `pdfjs-dist`

---

## 📁 Estrutura do Projeto

```text
├── server.ts                 # Servidor Express (API + Middleware Vite / Estáticos)
├── App.tsx                   # Interface Principal React
├── index.html                # Entrypoint HTML
├── vite.config.ts            # Configuração do Vite e Tailwind CSS
├── package.json              # Scripts e Dependências (dev, build, start)
├── services/
│   ├── geminiService.ts      # Cliente de integração com a API (/api/analyze)
│   └── pdfService.ts         # Leitor de PDF client-side
├── components/               # Componentes da interface (Upload, Modal, Resultado)
├── .env.example              # Modelo das Variáveis de Ambiente
└── README.md                 # Instruções de Uso e Deploy
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# Sua chave da API do Google Gemini
GEMINI_API_KEY=sua_chave_gemini_aqui

# Porta do servidor Express (Padrão: 3000)
PORT=3000
```

---

## 💻 Executando Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

3. **Testar o build de produção localmente:**
   ```bash
   npm run build
   npm start
   ```

---

## 📤 Passo a Passo: Subir para o GitHub

1. Inicialize o repositório Git localmente (caso ainda não tenha inicializado):
   ```bash
   git init
   git add .
   git commit -m "feat: projeto convertido para Node.js full-stack com suporte Hostinger"
   ```

2. Crie um novo repositório no [GitHub](https://github.com/new).

3. Conecte o repositório remoto e faça o envio:
   ```bash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

---

## 🌐 Passo a Passo: Hospedar na Hostinger (Node.js App)

A Hostinger oferece suporte a aplicações Node.js através do painel **hPanel** (ou via VPS).

### Opção 1: hPanel (Gerenciador de Aplicações Node.js)

1. **Acesse o hPanel da Hostinger** e navegue até **Websites** > **Gerenciar** > **Aplicação Node.js** (Node.js App).
2. **Configurações da Aplicação**:
   - **Versão do Node.js**: Selecione `Node.js 18.x` ou `Node.js 20.x`.
   - **Modo da Aplicação**: `Production`.
   - **Diretório da Aplicação**: Selecione o diretório onde os arquivos serão instalados.
   - **Arquivo de Inicialização da Aplicação (Startup File)**: `dist/server.cjs`
3. **Variáveis de Ambiente (Environment Variables)**:
   - Adicione a chave: `GEMINI_API_KEY` com o valor da sua chave obtida no Google AI Studio.
   - Adicione a chave: `NODE_ENV` com o valor `production`.
4. **Comandos de Instalação e Build**:
   - Execute a instalação das dependências:
     ```bash
     npm install
     ```
   - Execute o comando de build para gerar os arquivos minificados do frontend e o bundle do servidor:
     ```bash
     npm run build
     ```
5. **Iniciar a Aplicação**:
   - Clique em **Iniciar Aplicação** (Start App) ou execute `npm start`.

### Opção 2: Implantação via Git na Hostinger

1. No hPanel, vá em **Git**.
2. Cole a URL do seu repositório do GitHub (`https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git`).
3. Configure o Deploy Automático ou execute o comando de Deploy.
4. No terminal SSH da Hostinger, rode:
   ```bash
   npm install
   npm run build
   npm start
   ```

---

## 🔒 Segurança

- A chave `GEMINI_API_KEY` fica armazenada **exclusivamente no servidor Express**, garantindo que nenhum usuário consiga inspecionar sua chave de API pelo navegador.

---

## 📄 Licença
Este projeto é de código aberto sob a licença MIT.
