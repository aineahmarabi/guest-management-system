export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'super_admin' | 'event_manager'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role: 'super_admin' | 'event_manager'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'super_admin' | 'event_manager'
          is_active?: boolean
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          name: string
          description: string | null
          venue: string
          event_date: string
          event_time: string
          status: 'draft' | 'active' | 'completed'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          venue: string
          event_date: string
          event_time: string
          status?: 'draft' | 'active' | 'completed'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          venue?: string
          event_date?: string
          event_time?: string
          status?: 'draft' | 'active' | 'completed'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guests: {
        Row: {
          id: string
          event_id: string
          full_name: string
          email: string
          phone: string | null
          ticket_id: string
          escort_count: number
          checked_in: boolean
          checked_in_at: string | null
          pdf_generated: boolean
          email_sent: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          full_name: string
          email: string
          phone?: string | null
          ticket_id: string
          escort_count?: number
          checked_in?: boolean
          checked_in_at?: string | null
          pdf_generated?: boolean
          email_sent?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          ticket_id?: string
          escort_count?: number
          checked_in?: boolean
          checked_in_at?: string | null
          pdf_generated?: boolean
          email_sent?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      escorts: {
        Row: {
          id: string
          guest_id: string
          full_name: string
          id_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          guest_id: string
          full_name: string
          id_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          guest_id?: string
          full_name?: string
          id_number?: string | null
          created_at?: string
        }
      }
      email_logs: {
        Row: {
          id: string
          event_id: string | null
          guest_id: string | null
          sent_at: string
          status: 'sent' | 'failed'
          error_message: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          guest_id?: string | null
          sent_at?: string
          status: 'sent' | 'failed'
          error_message?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          guest_id?: string | null
          sent_at?: string
          status?: 'sent' | 'failed'
          error_message?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Guest = Database['public']['Tables']['guests']['Row']
export type Escort = Database['public']['Tables']['escorts']['Row']
export type EmailLog = Database['public']['Tables']['email_logs']['Row']
