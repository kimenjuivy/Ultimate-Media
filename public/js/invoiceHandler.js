// public/js/invoiceHandler.js
import { supabase } from '../config/supabase.js';

export function setupInvoiceHandlers() {
    // Download invoice
    document.getElementById('download-invoice').addEventListener('click', async (e) => {
        const invoiceId = e.target.getAttribute('data-invoice-id');
        
        // In a real app, we would:
        // 1. Fetch the PDF from Supabase Storage
        // 2. Trigger download
        // For now, we'll simulate it
        
        const { data: invoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('id', invoiceId)
            .single();

        if (invoice) {
            alert(`In a real app, this would download invoice ${invoice.invoice_number}.pdf`);
            // window.open(`/api/invoices/${invoiceId}/download`, '_blank');
        }
    });

    // Simulate payment
    document.getElementById('simulate-payment').addEventListener('click', async (e) => {
        const invoiceId = e.target.getAttribute('data-invoice-id');
        
        // Update invoice status
        const { error } = await supabase
            .from('invoices')
            .update({
                payment_status: 'paid',
                payment_method: 'mpesa',
                amount_paid: invoice.amount_due
            })
            .eq('id', invoiceId);

        if (error) {
            console.error('Error updating invoice:', error);
            return;
        }

        // Create payment record
        await supabase
            .from('payments')
            .insert([{
                invoice_id: invoiceId,
                user_id: (await supabase.auth.getUser()).data.user.id,
                payment_reference: `MPESA-${Math.floor(100000 + Math.random() * 900000)}`,
                amount: invoice.amount_due,
                payment_method: 'mpesa',
                status: 'success'
            }]);

        alert('Payment simulated successfully!');
        window.location.reload();
    });
}