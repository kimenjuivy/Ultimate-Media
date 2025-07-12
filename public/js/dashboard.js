// Supabase configuration - Updated for v2 API
const supabaseUrl = 'https://xljojazexigswzfojnqh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9qYXpleGlnc3d6Zm9qbnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjY5MTAsImV4cCI6MjA2NTY0MjkxMH0.dtpgLThquxFlvXV2viuwWB3-TAFhz6InGmXR8uFqIpU'

// Initialize Supabase client - Fixed for v2
let supabase

// Wait for Supabase to load
function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey)
        return true
    } else if (typeof window.createClient !== 'undefined') {
        supabase = window.createClient(supabaseUrl, supabaseAnonKey)
        return true
    } else {
        console.error('Supabase library not found')
        return false
    }
}

// Global variables
let currentUser = null
let services = []
let equipmentOptions = []
let selectedServices = []
let selectedEquipment = null

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase first
    if (!initializeSupabase()) {
        showError('Failed to initialize Supabase client')
        return
    }

    try {
        await checkAuth()
        await loadUserProfile()
        await loadServices()
        await loadEquipmentOptions()
        showTab('new-booking')
        
        // Set up event listeners
        const distanceInput = document.getElementById('distanceKm')
        if (distanceInput) {
            distanceInput.addEventListener('input', calculatePricing)
        }
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0]
        const eventDateInput = document.getElementById('eventDate')
        if (eventDateInput) {
            eventDateInput.setAttribute('min', today)
        }
    } catch (error) {
        console.error('Dashboard initialization failed:', error)
        showError('Failed to initialize dashboard')
    }
})

// Authentication check
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
            window.location.href = '/login.html'
            return
        }
        currentUser = user
    } catch (error) {
        console.error('Auth error:', error)
        window.location.href = '/login.html'
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
        
        if (error) throw error
        
        const welcomeElement = document.getElementById('userWelcome')
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${profile.full_name}`
        }
    } catch (error) {
        console.error('Error loading profile:', error)
        const welcomeElement = document.getElementById('userWelcome')
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${currentUser.email}`
        }
    }
}

// Load services from database
async function loadServices() {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true })
        
        if (error) throw error
        
        services = data
        renderServices()
    } catch (error) {
        console.error('Error loading services:', error)
        showError('Failed to load services')
    }
}

// Load equipment options from database
async function loadEquipmentOptions() {
    try {
        const { data, error } = await supabase
            .from('equipment_options')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true })
        
        if (error) throw error
        
        equipmentOptions = data
        renderEquipmentOptions()
    } catch (error) {
        console.error('Error loading equipment options:', error)
        showError('Failed to load equipment options')
    }
}

// Render services grid
function renderServices() {
    const grid = document.getElementById('servicesGrid')
    if (!grid) return
    
    grid.innerHTML = ''
    
    services.forEach(service => {
        const serviceCard = document.createElement('div')
        serviceCard.className = 'service-card bg-white border rounded-lg p-4 cursor-pointer card-hover'
        serviceCard.onclick = () => toggleService(service.id)
        
        serviceCard.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-gray-900">${service.title}</h4>
                <span class="text-blue-600 font-bold">KES ${formatCurrency(service.base_price)}</span>
            </div>
            <p class="text-gray-600 text-sm mb-3">${service.description}</p>
            <div class="flex items-center justify-between">
                <span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">${service.category}</span>
                <div class="checkbox">
                    <input type="checkbox" id="service-${service.id}" class="hidden">
                    <div class="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center">
                        <i class="fas fa-check text-white text-xs hidden"></i>
                    </div>
                </div>
            </div>
        `
        
        grid.appendChild(serviceCard)
    })
}

// Render equipment options grid
function renderEquipmentOptions() {
    const grid = document.getElementById('equipmentGrid')
    if (!grid) return
    
    grid.innerHTML = ''
    
    equipmentOptions.forEach(equipment => {
        const equipmentCard = document.createElement('div')
        equipmentCard.className = 'equipment-card bg-white border rounded-lg p-4 cursor-pointer card-hover'
        equipmentCard.onclick = () => selectEquipment(equipment.id)
        
        equipmentCard.innerHTML = `
            <div class="text-center">
                <i class="fas fa-camera text-3xl text-green-600 mb-3"></i>
                <h4 class="font-semibold text-gray-900 mb-2">${equipment.name}</h4>
                <p class="text-gray-600 text-sm mb-3">${equipment.description}</p>
                <div class="text-green-600 font-bold">
                    ${equipment.price > 0 ? `+KES ${formatCurrency(equipment.price)}` : 'Included'}
                </div>
                <div class="radio mt-3">
                    <input type="radio" name="equipment" id="equipment-${equipment.id}" class="hidden">
                    <div class="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center mx-auto">
                        <div class="w-3 h-3 bg-green-600 rounded-full hidden"></div>
                    </div>
                </div>
            </div>
        `
        
        grid.appendChild(equipmentCard)
    })
}

// Toggle service selection
function toggleService(serviceId) {
    const index = selectedServices.indexOf(serviceId)
    const serviceCard = document.querySelector(`#service-${serviceId}`).closest('.service-card')
    const checkbox = serviceCard.querySelector('.checkbox div')
    const checkIcon = serviceCard.querySelector('.checkbox i')
    
    if (index > -1) {
        selectedServices.splice(index, 1)
        serviceCard.classList.remove('selected')
        checkbox.classList.remove('bg-blue-600', 'border-blue-600')
        checkbox.classList.add('border-gray-300')
        checkIcon.classList.add('hidden')
    } else {
        selectedServices.push(serviceId)
        serviceCard.classList.add('selected')
        checkbox.classList.remove('border-gray-300')
        checkbox.classList.add('bg-blue-600', 'border-blue-600')
        checkIcon.classList.remove('hidden')
    }
    
    calculatePricing()
}

// Select equipment option
function selectEquipment(equipmentId) {
    // Clear previous selection
    document.querySelectorAll('.equipment-card').forEach(card => {
        card.classList.remove('selected')
        const radio = card.querySelector('.radio div div')
        if (radio) radio.classList.add('hidden')
    })
    
    // Select new equipment
    selectedEquipment = equipmentId
    const equipmentCard = document.querySelector(`#equipment-${equipmentId}`).closest('.equipment-card')
    equipmentCard.classList.add('selected')
    const radio = equipmentCard.querySelector('.radio div div')
    if (radio) radio.classList.remove('hidden')
    
    calculatePricing()
}

// Calculate pricing
function calculatePricing() {
    let servicesTotal = 0
    let equipmentCost = 0
    let transportCost = 0
    
    // Calculate services total
    selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId)
        if (service) {
            servicesTotal += parseFloat(service.base_price)
        }
    })
    
    // Calculate equipment cost
    if (selectedEquipment) {
        const equipment = equipmentOptions.find(e => e.id === selectedEquipment)
        if (equipment) {
            equipmentCost = parseFloat(equipment.price)
        }
    }
    
    // Calculate transport cost
    const distanceInput = document.getElementById('distanceKm')
    const distance = distanceInput ? parseFloat(distanceInput.value) || 0 : 0
    transportCost = distance * 50 // KES 50 per KM
    
    // Calculate base amount
    const baseAmount = servicesTotal + equipmentCost + transportCost
    
    // Calculate taxes
    const vatAmount = baseAmount * 0.16 // 16% VAT
    const levyAmount = baseAmount * 0.0003 // 0.03% Levy
    
    // Calculate total
    const totalAmount = baseAmount + vatAmount + levyAmount
    
    // Update display
    updateElement('servicesSubtotal', `KES ${formatCurrency(servicesTotal)}`)
    updateElement('equipmentCost', `KES ${formatCurrency(equipmentCost)}`)
    updateElement('transportCost', `KES ${formatCurrency(transportCost)}`)
    updateElement('baseAmount', `KES ${formatCurrency(baseAmount)}`)
    updateElement('vatAmount', `KES ${formatCurrency(vatAmount)}`)
    updateElement('levyAmount', `KES ${formatCurrency(levyAmount)}`)
    updateElement('totalAmount', `KES ${formatCurrency(totalAmount)}`)
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('submitBooking')
    const eventDateInput = document.getElementById('eventDate')
    const eventLocationInput = document.getElementById('eventLocation')
    
    const canSubmit = selectedServices.length > 0 && 
                     selectedEquipment && 
                     eventDateInput && eventDateInput.value && 
                     eventLocationInput && eventLocationInput.value.trim()
    
    if (submitBtn) {
        submitBtn.disabled = !canSubmit
    }
}

// Helper function to safely update element text
function updateElement(id, text) {
    const element = document.getElementById(id)
    if (element) {
        element.textContent = text
    }
}

// Submit booking
async function submitBooking() {
    if (!validateBookingForm()) return
    
    const submitBtn = document.getElementById('submitBooking')
    if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...'
    }
    
    try {
        // Calculate pricing
        let servicesTotal = 0
        selectedServices.forEach(serviceId => {
            const service = services.find(s => s.id === serviceId)
            if (service) {
                servicesTotal += parseFloat(service.base_price)
            }
        })
        
        const equipment = equipmentOptions.find(e => e.id === selectedEquipment)
        const equipmentCost = equipment ? parseFloat(equipment.price) : 0
        const distance = parseFloat(document.getElementById('distanceKm').value) || 0
        const transportCost = distance * 50
        const baseAmount = servicesTotal + equipmentCost + transportCost
        const vatAmount = baseAmount * 0.16
        const levyAmount = baseAmount * 0.0003
        const totalAmount = baseAmount + vatAmount + levyAmount
        
        // Create transaction
        const transactionData = {
            user_id: currentUser.id,
            service_ids: selectedServices,
            equipment_option_id: selectedEquipment,
            event_date: document.getElementById('eventDate').value,
            event_location: document.getElementById('eventLocation').value.trim(),
            distance_km: distance,
            transport_cost: transportCost,
            base_amount: baseAmount,
            vat_amount: vatAmount,
            levy_amount: levyAmount,
            total_amount: totalAmount,
            additional_notes: document.getElementById('additionalNotes').value.trim(),
            status: 'pending'
        }
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single()
        
        if (error) throw error
        
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber()
        
        // Create invoice
        const invoiceData = {
            user_id: currentUser.id,
            transaction_id: transaction.id,
            invoice_number: invoiceNumber,
            amount_due: totalAmount,
            payment_status: 'unpaid'
        }
        
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert([invoiceData])
            .select()
            .single()
        
        if (invoiceError) throw invoiceError
        
        // Show success modal
        showSuccessModal()
        
        // Reset form
        resetBookingForm()
        
    } catch (error) {
        console.error('Error submitting booking:', error)
        showError('Failed to submit booking. Please try again.')
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Booking Request'
        }
    }
}

// Generate invoice number
async function generateInvoiceNumber() {
    try {
        const { data, error } = await supabase.rpc('generate_invoice_number')
        if (error) throw error
        return data
    } catch (error) {
        // Fallback: generate client-side
        const now = new Date()
        const year = now.getFullYear()
        const timestamp = now.getTime().toString().slice(-5)
        return `ULT-${year}-${timestamp.padStart(5, '0')}`
    }
}

// Validate booking form
function validateBookingForm() {
    if (selectedServices.length === 0) {
        showError('Please select at least one service')
        return false
    }
    
    if (!selectedEquipment) {
        showError('Please select an equipment option')
        return false
    }
    
    const eventDateInput = document.getElementById('eventDate')
    if (!eventDateInput || !eventDateInput.value) {
        showError('Please select an event date')
        return false
    }
    
    const eventLocationInput = document.getElementById('eventLocation')
    if (!eventLocationInput || !eventLocationInput.value.trim()) {
        showError('Please enter the event location')
        return false
    }
    
    return true
}

// Reset booking form
function resetBookingForm() {
    selectedServices = []
    selectedEquipment = null
    
    // Reset form fields
    const eventDate = document.getElementById('eventDate')
    const eventLocation = document.getElementById('eventLocation')
    const distanceKm = document.getElementById('distanceKm')
    const additionalNotes = document.getElementById('additionalNotes')
    
    if (eventDate) eventDate.value = ''
    if (eventLocation) eventLocation.value = ''
    if (distanceKm) distanceKm.value = '0'
    if (additionalNotes) additionalNotes.value = ''
    
    // Reset service cards
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected')
        const checkbox = card.querySelector('.checkbox div')
        const checkIcon = card.querySelector('.checkbox i')
        if (checkbox) {
            checkbox.classList.remove('bg-blue-600', 'border-blue-600')
            checkbox.classList.add('border-gray-300')
        }
        if (checkIcon) checkIcon.classList.add('hidden')
    })
    
    // Reset equipment cards
    document.querySelectorAll('.equipment-card').forEach(card => {
        card.classList.remove('selected')
        const radio = card.querySelector('.radio div div')
        if (radio) radio.classList.add('hidden')
    })
    
    calculatePricing()
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden')
    })
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'bg-white', 'text-blue-600')
    })
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName)
    if (selectedTab) {
        selectedTab.classList.remove('hidden')
    }
    
    // Add active class to selected nav link
    const activeTab = document.getElementById(`${tabName}-tab`)
    if (activeTab) {
        activeTab.classList.add('active', 'bg-white', 'text-blue-600')
    }
    
    // Load data based on tab
    if (tabName === 'my-bookings') {
        loadBookings()
    } else if (tabName === 'invoices') {
        loadInvoices()
    }
}

// Load user bookings
async function loadBookings() {
    const container = document.getElementById('bookingsList')
    if (!container) return
    
    try {
        const { data: transactions, error } = await supabase
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
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        renderBookings(transactions)
    } catch (error) {
        console.error('Error loading bookings:', error)
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                <p class="text-red-600">Failed to load bookings</p>
            </div>
        `
    }
}

// Render bookings (simplified version)
function renderBookings(transactions) {
    const container = document.getElementById('bookingsList')
    if (!container) return
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-calendar-times text-gray-400 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No Bookings Yet</h3>
                <p class="text-gray-500">Start by creating your first booking!</p>
                <button onclick="showTab('new-booking')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                    Create Booking
                </button>
            </div>
        `
        return
    }
    
    // Render bookings list (simplified)
    let html = '<div class="space-y-4">'
    transactions.forEach(transaction => {
        html += `
            <div class="border rounded-lg p-6">
                <h3 class="text-lg font-semibold">Event on ${formatDate(transaction.event_date)}</h3>
                <p class="text-gray-600">${transaction.event_location}</p>
                <p class="text-green-600 font-bold">KES ${formatCurrency(transaction.total_amount)}</p>
            </div>
        `
    })
    html += '</div>'
    container.innerHTML = html
}

// Load invoices (simplified)
async function loadInvoices() {
    const container = document.getElementById('invoicesList')
    if (!container) return
    
    container.innerHTML = `
        <div class="text-center py-8">
            <p class="text-gray-500">Invoice loading feature coming soon...</p>
        </div>
    `
}

// Helper functions
function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Success modal functions
function showSuccessModal() {
    const modal = document.getElementById('successModal')
    if (modal) {
        modal.classList.remove('hidden')
        modal.classList.add('flex')
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal')
    if (modal) {
        modal.classList.add('hidden')
        modal.classList.remove('flex')
    }
}

// Notification system
function showError(message) {
    alert(message) // Simple alert for now - you can enhance this later
}

// Logout function
async function logout() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.error('Error logging out:', error)
        }
        window.location.href = '/login.html'
    } catch (error) {
        console.error('Logout error:', error)
        window.location.href = '/login.html'
    }
}