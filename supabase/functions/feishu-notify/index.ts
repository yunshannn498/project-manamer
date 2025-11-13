import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  ownerName: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ownerName, message }: NotificationRequest = await req.json();

    console.log("[Feishu Edge] 收到通知请求:", { ownerName, message });

    const { data: webhookData, error: webhookError } = await supabase
      .from("feishu_webhooks")
      .select("webhook_url, is_enabled")
      .eq("owner_name", ownerName)
      .eq("is_enabled", true)
      .maybeSingle();

    if (webhookError) {
      console.error("[Feishu Edge] 数据库查询错误:", webhookError);
      return new Response(
        JSON.stringify({ success: false, error: "Database query failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!webhookData) {
      console.warn("[Feishu Edge] 未找到 webhook 配置:", ownerName);
      return new Response(
        JSON.stringify({ success: false, error: "Webhook not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[Feishu Edge] 找到 webhook，准备发送...");

    // 使用简单的 text 消息，一次性发送所有内容
    const payload = {
      msg_type: "text",
      content: {
        text: message
      }
    };

    console.log("[Feishu Edge] 发送消息:", JSON.stringify(payload));

    const webhookResponse = await fetch(webhookData.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await webhookResponse.text();
    console.log("[Feishu Edge] 飞书响应:", webhookResponse.status, responseText);

    if (!webhookResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Feishu webhook failed",
          status: webhookResponse.status,
          response: responseText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, response: responseText }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Feishu Edge] 异常:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
