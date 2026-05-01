import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audio = formData.get('audio') as File
  const provider = formData.get('provider') as string || 'deepgram'

  try {
    if (provider === 'deepgram') {
      const audioBuffer = await audio.arrayBuffer()
      const res = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/webm',
          },
          body: audioBuffer,
        }
      )
      const data = await res.json()
      const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
      return NextResponse.json({ transcript })
    }

    if (provider === 'azure') {
      const region = process.env.AZURE_SPEECH_REGION || 'eastus2'
      const key = process.env.AZURE_SPEECH_KEY
      const audioBuffer = await audio.arrayBuffer()
      const res = await fetch(
        `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key!,
            'Content-Type': 'audio/webm; codecs=opus',
          },
          body: audioBuffer,
        }
      )
      const data = await res.json()
      return NextResponse.json({ transcript: data.DisplayText || '' })
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
