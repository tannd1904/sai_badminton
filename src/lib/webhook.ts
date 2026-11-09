/**
 * Webhook Dispatcher for Match Announcements & Emergency Alerts
 * Supports Slack, Discord, Telegram, and generic JSON webhooks.
 */

export interface WebhookNotificationPayload {
  title: string;
  matchCode: string;
  courtNumber: number;
  category: string;
  teamA: string;
  teamB: string;
  scheduledTime?: string;
  customMessage?: string;
}

export async function sendMatchAnnouncementWebhook(payload: WebhookNotificationPayload) {
  const webhookUrl = process.env.WEBHOOK_URL;
  const message = payload.customMessage || `🏸 UPCOMING MATCH: [${payload.category}] ${payload.matchCode} - ${payload.teamA} vs ${payload.teamB} on Court ${payload.courtNumber} starts in 5 minutes!`;

  console.log(`[Webhook Announcement] Triggered: ${message}`);

  if (!webhookUrl) {
    return {
      success: true,
      simulated: true,
      message: `Simulated webhook delivery (No WEBHOOK_URL configured). Announcement: "${message}"`,
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message, // Slack/Mattermost format
        content: message, // Discord format
        data: payload,
        timestamp: new Date().toISOString(),
      }),
    });

    return {
      success: res.ok,
      status: res.status,
      message: res.ok ? 'Webhook successfully dispatched!' : `Webhook returned HTTP ${res.status}`,
    };
  } catch (error: any) {
    console.error('[Webhook Error]', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
