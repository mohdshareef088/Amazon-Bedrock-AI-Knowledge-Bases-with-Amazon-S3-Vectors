import React, { useState } from 'react';
import axios from 'axios';
import { Send, Bot, User, Database, Loader2 } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! Ask me any question based on your AWS Bedrock Knowledge Base.', sources: [] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg, sources: [] }]);
    setLoading(true);

    try {
      const res = await axios.post('http://3.26.187.98:8000/api/chat', {
        message: userMsg
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.response || res.data.answer || JSON.stringify(res.data),
          sources: res.data.sources || res.data.retrieved_sources || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error connecting to the FastAPI backend or AWS Bedrock.', sources: [] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-md flex items-center gap-3">
        <Database className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold tracking-wide">AWS Bedrock Knowledge Base RAG</h1>
      </header>

      {/* Chat Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-4 overflow-y-auto mb-20">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {/* S3 Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-700 text-xs text-indigo-300">
                  <span className="font-semibold block mb-1">Retrieved S3 Sources:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {msg.sources.map((src, i) => (
                      <li key={i} className="truncate">{typeof src === 'string' ? src : JSON.stringify(src)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 shadow">
                <User className="w-5 h-5 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 rounded-bl-none flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Querying Amazon Bedrock Knowledge Base...</span>
            </div>
          </div>
        )}
      </main>

      {/* Input Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;
