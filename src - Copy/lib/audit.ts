import { supabase } from '@/lib/supabase';

export async function logAudit(params: {
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await supabase.from('audit_logs').insert({
      org_id: params.org_id,
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      details: params.details ?? null,
    });
  } catch {
    // audit logging is best-effort; never block the user action
  }
}

export async function notify(params: {
  org_id: string;
  user_id?: string | null;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}) {
  try {
    await supabase.from('notifications').insert({
      org_id: params.org_id,
      user_id: params.user_id ?? null,
      title: params.title,
      body: params.body ?? null,
      type: params.type ?? 'info',
      link: params.link ?? null,
    });
  } catch {
    // best-effort
  }
}
