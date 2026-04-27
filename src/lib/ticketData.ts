import { supabase } from './supabaseClient';
import type { Ticket, TicketReply, TicketCategory, TicketPriority, TicketStatus } from '../types';

/*
 * ═══════════════════════════════════════════
 * Ticket Data Access Layer
 * ───────────────────────────────────────────
 * Supabase ops for tickets & replies.
 * Guest mode uses localStorage fallback.
 * ═══════════════════════════════════════════
 */

// ── localStorage helpers (guest fallback) ──

export function loadTicketsLocal(): Ticket[] {
  try { return JSON.parse(localStorage.getItem('odt_tickets') || '[]'); }
  catch { return []; }
}

export function saveTicketsLocal(tickets: Ticket[]) {
  localStorage.setItem('odt_tickets', JSON.stringify(tickets));
}

export function loadRepliesLocal(ticketId: string): TicketReply[] {
  try { return JSON.parse(localStorage.getItem(`odt_replies_${ticketId}`) || '[]'); }
  catch { return []; }
}

export function saveRepliesLocal(ticketId: string, replies: TicketReply[]) {
  localStorage.setItem(`odt_replies_${ticketId}`, JSON.stringify(replies));
}

// ── Supabase: Tickets ──

export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchTickets error:', error);
    return [];
  }
  return data || [];
}

export async function createTicket(ticket: {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  project_id?: string;
  project_name?: string;
}): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      id: ticket.id,
      user_id: ticket.user_id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: 'open' as TicketStatus,
      project_id: ticket.project_id || null,
      project_name: ticket.project_name || null,
    })
    .select()
    .single();

  if (error) {
    console.error('createTicket error:', error);
    return null;
  }
  return data;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId);

  if (error) {
    console.error('updateTicketStatus error:', error);
    return false;
  }
  return true;
}

export async function deleteTicket(ticketId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId);

  if (error) {
    console.error('deleteTicket error:', error);
    return false;
  }
  return true;
}

// ── Supabase: Replies ──

export async function fetchReplies(ticketId: string): Promise<TicketReply[]> {
  const { data, error } = await supabase
    .from('ticket_replies')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchReplies error:', error);
    return [];
  }
  return data || [];
}

export async function createReply(reply: {
  id: string;
  ticket_id: string;
  user_id: string;
  username: string;
  message: string;
  is_staff: boolean;
}): Promise<TicketReply | null> {
  const { data, error } = await supabase
    .from('ticket_replies')
    .insert(reply)
    .select()
    .single();

  if (error) {
    console.error('createReply error:', error);
    return null;
  }
  return data;
}
