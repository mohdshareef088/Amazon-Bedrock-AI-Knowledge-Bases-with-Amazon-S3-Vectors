
# AWS Bedrock RAG Knowledge Base & Chatbot
A lightweight, full-stack Retrieval-Augmented Generation (RAG) web application powered by **Amazon Bedrock Knowledge Bases**, **Amazon S3 Vectors**, and **Amazon Nova**, with a FastAPI backend and a responsive Tailwind CSS frontend

## Architecture Diagram
<img width="1414" height="700" alt="Screenshot 2026-10-25 141124" src="https://github.com/user-attachments/assets/62699b96-1e6a-45ce-9c08-52a79d2fadde" />

### 📂 Architecture Overview

```text
bedrock-rag-ui/
├── app.py
├── index.html
├── requirements.txt
├── .env.example
└── README.md

```

## 🚀 Features
- **Managed RAG Pipeline**: Leverages Amazon Bedrock Knowledge Base to retrieve data securely from Amazon S3 vector storage without maintaining complex local vector databases.
- **Advanced AI Model**: Integrated with **Amazon Nova** via system-defined inference profiles for high-speed, cost-effective reasoning.
- **Full-Stack Implementation**: Clean single-file HTML/Tailwind frontend communicating with a high-performance Python FastAPI backend.
- **Source Citations**: Displays exact S3 source URIs retrieved alongside model answers for full auditability.

## 🛠️ Prerequisites and tools used
- **Frontend**: HTML5, Tailwind CSS, JavaScript (Fetch API)
- **Backend**: Python, FastAPI, Uvicorn, Boto3 (AWS SDK)
- **Cloud Infrastructure**: Amazon Bedrock, Amazon S3, IAM

---
## ⚙️ Executions & Installation

1. **Clone the repository:**
```bash
git clone [https://github.com/YOUR_USERNAME/bedrock-rag-ui.git](https://github.com/YOUR_USERNAME/bedrock-rag-ui.git)
cd bedrock-rag-ui
  ```
2. **Set up a Python Virtual Environment:**
```bash
Install the venv module
sudo apt update && sudo apt install -y python3-venv python3-full
python3 -m venv venv
source venv/bin/activate
  ```
3. **Install dependencies:**
```bash
pip install -r requirements.txt
`requirements.txt`
```text
fastapi
uvicorn
boto3
python-dotenv
pydantic
```
4. **Configure Environment Variables:**
```bash
`.env` and fill in your AWS configuration:
nano .env
```env
AWS_REGION=ap-southeast-2
BEDROCK_KB_ID=YOUR_10_CHAR_KB_ID
BEDROCK_MODEL_ARN=arn:aws:bedrock:ap-southeast-2:190176595792:inference-profile/global.amazon.nova-2-lite-v1:0
  ```
5. **Run the Application:**
```bash
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000
  ```
6. **Open your browser at `http://YOUR_EC2_IP:8000`**


<img width="1299" height="590" alt="image" src="https://github.com/user-attachments/assets/1c3f7307-dc08-4ae1-8722-46d790d42783" />

---

### `app.py` (Backend)

```python
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return FileResponse("index.html")

bedrock_client = boto3.client(
    service_name="bedrock-agent-runtime",
    region_name=os.getenv("AWS_REGION", "ap-southeast-2")
)

class Query(BaseModel):
    message: str

@app.post("/api/chat")
def chat(query: Query):
    kb_id = os.getenv("BEDROCK_KB_ID")
    model_arn = os.getenv("BEDROCK_MODEL_ARN")

    if not kb_id or not model_arn:
        raise HTTPException(status_code=500, detail="Missing Bedrock configuration in environment variables.")

    try:
        response = bedrock_client.retrieve_and_generate(
            input={'text': query.message},
            retrieveAndGenerateConfiguration={
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': kb_id,
                    'modelArn': model_arn
                }
            }
        )
        
        answer = response.get("output", {}).get("text", "No answer found.")
        sources = [
            ref["location"]["s3Location"]["uri"]
            for citation in response.get("citations", [])
            for ref in citation.get("retrievedReferences", [])
            if "s3Location" in ref.get("location", {})
        ]

        return {"answer": answer, "sources": list(set(sources))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

```

---

### `index.html` (Frontend UI)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AWS Bedrock RAG Assistant</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 h-screen flex flex-col font-sans">

  <!-- Header -->
  <header class="bg-slate-900 text-white p-4 text-center shadow">
    <h1 class="text-xl font-bold">🤖 AWS Bedrock Knowledge Base RAG</h1>
    <p class="text-xs text-slate-400">Powered by Amazon Bedrock & S3 Vectors</p>
  </header>

  <!-- Chat Container -->
  <div id="chat-box" class="flex-1 p-4 overflow-y-auto max-w-2xl w-full mx-auto space-y-3">
    <div class="bg-white p-3 rounded-lg shadow text-gray-800 max-w-xs">
      👋 Hello! Ask me any question based on the documents in your AWS Knowledge Base.
    </div>
  </div>

  <!-- Loading Indicator -->
  <div id="loading" class="hidden text-center text-sm text-gray-500 py-2">
    Searching Knowledge Base & Generating Response... ⏳
  </div>

  <!-- Input Form -->
  <footer class="bg-white p-4 border-t border-gray-200">
    <form id="chat-form" class="max-w-2xl mx-auto flex gap-2">
      <input 
        type="text" 
        id="user-input" 
        placeholder="Type your question here..." 
        required 
        class="flex-1 border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
      <button 
        type="submit" 
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
      >
        Send
      </button>
    </form>
  </footer>

  <!-- Frontend Logic -->
  <script>
    const form = document.getElementById('chat-form');
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const loading = document.getElementById('loading');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      appendMessage(question, 'user');
      input.value = '';
      loading.classList.remove('hidden');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question })
        });

        const data = await response.json();
        loading.classList.add('hidden');

        if (response.ok) {
          appendMessage(data.answer, 'bot', data.sources);
        } else {
          appendMessage('Error: ' + (data.detail || 'Failed to fetch answer.'), 'bot');
        }
      } catch (err) {
        loading.classList.add('hidden');
        appendMessage('Unable to reach the backend server.', 'bot');
      }
    });

    function appendMessage(text, sender, sources = []) {
      const msgDiv = document.createElement('div');
      msgDiv.className = sender === 'user' 
        ? 'bg-blue-600 text-white p-3 rounded-lg shadow max-w-xs ml-auto text-right' 
        : 'bg-white text-gray-800 p-3 rounded-lg shadow max-w-md border border-gray-100';

      let html = `<p class="whitespace-pre-wrap">${text}</p>`;

      if (sources.length > 0) {
        html += `<div class="mt-2 pt-2 border-t text-xs text-gray-500 font-mono"><b>S3 Sources:</b><br>${sources.join('<br>')}</div>`;
      }

      msgDiv.innerHTML = html;
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  </script>
</body>
</html>

```
---
## 🧪 Screenshots
---
## Creating Bucket and adding files
<img width="1368" height="588" alt="image" src="https://github.com/user-attachments/assets/866a2fa8-a4d3-451b-81b0-e43249adfea4" />

## Embedding and Syncing vector database
<img width="1899" height="831" alt="image" src="https://github.com/user-attachments/assets/a3a42f6f-d8cc-45f7-a98b-1c707dfdaf9f" />

## Testing Model 
<img width="1876" height="811" alt="image" src="https://github.com/user-attachments/assets/05de2e11-51b9-4d8c-9b8f-773b440e7824" />

---

### 🧪 (Frontend UI)

<img width="682" height="654" alt="image" src="https://github.com/user-attachments/assets/ec8596f8-a8a3-4124-91de-02d44c506c42" />

<img width="687" height="791" alt="image" src="https://github.com/user-attachments/assets/cbb769b7-bbe0-4cdd-b0f6-0aa139e42420" />


### 🧪 (Frontend UI with React)

<img width="467" height="214" alt="image" src="https://github.com/user-attachments/assets/53d553de-c1a2-40f6-859d-6cf56cc99088" />

<img width="1912" height="2051" alt="image" src="https://github.com/user-attachments/assets/ef9b6c5a-e12e-45b8-8771-f5ad626121b2" />


