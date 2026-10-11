/**
 * Envía un mensaje de texto por WhatsApp usando la Cloud API oficial de Meta
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  incomingPhoneNumberId?: string
): Promise<boolean> {
  const phoneNumberId =
    incomingPhoneNumberId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.PHONE_NUMBER_ID ||
    process.env.WHATSAPP_NUMBER_ID ||
    '1394320870427344';

  const token =
    process.env.WHATSAPP_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.META_TOKEN ||
    process.env.TOKEN ||
    process.env.ACCESS_TOKEN;

  if (!token) {
    console.error('Falta el Token de WhatsApp. Variables detectadas en Vercel:', 
      Object.keys(process.env).filter(k => 
        k.toUpperCase().includes('TOKEN') || 
        k.toUpperCase().includes('WHATSAPP') || 
        k.toUpperCase().includes('META')
      )
    );
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

    const result = await response.json();
    console.log('✅ Mensaje enviado exitosamente por WhatsApp:', result);
    return true;
  } catch (error) {
    console.error('Excepción al enviar mensaje por WhatsApp:', error);
    return false;
  }
}
