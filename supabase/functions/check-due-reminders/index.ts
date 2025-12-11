import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Task {
  id: string;
  title: string;
  tags: string[];
  due_date: string;
  priority: string;
}

function extractOwnerFromTags(tags: string[]): string | null {
  const ownerTag = tags.find((tag) => tag.startsWith('@'));
  return ownerTag ? ownerTag.substring(1) : null;
}

function formatTimeRemaining(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes <= 0) {
    return '已过期';
  } else if (diffMinutes < 60) {
    return `还剩 ${diffMinutes} 分钟`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `还剩 ${hours} 小时 ${minutes} 分钟`;
  }
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

    console.log("[Reminder Check] 开始检查即将过期的任务...");

    // Calculate time window: now to 2 hours from now
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Query tasks that need reminders
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, tags, due_date, priority")
      .neq("status", "done")
      .not("due_date", "is", null)
      .lte("due_date", twoHoursLater.toISOString())
      .gt("due_date", now.toISOString())
      .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString()}`);

    if (tasksError) {
      console.error("[Reminder Check] 查询任务失败:", tasksError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to query tasks" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Reminder Check] 找到 ${tasks?.length || 0} 个需要提醒的任务`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0, message: "No tasks need reminders" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Send reminders for each task
    for (const task of tasks) {
      const owner = extractOwnerFromTags(task.tags || []);
      
      if (!owner) {
        console.log(`[Reminder Check] 任务 ${task.id} 没有指定负责人，跳过`);
        results.push({
          task_id: task.id,
          status: "skipped",
          reason: "No owner specified",
        });
        continue;
      }

      const timeRemaining = formatTimeRemaining(task.due_date);
      const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      
      const message = `⏰ 任务即将过期提醒\n\n` +
        `任务: ${task.title}\n` +
        `优先级: ${priorityEmoji} ${task.priority}\n` +
        `截止时间: ${new Date(task.due_date).toLocaleString('zh-CN')}\n` +
        `${timeRemaining}`;

      try {
        // Call feishu-notify edge function
        const notifyResponse = await fetch(
          `${supabaseUrl}/functions/v1/feishu-notify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              ownerName: owner,
              message: message,
            }),
          }
        );

        const notifyResult = await notifyResponse.json();

        if (notifyResult.success) {
          // Update last_reminder_sent
          await supabase
            .from("tasks")
            .update({ last_reminder_sent: now.toISOString() })
            .eq("id", task.id);

          successCount++;
          results.push({
            task_id: task.id,
            status: "success",
            owner: owner,
          });
          console.log(`[Reminder Check] 成功发送提醒: ${task.title} -> ${owner}`);
        } else {
          failureCount++;
          results.push({
            task_id: task.id,
            status: "failed",
            owner: owner,
            error: notifyResult.error,
          });
          console.error(`[Reminder Check] 发送提醒失败: ${task.title}`, notifyResult.error);
        }
      } catch (error) {
        failureCount++;
        results.push({
          task_id: task.id,
          status: "error",
          owner: owner,
          error: error.message,
        });
        console.error(`[Reminder Check] 发送提醒异常: ${task.title}`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: successCount,
        failures: failureCount,
        total_tasks: tasks.length,
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Reminder Check] 异常:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
