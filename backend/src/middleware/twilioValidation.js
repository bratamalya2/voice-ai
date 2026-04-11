const twilio = require('twilio');

/**
 * Validates that incoming requests are genuinely from Twilio.
 * Skipped in development when TWILIO_WEBHOOK_VALIDATION=false.
 */
function twilioValidation(req, res, next) {
  if (process.env.TWILIO_WEBHOOK_VALIDATION === 'false') {
    return next();
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const webhookUrl = `${process.env.APP_BASE_URL}${req.originalUrl}`;
  const twilioSignature = req.headers['x-twilio-signature'] || '';

  const valid = twilio.validateRequest(authToken, twilioSignature, webhookUrl, req.body);

  if (!valid) {
    return res.status(403).type('text/plain').send('Forbidden: invalid Twilio signature');
  }

  next();
}

module.exports = twilioValidation;
