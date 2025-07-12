// public/js/bookingForm.js
import { supabase } from '../config/supabase.js';

export async function loadBookingForm() {
    const section = document.getElementById('new-booking-section');
    
    // Load form HTML
    const response = await fetch('/views/partials/booking-form.html');
    const formHtml = await response.text();
    section.innerHTML = formHtml;

    // Load services and equipment options
    await loadServices();
    await loadEquipmentOptions();

    // Setup form submission
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);

    // Setup location calculator
    document.getElementById('calculate-distance').addEventListener('click', calculateTransportCost);
}

async function loadServices() {
    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error loading services:', error);
        return;
    }

    const servicesContainer = document.getElementById('services-container');
    services.forEach(service => {
        const serviceEl = document.createElement('div');
        serviceEl.className = 'service-option';
        serviceEl.innerHTML = `
            <input type="checkbox" id="service-${service.id}" name="services" value="${service.id}">
            <label for="service-${service.id}">
                <strong>${service.title}</strong> - KES ${service.base_price.toLocaleString()}
                <p>${service.description}</p>
            </label>
        `;
        servicesContainer.appendChild(serviceEl);
    });
}

async function loadEquipmentOptions() {
    const { data: equipment, error } = await supabase
        .from('equipment_options')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error loading equipment:', error);
        return;
    }

    const equipmentSelect = document.getElementById('equipment-option');
    equipment.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (KES ${item.price.toLocaleString()})`;
        equipmentSelect.appendChild(option);
    });
}

function calculateTransportCost() {
    const distanceInput = document.getElementById('event-distance');
    const distance = parseInt(distanceInput.value) || 0;
    const transportCost = distance * 50; // 50 KES per KM
    document.getElementById('transport-cost').value = transportCost;
    updateCalculations();
}

function updateCalculations() {
    // Get selected services total
    let servicesTotal = 0;
    document.querySelectorAll('input[name="services"]:checked').forEach(checkbox => {
        // In a real app, we'd look up the price from the services data
        servicesTotal += 10000; // Simplified for demo
    });

    // Get equipment cost
    const equipmentSelect = document.getElementById('equipment-option');
    const equipmentCost = parseFloat(equipmentSelect.options[equipmentSelect.selectedIndex].dataset.price) || 0;

    // Get transport cost
    const transportCost = parseFloat(document.getElementById('transport-cost').value) || 0;

    // Calculate subtotal
    const subtotal = servicesTotal + equipmentCost + transportCost;

    // Calculate taxes
    const vat = subtotal * 0.16;
    const levy = subtotal * 0.0003;
    const total = subtotal + vat + levy;

    // Update display
    document.getElementById('subtotal-amount').textContent = subtotal.toLocaleString();
    document.getElementById('vat-amount').textContent = vat.toLocaleString();
    document.getElementById('levy-amount').textContent = levy.toLocaleString();
    document.getElementById('total-amount').textContent = total.toLocaleString();
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const { user } = await supabase.auth.getUser();
    
    // Get form data
    const serviceIds = Array.from(document.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value);
    const equipmentOptionId = document.getElementById('equipment-option').value;
    const eventDate = document.getElementById('event-date').value;
    const eventLocation = document.getElementById('event-location').value;
    const distance = parseInt(document.getElementById('event-distance').value) || 0;
    const transportCost = distance * 50;
    const additionalNotes = document.getElementById('additional-notes').value;
    
    // Calculate amounts (simplified)
    const subtotal = 10000 * serviceIds.length + 
        parseFloat(document.getElementById('equipment-option').options[
            document.getElementById('equipment-option').selectedIndex
        ].dataset.price) + transportCost;
    const vat = subtotal * 0.16;
    const levy = subtotal * 0.0003;
    const total = subtotal + vat + levy;

    // Create transaction
    const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
            user_id: user.id,
            service_ids: serviceIds,
            equipment_option_id: equipmentOptionId,
            event_date: eventDate,
            event_location: eventLocation,
            distance_km: distance,
            transport_cost: transportCost,
            base_amount: subtotal,
            vat_amount: vat,
            levy_amount: levy,
            total_amount: total,
            additional_notes: additionalNotes,
            status: 'pending'
        }])
        .select();

    if (error) {
        console.error('Error creating booking:', error);
        alert('Failed to create booking. Please try again.');
        return;
    }

    // Create invoice (in a real app, this might be done via a Supabase function)
    await createInvoice(transaction[0].id, user.id, total);
    
    alert('Booking created successfully!');
    window.location.reload();
}

async function createInvoice(transactionId, userId, amount) {
    // In a real app, we'd call a server endpoint to handle PDF generation
    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert([{
            user_id: userId,
            transaction_id: transactionId,
            invoice_number: `ULT-2025-${Math.floor(10000 + Math.random() * 90000)}`, // Simplified
            amount_due: amount,
            payment_status: 'unpaid',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select();

    if (error) {
        console.error('Error creating invoice:', error);
        return;
    }

    // Here you would typically:
    // 1. Generate PDF on server
    // 2. Upload to Supabase Storage
    // 3. Update invoice with PDF URL
    // 4. Send email with invoice

    console.log('Invoice created:', invoice);
}