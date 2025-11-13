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
  taskTitle?: string;
  priority?: string;
  dueDate?: string;
}

interface FeishuWebhookData {
  webhook_url: string;
  is_enabled: boolean;
  open_id: string | null;
  enable_mention: boolean;
}

function buildTextMessage(message: string) {
  return {
    msg_type: "text",
    content: {
      text: message,
    },
  };
}

function buildRichTextMessage(
  message: string,
  taskTitle: string,
  openId: string,
  priority?: string,
  dueDate?: string
) {
  const contentLines: any[][] = [];

  const firstLine: any[] = [
    {
      tag: "text",
      text: message,
    },
  ];
  contentLines.push(firstLine);

  const mentionLine: any[] = [
    {
      tag: "at",
      user_id: openId,
    },
  ];
  contentLines.push(mentionLine);

  if (priority || dueDate) {
    const detailLine: any[] = [];
    if (priority) {
      detailLine.push({
        tag: "text",
        text: `优先级：${priority}`,
      });
    }
    if (dueDate) {
      if (detailLine.length > 0) {
        detailLine.push({
          tag: "text",
          text: " | ",
        });
      }
      detailLine.push({
        tag: "text",
        text: `截止时间：${dueDate}`,
      });
    }
    contentLines.push(detailLine);
  }

  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: "任务通知",
          content: contentLines,
        },
      },
    },
  };
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

    const requestData: NotificationRequest = await req.json();
    const { ownerName, message, taskTitle, priority, dueDate } = requestData;

    console.log("[Feishu Edge] 收到通知请求:", { ownerName, message, taskTitle });

    const { data: webhookData, error: webhookError } = await supabase
      .from("feishu_webhooks")
      .select("webhook_url, is_enabled, open_id, enable_mention")
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

    const typedWebhookData = webhookData as FeishuWebhookData;

    console.log("[Feishu Edge] Webhook 配置:", {
      hasOpenId: !!typedWebhookData.open_id,
      enableMention: typedWebhookData.enable_mention,
    });

    let payload;
    const shouldUseMention =
      typedWebhookData.enable_mention &&
      typedWebhookData.open_id &&
      taskTitle;

    if (shouldUseMention) {
      console.log("[Feishu Edge] 使用富文本 @人格式");
      payload = buildRichTextMessage(
        message,
        taskTitle,
        typedWebhookData.open_id!,
        priority,
        dueDate
      );
    } else {
      console.log("[Feishu Edge] 使用简单文本格式");
      payload = buildTextMessage(message);
    }

    console.log("[Feishu Edge] 发送消息到飞书...");
    const webhookResponse = await fetch(typedWebhookData.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await webhookResponse.text();
    console.log("[Feishu Edge] 飞书响应:", webhookResponse.status, responseText);

    if (!webhookResponse.ok) {
      if (shouldUseMention) {
        console.log("[Feishu Edge] 富文本失败，尝试降级为简单文本...");
        const fallbackPayload = buildTextMessage(message);
        const fallbackResponse = await fetch(typedWebhookData.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackPayload),
        });

        const fallbackText = await fallbackResponse.text();
        console.log("[Feishu Edge] 降级发送结果:", fallbackResponse.status, fallbackText);

        if (fallbackResponse.ok) {
          return new Response(
            JSON.stringify({ success: true, fallback: true, response: fallbackText }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

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
      JSON.stringify({ success: true, usedMention: shouldUseMention, response: responseText }),
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