import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { messages, provider = 'openai' } = await req.json()

  try {
    if (provider === 'openai') {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const res = await client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000,
      })
      return NextResponse.json({ content: res.choices[0].message.content })
    }

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const res = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      })
      return NextResponse.json({ content: (res.content[0] as any).text })
    }

    if (provider === 'google') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      const lastMsg = messages[messages.length - 1]
      const result = await model.generateContent(lastMsg.content)
      return NextResponse.json({ content: result.response.text() })
    }

    if (provider === 'aimlapi') {
      const res = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AIMLAPI_KEY}`,
        },
        body: JSON.stringify({ model: 'gpt-4o', messages, max_tokens: 1000 }),
      })
      const data = await res.json()
      return NextResponse.json({ content: data.choices[0].message.content })
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
