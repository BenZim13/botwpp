/**
 * Envía un mensaje de texto por WhatsApp usando la Cloud API oficial de Meta
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('Faltan variables de entorno WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_TOKEN');
    return false;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error enviando mensaje por WhatsApp (${response.status}):`, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Excepción al enviar mensaje por WhatsApp:', error);
    return false;
  }
}
