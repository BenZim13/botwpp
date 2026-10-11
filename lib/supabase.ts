import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  message_id?: string;
}

export interface ContratacionData {
  telefono_cliente: string;
  dni_o_usuario?: string;
  oficio_detectado?: string;
  problema_descripcion: string;
  profesional_nombre: string;
  fecha_hora_visita: string;
  direccion: string;
}

/**
 * Obtiene el historial de conversación para un número de teléfono
 */
export async function getChatHistory(telefono: string, limit = 10): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('mensajes_historial')
      .select('message, created_at')
      .eq('session_id', telefono)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => row.message as ChatMessage);
  } catch (err) {
    console.error('Error al obtener historial de chat:', err);
    return [];
  }
}

/**
 * Guarda un mensaje en el historial de la conversación
 */
export async function saveChatMessage(telefono: string, role: 'user' | 'model', text: string, messageId?: string) {
  try {
    const messagePayload: ChatMessage = { role, text };
    if (messageId) {
      messagePayload.message_id = messageId;
    }

    await supabase.from('mensajes_historial').insert({
      session_id: telefono,
      message: messagePayload,
    });
  } catch (err) {
    console.error('Error al guardar mensaje en historial:', err);
  }
}

/**
 * Verifica si un mensaje ya fue procesado para evitar duplicados de Meta
 */
export async function isMessageAlreadyProcessed(messageId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('mensajes_historial')
      .select('id')
      .contains('message', { message_id: messageId })
      .limit(1);

    return Boolean(data && data.length > 0);
  } catch (err) {
    return false;
  }
}

/**
 * Guarda la contratación confirmada en la tabla contrataciones
 */
export async function saveContratacion(contratacion: ContratacionData) {
  try {
    const { data, error } = await supabase
      .from('contrataciones')
      .insert({
        telefono_cliente: contratacion.telefono_cliente,
        dni_o_usuario: contratacion.dni_o_usuario || null,
        oficio_detectado: contratacion.oficio_detectado || null,
        problema_descripcion: contratacion.problema_descripcion,
        profesional_nombre: contratacion.profesional_nombre,
        fecha_hora_visita: contratacion.fecha_hora_visita,
        direccion: contratacion.direccion,
        estado: 'confirmada'
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando contratacion en Supabase:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error en saveContratacion:', err);
    return null;
  }
}

/**
 * Registra el mensaje saliente y valida que no supere el límite mensual
 */
export async function checkAndIncrementUsage(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('registrar_mensaje_saliente');
    if (error) {
      console.warn('Advertencia al registrar mensaje saliente en Supabase:', error);
      return true;
    }
    return data ?? true;
  } catch (err) {
    return true;
  }
}
