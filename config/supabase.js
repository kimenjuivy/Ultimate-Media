import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xljojazexigswzfojnqh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9qYXpleGlnc3d6Zm9qbnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjY5MTAsImV4cCI6MjA2NTY0MjkxMH0.dtpgLThquxFlvXV2viuwWB3-TAFhz6InGmXR8uFqIpU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper function to get user profile
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

// Services functions
export const getServices = async () => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
  
  if (error) throw error
  return data
}

export const getEquipmentOptions = async () => {
  const { data, error } = await supabase
    .from('equipment_options')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })
  
  if (error) throw error
  return data
}

// Transaction functions
export const createTransaction = async (transactionData) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserTransactions = async (userId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      invoices (
        id,
        invoice_number,
        amount_due,
        payment_status,
        issued_date,
        due_date,
        pdf_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Invoice functions
export const createInvoice = async (invoiceData) => {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoiceData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserInvoices = async (userId) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}