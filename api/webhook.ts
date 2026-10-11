import { processMessageWithGemini } from '../lib/agent.js';
import {
  getChatHistory,
  saveChatMessage,
  isMessageAlreadyProcessed,
  checkAndIncrementUsage
} from '../lib/supabase.js';
import { sendWhatsAppMessage } from '../lib/whatsapp.js';

export default async function handler(req: any, res: any) {
  // 1. Verificación del Webhook por Meta (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook de Meta verificado con éxito');
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ Intento de verificación fallido: token incorrecto');
      return res.status(403).json({ error: 'Token de verificación inválido' });
    }
  }

  // 2. Recepción de mensajes y eventos de WhatsApp (POST)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      if (body.object !== 'whatsapp_business_account') {
        return res.status(404).send();
      }

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      const message = change?.messages?.[0];
      if (!message) {
        return res.status(200).send('STATUS_RECEIVED');
      }

      const messageId = message.id;
      const telefono = message.from;

      const alreadyProcessed = await isMessageAlreadyProcessed(messageId);
      if (alreadyProcessed) {
        console.log(`Mensaje ${messageId} ya procesado previamente. Ignorando duplicado.`);
        return res.status(200).send('DUPLICATE_IGNORED');
      }

      if (message.type !== 'text') {
        await sendWhatsAppMessage(
          telefono,
          '¡Hola! Soy Yaca de YacaJobs. Por favor escribime por texto para poder entender tu problema y recomendarte un profesional.'
        );
        await saveChatMessage(telefono, 'user', `[Mensaje no soportado: ${message.type}]`, messageId);
        return res.status(200).send('NON_TEXT_HANDLED');
      }

      const userText = message.text?.body?.trim() || '';

      const history = await getChatHistory(telefono, 8);

      await saveChatMessage(telefono, 'user', userText, messageId);

      const botReply = await processMessageWithGemini(telefono, userText, history);

      await saveChatMessage(telefono, 'model', botReply);

      const sent = await sendWhatsAppMessage(telefono, botReply);
      if (sent) {
        await checkAndIncrementUsage();
      }

      return res.status(200).send('EVENT_PROCESSED');
    } catch (error) {
      console.error('Error interno procesando webhook:', error);
      return res.status(200).send('ERROR_HANDLED');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
