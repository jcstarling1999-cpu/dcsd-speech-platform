import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, provider = 'elevenlabs', voiceId = '21m00Tcm4TlvDq8ikWAM' } = await req.json()

  try {
    if (provider === 'elevenlabs') {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      )
      const audio = await res.arrayBuffer()
      return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg' } })
    }

    if (provider === 'deepgram') {
      const res = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
        method: 'POST',
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      const audio = await res.arrayBuffer()
      return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg' } })
    }

    if (provider === 'azure') {
      const region = process.env.AZURE_SPEECH_REGION || 'eastus2'
      const key = process.env.AZURE_SPEECH_KEY
      const tokenRes = await fetch(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key! } }
      )
      const token = await tokenRes.text()
      const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>${text}</voice></speak>`
      const audioRes = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          },
          body: ssml,
        }
      )
      const audio = await audioRes.arrayBuffer()
      return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg' } })
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
