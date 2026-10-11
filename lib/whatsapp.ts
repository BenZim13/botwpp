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

  // Normalización especial para números de celular de Argentina:
  // Meta en WhatsApp entrante a veces manda 54379... (sin el 9), pero para enviar
  // requiere 549379... (o viceversa según la lista de prueba).
  let cleanTo = to.replace(/\D/g, '');
  if (cleanTo.startsWith('54') && !cleanTo.startsWith('549') && cleanTo.length === 12) {
    cleanTo = '549' + cleanTo.slice(2);
  }

  console.log(`Intentando enviar mensaje a: ${cleanTo} (recibido original: ${to})`);

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const sendPayload = async (targetPhone: string) => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: targetPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });
  };

  try {
    let response = await sendPayload(cleanTo);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {}

      // Si falla con código 131030 (Recipient phone number not in allowed list)
      // reintentamos automáticamente con la variante alternativa (con 9 o sin 9)
      if (errorJson?.error?.code === 131030) {
        const altPhone = cleanTo.startsWith('549')
          ? '54' + cleanTo.slice(3)
          : '549' + cleanTo.slice(2);

        console.log(`Reintentando automáticamente con variante alternativa: ${altPhone}`);
        response = await sendPayload(altPhone);

        if (response.ok) {
          const resJson = await response.json();
          console.log('✅ Mensaje enviado exitosamente con variante alternativa:', resJson);
          return true;
        }
      }

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
