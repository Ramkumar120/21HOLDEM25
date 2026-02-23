const { SquareClient, SquareEnvironment } = require('square');
const { WebhooksHelper } = require('square');

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,
});

const services = {};

services.createPayment = async (amount, currency, sourceId, customerId, transactionId) => {
  try {
    const res = await client.payments.create({
      sourceId: sourceId,
      idempotencyKey: transactionId, // Because this has to be unique
      referenceId: transactionId, // for callback referenceId
      amountMoney: {
        amount: BigInt(amount),
        currency: currency,
      },
      customerId: customerId,
    });

    const paymentResult = JSON.parse(JSON.stringify(res, (key, value) => (typeof value === 'bigint' ? value.toString() : value)));

    return paymentResult;
  } catch (error) {
    console.log('square createPayment error ::', error);
    throw error;
  }
};

services.getPayment = async transactionId => {
  try {
    const res = await client.payments.get({ paymentId: transactionId });
    const paymentResult = JSON.parse(JSON.stringify(res, (key, value) => (typeof value === 'bigint' ? value.toString() : value)));

    return paymentResult;
  } catch (error) {
    console.log('square getPayment error ::', error);
    throw error;
  }
};

services.webhookCallback = async req => {
  try {
    const signature = req.headers['x-square-signature'];
    const rawBody = JSON.stringify(req.body);

    const isValid = await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader: signature,
      signatureKey: process.env.SQUARE_SIGNATUREKEY_SECRET,
      notificationUrl: `${process.env.BASE_API_PATH}/transaction/square/buyhook`,
    });

    if (!isValid) return false;

    return true;
  } catch (error) {
    console.log('square webhook error ::', error);
    throw error;
  }
};
module.exports = services;
