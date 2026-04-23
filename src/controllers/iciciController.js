const prisma = require('../config/prismaClient');

// GET /api/icici/callback — ICICI Payment Callback
exports.handleCallback = async (req, res) => {
    try {
        const payload = req.query;

        console.log('[ICICI CALLBACK] Received:', JSON.stringify(payload, null, 2));

        // Return success acknowledgement
        res.json({
            success: true,
            message: 'ICICI callback received',
            data: payload
        });

    } catch (error) {
        console.error('[ICICI CALLBACK ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Callback processing failed',
            error: error.message
        });
    }
};

// GET /api/icici/webhook — ICICI Webhook (often used for verification)
exports.handleWebhook = async (req, res) => {
    try {
        const queryParams = req.query;
        console.log('[ICICI WEBHOOK GET] Received:', JSON.stringify(queryParams, null, 2));

        // ICICI often expects a simple "OK" or "SUCCESS" string for verification
        // Returning a structured JSON for now, but can be changed to res.send("OK") if needed.
        res.status(200).json({
            status: 'SUCCESS',
            message: 'Webhook verification successful',
            timestamp: new Date().toISOString(),
            received_params: queryParams
        });

    } catch (error) {
        console.error('[ICICI WEBHOOK GET ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Webhook verification failed',
            error: error.message
        });
    }
};

// POST /api/icici/webhook — ICICI Webhook (actual data delivery)
exports.processWebhook = async (req, res) => {
    try {
        const payload = req.body;
        console.log('[ICICI WEBHOOK POST] Received:', JSON.stringify(payload, null, 2));

        // TODO: Implement transaction processing logic here
        
        res.status(200).json({
            status: 'SUCCESS',
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        console.error('[ICICI WEBHOOK POST ERROR]', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Webhook processing failed',
            error: error.message
        });
    }
};
