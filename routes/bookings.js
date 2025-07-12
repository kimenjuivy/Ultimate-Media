const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth'); // Change authenticateToken to authenticateToken
require('dotenv').config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


// Get all services
router.get('/services', async (req, res) => {
    try {
        const { data: services, error } = await supabase
            .from('services')
            .select('*')
            .eq('is_active', true)
            .order('category, title');

        if (error) throw error;

        res.json({ success: true, data: services });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all equipment options
router.get('/equipment', async (req, res) => {
    try {
        const { data: equipment, error } = await supabase
            .from('equipment_options')
            .select('*')
            .eq('is_active', true)
            .order('price');

        if (error) throw error;

        res.json({ success: true, data: equipment });
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calculate pricing

router.post('/calculate', authenticateToken, async (req, res) => {
    try {
        const { serviceIds, equipmentId, distanceKm } = req.body;

        // Get services total
        const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('base_price')
            .in('id', serviceIds);

        if (servicesError) throw servicesError;

        // Get equipment price
        let equipmentPrice = 0;
        if (equipmentId) {
            const { data: equipment, error: equipmentError } = await supabase
                .from('equipment_options')
                .select('price')
                .eq('id', equipmentId)
                .single();

            if (equipmentError && equipmentError.code !== 'PGRST116') throw equipmentError;
            equipmentPrice = equipment ? parseFloat(equipment.price) : 0;
        }

        // Calculate costs
        const servicesTotal = services.reduce((sum, service) => sum + parseFloat(service.base_price), 0);
        const transportCost = (distanceKm || 0) * parseFloat(process.env.TRANSPORT_RATE_PER_KM || 50);
        const baseAmount = servicesTotal + equipmentPrice + transportCost;
        
        // Calculate taxes
        const vatAmount = baseAmount * 0.16; // 16% VAT
        const levyAmount = baseAmount * 0.0003; // 0.03% Levy
        const totalAmount = baseAmount + vatAmount + levyAmount;

        res.json({
            success: true,
            data: {
                servicesTotal,
                equipmentPrice,
                transportCost,
                baseAmount,
                vatAmount,
                levyAmount,
                totalAmount
            }
        });
    } catch (error) {
        console.error('Error calculating price:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create booking
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.sub;
        const {
            serviceIds,
            equipmentId,
            eventDate,
            eventLocation,
            distanceKm,
            additionalNotes,
            pricing
        } = req.body;

        // Create transaction
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                service_ids: serviceIds,
                equipment_option_id: equipmentId,
                event_date: eventDate,
                event_location: eventLocation,
                distance_km: distanceKm || 0,
                transport_cost: pricing.transportCost,
                base_amount: pricing.baseAmount,
                vat_amount: pricing.vatAmount,
                levy_amount: pricing.levyAmount,
                total_amount: pricing.totalAmount,
                additional_notes: additionalNotes,
                status: 'pending'
            }])
            .select()
            .single();

        if (transactionError) throw transactionError;

        // Generate invoice number
        const { data: invoiceNumberResult, error: invoiceNumberError } = await supabase
            .rpc('generate_invoice_number');

        if (invoiceNumberError) throw invoiceNumberError;

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert([{
                user_id: userId,
                transaction_id: transaction.id,
                invoice_number: invoiceNumberResult,
                amount_due: pricing.totalAmount,
                payment_status: 'unpaid'
            }])
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        res.json({
            success: true,
            data: {
                transaction,
                invoice,
                message: 'Booking created successfully!'
            }
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.sub;

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                *,
                equipment_options (name, price),
                invoices (invoice_number, payment_status, amount_due, amount_paid)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get service details for each transaction
        const transactionsWithServices = await Promise.all(
            transactions.map(async (transaction) => {
                const { data: services, error: servicesError } = await supabase
                    .from('services')
                    .select('title, base_price')
                    .in('id', transaction.service_ids);

                if (servicesError) {
                    console.error('Error fetching services for transaction:', servicesError);
                    transaction.services = [];
                } else {
                    transaction.services = services;
                }

                return transaction;
            })
        );

        res.json({ success: true, data: transactionsWithServices });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;