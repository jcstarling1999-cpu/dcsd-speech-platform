'use client'

import { useState, useRef, useEffect } from 'react'

type AIProvider = 'openai' | 'anthropic' | 'google' | 'aimlapi'
type TTSProvider = 'elevenlabs' | 'deepgram' | 'azure' | 'browser'
type STTProvider = 'deepgram' | 'azure' | 'browser'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai')
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('elevenlabs')
  const [sttProvider, setSttProvider] = useState<STTProvider>('deepgram')
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          provider: aiProvider
        })
      })
      const data = await res.json()
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
      if (autoSpeak) {
        await speakText(data.content)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const speakText = async (text: string) => {
    setIsSpeaking(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider: ttsProvider, voiceId })
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => setIsSpeaking(false)
      await audio.play()
    } catch (e) {
      console.error(e)
      setIsSpeaking(false)
    }
  }

  const startListening = async () => {
    if (sttProvider === 'browser') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) return
      const rec = new SR()
      rec.continuous = false
      rec.interimResults = false
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript
        setInput(transcript)
        sendMessage(transcript)
      }
      rec.start()
      setIsListening(true)
      rec.onend = () => setIsListening(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        mediaRecorderRef.current = mr
        chunksRef.current = []
        mr.ondataavailable = e => chunksRef.current.push(e.data)
        mr.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          formData.append('provider', sttProvider)
          const res = await fetch('/api/stt', { method: 'POST', body: formData })
          const data = await res.json()
          if (data.transcript) {
            setInput(data.transcript)
            sendMessage(data.transcript)
          }
          stream.getTracks().forEach(t => t.stop())
        }
        mr.start()
        setIsListening(true)
      } catch (e) { console.error(e) }
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsListening(false)
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-lg">🎙</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DCSD AI Speech Platform</h1>
              <p className="text-xs text-gray-400">Multi-modal AI assistant</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)}
              className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20">
              <option value="openai">OpenAI GPT-4</option>
              <option value="anthropic">Claude 3.5</option>
              <option value="google">Gemini Pro</option>
              <option value="aimlapi">AIML API</option>
            </select>
            <select value={ttsProvider} onChange={e => setTtsProvider(e.target.value as TTSProvider)}
              className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20">
              <option value="elevenlabs">ElevenLabs</option>
              <option value="deepgram">Deepgram</option>
              <option value="azure">Azure TTS</option>
              <option value="browser">Browser</option>
            </select>
            <select value={sttProvider} onChange={e => setSttProvider(e.target.value as STTProvider)}
              className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20">
              <option value="deepgram">Deepgram STT</option>
              <option value="azure">Azure STT</option>
              <option value="browser">Browser STT</option>
            </select>
            <button onClick={() => setAutoSpeak(!autoSpeak)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                autoSpeak ? 'bg-violet-500/30 border-violet-400 text-violet-300' : 'bg-white/10 border-white/20 text-gray-400'
              }`}>
              Auto-Speak {autoSpeak ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col gap-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h2 className="text-2xl font-semibold text-white mb-2">Start a conversation</h2>
              <p className="text-gray-400">Type a message or click the microphone to speak</p>
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white'
                : 'glass text-white'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs opacity-60">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
                {msg.role === 'assistant' && (
                  <button onClick={() => speakText(msg.content)}
                    className="text-xs opacity-60 hover:opacity-100 ml-2">🔊</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="glass border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto">
          {isSpeaking && (
            <div className="flex items-center gap-2 mb-2 text-violet-300 text-xs">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1 bg-violet-400 rounded-full wave-animation"
                    style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span>Speaking...</span>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 scale-110 glow'
                  : 'bg-white/10 hover:bg-white/20 border border-white/20'
              }`}>
              <span className="text-xl">{isListening ? '⏹' : '🎤'}</span>
            </button>
            <div className="flex-1 flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(input)
                  }
                }}
                placeholder="Type a message or hold mic to speak..."
                rows={1}
                className="flex-1 bg-white/10 text-white placeholder-gray-500 px-4 py-3 rounded-xl border border-white/20 resize-none outline-none focus:border-violet-400 transition-colors"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition-colors font-medium">
                Send
              </button>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
