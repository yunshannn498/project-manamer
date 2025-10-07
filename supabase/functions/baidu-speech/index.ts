import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BAIDU_API_KEY = "YOUR_API_KEY";
const BAIDU_SECRET_KEY = "YOUR_SECRET_KEY";

interface BaiduTokenResponse {
  access_token: string;
  expires_in: number;
}

interface BaiduSpeechResponse {
  err_no: number;
  err_msg: string;
  result: string[];
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getBaiduAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  
  const response = await fetch(tokenUrl, { method: 'POST' });
  const data: BaiduTokenResponse = await response.json();
  
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000
  };
  
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('audio/')) {
      return new Response(
        JSON.stringify({ error: '请上传音频文件' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const audioBuffer = await req.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    const accessToken = await getBaiduAccessToken();
    
    const baiduUrl = `https://vop.baidu.com/server_api?cuid=bolt-task&token=${accessToken}&dev_pid=1537`;
    
    const baiduResponse = await fetch(baiduUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'wav',
        rate: 16000,
        channel: 1,
        speech: audioBase64,
        len: audioBuffer.byteLength,
      })
    });

    const result: BaiduSpeechResponse = await baiduResponse.json();
    
    if (result.err_no === 0 && result.result && result.result.length > 0) {
      return new Response(
        JSON.stringify({ text: result.result[0] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: result.err_msg || '识别失败' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('语音识别错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});