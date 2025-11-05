// This file will be generated from your Supabase schema
// For now, we'll use a placeholder type

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
      companies: {
        Row: {
          id: string
          name: string
          default_currency: string
          default_tax_code: string | null
          default_gl_account: string | null
          duplicate_detection_sensitivity: number
          require_invoice_number: boolean
          max_file_size_mb: number
          data_retention_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          default_currency?: string
          default_tax_code?: string | null
          default_gl_account?: string | null
          duplicate_detection_sensitivity?: number
          require_invoice_number?: boolean
          max_file_size_mb?: number
          data_retention_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          default_currency?: string
          default_tax_code?: string | null
          default_gl_account?: string | null
          duplicate_detection_sensitivity?: number
          require_invoice_number?: boolean
          max_file_size_mb?: number
          data_retention_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          vendor_id: string | null
          invoice_number: string | null
          po_number: string | null
          invoice_date: string | null
          due_date: string | null
          payment_terms: string | null
          currency: string
          subtotal: number
          tax_total: number
          discount: number
          total: number
          status: string
          confidence: Json
          raw_ocr: string | null
          source_email: Json | null
          attachment_urls: string[]
          mime_types: string[]
          language_detected: string | null
          sync_error: string | null
          external_id: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          vendor_id?: string | null
          invoice_number?: string | null
          po_number?: string | null
          invoice_date?: string | null
          due_date?: string | null
          payment_terms?: string | null
          currency?: string
          subtotal?: number
          tax_total?: number
          discount?: number
          total: number
          status?: string
          confidence: Json
          raw_ocr?: string | null
          source_email?: Json | null
          attachment_urls?: string[]
          mime_types?: string[]
          language_detected?: string | null
          sync_error?: string | null
          external_id?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          vendor_id?: string | null
          invoice_number?: string | null
          po_number?: string | null
          invoice_date?: string | null
          due_date?: string | null
          payment_terms?: string | null
          currency?: string
          subtotal?: number
          tax_total?: number
          discount?: number
          total?: number
          status?: string
          confidence?: Json
          raw_ocr?: string | null
          source_email?: Json | null
          attachment_urls?: string[]
          mime_types?: string[]
          language_detected?: string | null
          sync_error?: string | null
          external_id?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
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
      user_role: 'admin' | 'accountant' | 'approver' | 'viewer'
      invoice_status: 'inbox' | 'needs_review' | 'approved' | 'synced' | 'rejected' | 'duplicate'
      integration_type: 'quickbooks' | 'xero' | 'gmail' | 'outlook' | 'imap'
    }
  }
}
