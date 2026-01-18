// Vercel Serverless Function to proxy OpenAI requests
// This keeps the API key hidden from the frontend
// Supports both regular and streaming responses

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, model, temperature, max_tokens, stream } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key is not configured on the server' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
                messages: messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 500,
                stream: stream || false
            })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        // Handle streaming response
        if (stream) {
            // Set headers for Server-Sent Events
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');

            // Pipe the OpenAI stream to the client
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        res.end();
                        break;
                    }

                    // Decode and forward the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    res.write(chunk);
                }
            } catch (streamError) {
                console.error('Stream error:', streamError);
                res.end();
            }
        } else {
            // Handle regular non-streaming response
            const data = await response.json();
            return res.status(200).json(data);
        }
    } catch (error) {
        console.error('API proxy error:', error);
        return res.status(500).json({ error: 'Failed to communicate with OpenAI' });
    }
}
