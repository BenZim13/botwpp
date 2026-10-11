import { ChatMessage, ContratacionData, saveContratacion } from './supabase.js';

const SYSTEM_INSTRUCTION = `Eres Yaca, el asistente virtual oficial de YacaJobs (plataforma de oficios y servicios para el hogar en Argentina).
Tu personalidad es cordial, empática, servicial y eficiente, usando el trato cercano argentino ("vos").

Tu misión es guiar al cliente por este recorrido estricto de 4 pasos:

1. SALUDO E IDENTIFICACIÓN:
   Si la conversación recién inicia o el cliente saluda:
   Responde: "¡Hola! Soy Yaca, el asistente de YacaJobs. 👷‍♂️ ¿Cuál es tu nombre de usuario o DNI?"

2. CONSULTA DEL PROBLEMA:
   Una vez que el cliente te dé su DNI o nombre de usuario:
   Responde: "Contame, ¿qué problema tenés?"

3. RECOMENDACIÓN DE CANDIDATOS Y SOLICITUD DE DATOS:
   Cuando el cliente describa su problema:
   - Identifica el oficio necesario (Plomería, Electricidad, Cerrajería, Gas, Pintura, etc.).
   - Recomienda exactamente 3 candidatos destacados con su calificación de estrellas. Por ejemplo:
     * Si es Plomería: 1. Juan Pérez (⭐⭐⭐⭐⭐ 5 estrellas), 2. Josué David (⭐⭐⭐⭐ 4 estrellas), 3. Ramón Sorabella (⭐⭐⭐ 3 estrellas).
     * Si es Electricidad: 1. Carlos Gómez (⭐⭐⭐⭐⭐ 5 estrellas), 2. Martín Rodríguez (⭐⭐⭐⭐ 4 estrellas), 3. Esteban Quito (⭐⭐⭐ 3 estrellas).
     * Si es Cerrajería: 1. Lucas Varela (⭐⭐⭐⭐⭐ 5 estrellas), 2. Pedro Morales (⭐⭐⭐⭐ 4 estrellas), 3. Santiago Silva (⭐⭐⭐ 3 estrellas).
     * Para otros oficios: propone 3 candidatos con 5, 4 y 3 estrellas.
   - Pregúntale al cliente:
     "Perfecto. Te recomendamos profesionales del oficio de [Oficio]. Estos son los 3 mejores candidatos:
     1. [Nombre 1] ([Estrellas])
     2. [Nombre 2] ([Estrellas])
     3. [Nombre 3] ([Estrellas])
     ¿A quién deseás contratar? Y decime por favor el día, hora y dirección donde deseás que el profesional te atienda."

4. CONFIRMACIÓN Y REGISTRO:
   Cuando el cliente elija al profesional e indique día, hora y dirección:
   - Debes llamar inmediatamente a la herramienta "guardar_contratacion".
   - Al confirmarlo, el mensaje final debe ser exactamente:
     "¡Perfecto, ya está completada la contratación! 🎉 El profesional [Nombre Profesional] irá a atender el problema de [Resumen del problema] el día [Día y Hora] en la dirección [Dirección]. ¡Gracias por confiar en YacaJobs! 🙌"

REGLAS CLAVE:
- No saltes pasos.
- Si en el paso 3 el cliente olvida la dirección o el día, pídele amablemente el dato faltante antes de confirmar.
- Responde siempre de forma clara y adaptada a WhatsApp.`;

const TOOLS_DECLARATION = [
  {
    function_declarations: [
      {
        name: 'guardar_contratacion',
        description: 'Guarda la contratación confirmada en la base de datos de Supabase.',
        parameters: {
          type: 'OBJECT',
          properties: {
            dni_o_usuario: {
              type: 'STRING',
              description: 'DNI o nombre de usuario del cliente'
            },
            oficio_detectado: {
              type: 'STRING',
              description: 'El oficio requerido (ej: Plomería, Electricidad)'
            },
            problema_descripcion: {
              type: 'STRING',
              description: 'Descripción breve del problema'
            },
            profesional_nombre: {
              type: 'STRING',
              description: 'Nombre del profesional contratado'
            },
            fecha_hora_visita: {
              type: 'STRING',
              description: 'Día y hora acordados'
            },
            direccion: {
              type: 'STRING',
              description: 'Dirección completa donde se realizará el trabajo'
            }
          },
          required: [
            'problema_descripcion',
            'profesional_nombre',
            'fecha_hora_visita',
            'direccion'
          ]
        }
      }
    ]
  }
];

export async function processMessageWithGemini(
  telefono: string,
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Lo siento, hay un inconveniente temporal con la configuración del servicio. Por favor intenta más tarde.';
  }

  const contents: any[] = [];

  for (const h of history) {
    contents.push({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents: contents,
        tools: TOOLS_DECLARATION,
        generationConfig: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Error llamando a Gemini API:', err);
      return '¡Hola! Soy Yaca de YacaJobs. Estoy teniendo un momento de alta demanda, ¿podrías volver a escribirme en unos instantes?';
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let replyText = '';
    let functionCall: any = null;

    for (const part of parts) {
      if (part.text) {
        replyText += part.text;
      }
      if (part.functionCall) {
        functionCall = part.functionCall;
      }
    }

    if (functionCall && functionCall.name === 'guardar_contratacion') {
      const args = functionCall.args || {};
      const contratacionPayload: ContratacionData = {
        telefono_cliente: telefono,
        dni_o_usuario: args.dni_o_usuario,
        oficio_detectado: args.oficio_detectado,
        problema_descripcion: args.problema_descripcion || 'Servicio del hogar',
        profesional_nombre: args.profesional_nombre || 'Profesional asignado',
        fecha_hora_visita: args.fecha_hora_visita || 'A coordinar',
        direccion: args.direccion || 'Domicilio acordado'
      };

      await saveContratacion(contratacionPayload);

      if (!replyText || replyText.trim() === '') {
        replyText = `¡Perfecto, ya está completada la contratación! 🎉 El profesional ${contratacionPayload.profesional_nombre} irá a atender el problema de ${contratacionPayload.problema_descripcion} el día ${contratacionPayload.fecha_hora_visita} en ${contratacionPayload.direccion}. ¡Gracias por confiar en YacaJobs! 🙌`;
      }
    }

    return replyText.trim();
  } catch (error) {
    console.error('Excepción procesando mensaje con Gemini:', error);
    return '¡Hola! Soy Yaca de YacaJobs. ¿Podrías reiterar tu mensaje por favor?';
  }
}
