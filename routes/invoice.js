const express = require('express');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth'); // Fixed import
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configure email transporter
const transporter = nodemailer.createTransport({ // Fixed method name
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Generate PDF invoice
const generateInvoicePDF = async (invoiceData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header
            doc.fontSize(20).text('ULTIMATE MEDIA', 50, 50);
            doc.fontSize(10).text(process.env.COMPANY_ADDRESS, 50, 80);
            doc.text(`Phone: ${process.env.COMPANY_PHONE}`, 50, 95);
            doc.text(`Email: ${process.env.COMPANY_EMAIL}`, 50, 110);

            // Invoice details
            doc.fontSize(16).text('INVOICE', 400, 50);
            doc.fontSize(10);
            doc.text(`Invoice #: ${invoiceData.invoice_number}`, 400, 80);
            doc.text(`Date: ${new Date(invoiceData.issued_date).toLocaleDateString()}`, 400, 95);
            doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 400, 110);

            // Client details
            doc.text('Bill To:', 50, 150);
            doc.text(invoiceData.client_name, 50, 165);
            doc.text(invoiceData.client_email, 50, 180);
            doc.text(invoiceData.client_phone, 50, 195);

            // Services table header
            let yPosition = 240;
            doc.text('Description', 50, yPosition);
            doc.text('Quantity', 300, yPosition);
            doc.text('Rate', 380, yPosition);
            doc.text('Amount', 450, yPosition);
            
            // Draw line
            doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
            yPosition += 30;

            // Services items
            invoiceData.services.forEach(service => {
                doc.text(service.title, 50, yPosition);
                doc.text('1', 300, yPosition);
                doc.text(`KES ${service.base_price.toLocaleString()}`, 380, yPosition);
                doc.text(`KES ${service.base_price.toLocaleString()}`, 450, yPosition);
                yPosition += 20;
            });

            // Equipment
            if (invoiceData.equipment) {
                doc.text(invoiceData.equipment.name, 50, yPosition);
                doc.text('1', 300, yPosition);
                doc.text(`KES ${invoiceData.equipment.price.toLocaleString()}`, 380, yPosition);
                doc.text(`KES ${invoiceData.equipment.price.toLocaleString()}`, 450, yPosition);
                yPosition += 20;
            }

            // Transport
            if (invoiceData.transport_cost > 0) {
                doc.text(`Transport (${invoiceData.distance_km}km)`, 50, yPosition);
                doc.text('1', 300, yPosition);
                doc.text(`KES ${invoiceData.transport_cost.toLocaleString()}`, 380, yPosition);
                doc.text(`KES ${invoiceData.transport_cost.toLocaleString()}`, 450, yPosition);
                yPosition += 20;
            }

            // Totals
            yPosition += 20;
            doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();
            yPosition += 15;

            doc.text('Subtotal:', 350, yPosition);
            doc.text(`KES ${invoiceData.base_amount.toLocaleString()}`, 450, yPosition);
            yPosition += 15;

            doc.text('VAT (16%):', 350, yPosition);
            doc.text(`KES ${invoiceData.vat_amount.toLocaleString()}`, 450, yPosition);
            yPosition += 15;

            doc.text('Levy (0.03%):', 350, yPosition);
            doc.text(`KES ${invoiceData.levy_amount.toLocaleString()}`, 450, yPosition);
            yPosition += 15;

            doc.fontSize(12).text('Total:', 350, yPosition);
            doc.text(`KES ${invoiceData.total_amount.toLocaleString()}`, 450, yPosition);

            // Payment info
            yPosition += 40;
            doc.fontSize(10);
            doc.text('Payment Methods:', 50, yPosition);
            doc.text('• M-Pesa Paybill: 522522 (Account: ULTIMATE)', 50, yPosition + 15);
            doc.text('• Bank Transfer: Ultimate Media Ltd', 50, yPosition + 30);
            doc.text('• Credit/Debit Cards accepted', 50, yPosition + 45);

            // Footer
            doc.text('Thank you for choosing Ultimate Media!', 50, yPosition + 80);
            doc.text('For inquiries, contact us at info@ultimatemedia.co.ke', 50, yPosition + 95);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
router.get('/my-invoices', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.sub;

        const { data: invoices, error } = await supabase
            .from('invoices')
            .select(`
                *,
                transactions!inner (
                    event_date,
                    event_location,
                    status
                )
            `)
            .eq('user_id', userId)
            .order('issued_date', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data: invoices });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get invoice details
router.get('/:invoiceId', authenticateToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user.sub;

        const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
                *,
                transactions!inner (
                    *,
                    equipment_options (name, price),
                    profiles!inner (full_name, email, phone_number)
                )
            `)
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        // Get services for the transaction
        const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('title, base_price')
            .in('id', invoice.transactions.service_ids);

        if (servicesError) throw servicesError;

        invoice.transactions.services = services;

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download invoice PDF
router.get('/:invoiceId/download', authenticateToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user.sub;

        // Get invoice with all related data
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
                *,
                transactions!inner (
                    *,
                    equipment_options (name, price),
                    profiles!inner (full_name, email, phone_number)
                )
            `)
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        // Get services
        const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('title, base_price')
            .in('id', invoice.transactions.service_ids);

        if (servicesError) throw servicesError;

        // Prepare invoice data for PDF
        const invoiceData = {
            invoice_number: invoice.invoice_number,
            issued_date: invoice.issued_date,
            due_date: invoice.due_date,
            client_name: invoice.transactions.profiles.full_name,
            client_email: invoice.transactions.profiles.email,
            client_phone: invoice.transactions.profiles.phone_number,
            services: services,
            equipment: invoice.transactions.equipment_options,
            transport_cost: parseFloat(invoice.transactions.transport_cost),
            distance_km: invoice.transactions.distance_km,
            base_amount: parseFloat(invoice.transactions.base_amount),
            vat_amount: parseFloat(invoice.transactions.vat_amount),
            levy_amount: parseFloat(invoice.transactions.levy_amount),
            total_amount: parseFloat(invoice.transactions.total_amount)
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Email invoice
router.post('/:invoiceId/email', authenticateToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user.sub;

        // Get invoice details (same as download route)
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
                *,
                transactions!inner (
                    *,
                    equipment_options (name, price),
                    profiles!inner (full_name, email, phone_number)
                )
            `)
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('title, base_price')
            .in('id', invoice.transactions.service_ids);

        if (servicesError) throw servicesError;

        const invoiceData = {
            invoice_number: invoice.invoice_number,
            issued_date: invoice.issued_date,
            due_date: invoice.due_date,
            client_name: invoice.transactions.profiles.full_name,
            client_email: invoice.transactions.profiles.email,
            client_phone: invoice.transactions.profiles.phone_number,
            services: services,
            equipment: invoice.transactions.equipment_options,
            transport_cost: parseFloat(invoice.transactions.transport_cost),
            distance_km: invoice.transactions.distance_km,
            base_amount: parseFloat(invoice.transactions.base_amount),
            vat_amount: parseFloat(invoice.transactions.vat_amount),
            levy_amount: parseFloat(invoice.transactions.levy_amount),
            total_amount: parseFloat(invoice.transactions.total_amount)
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Send email
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: invoice.transactions.profiles.email,
            subject: `Invoice ${invoice.invoice_number} - Ultimate Media`,
            html: `
                <h2>Thank you for choosing Ultimate Media!</h2>
                <p>Dear ${invoice.transactions.profiles.full_name},</p>
                <p>Please find attached your invoice <strong>${invoice.invoice_number}</strong> for the services booked.</p>
                <p><strong>Total Amount:</strong> KES ${parseFloat(invoice.transactions.total_amount).toLocaleString()}</p>
                <p><strong>Event Date:</strong> ${new Date(invoice.transactions.event_date).toLocaleDateString()}</p>
                <p><strong>Location:</strong> ${invoice.transactions.event_location}</p>
                <br>
                <p>For any questions, please contact us at info@ultimatemedia.co.ke or +254 777 122 800</p>
                <br>
                <p>Best regards,<br>Ultimate Media Team</p>
            `,
            attachments: [
                {
                    filename: `invoice-${invoice.invoice_number}.pdf`,
                    content: pdfBuffer
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        // Update email sent status
        await supabase
            .from('invoices')
            .update({ email_sent: true })
            .eq('id', invoiceId);

        res.json({ success: true, message: 'Invoice sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user invoices


module.exports = router;