// js/unit-registration.js - Updated to work with Supabase directly
console.log('📦 Unit Registration module loading...');

// Global variables
let registeredUnits = [];
let maxUnits = 8;
let currentUser = null;

// Get current user from Supabase
async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', user.id)
                .single();
            return profile || user;
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Load available units from Supabase (Admin adds these per trimester)
async function loadAvailableUnits() {
    const regType = $('#RegType').val();
    const block = $('#BlockFilter').val();
    const unitType = $('#UnitTypeFilter').val();
    
    if (!regType) {
        $('#availableUnitsBody').html('<tr><td colspan="8" style="text-align:center">Please select Registration Type first</td></tr>');
        return;
    }
    
    // Get current user to determine their program
    if (!currentUser) {
        currentUser = await getCurrentUser();
    }
    
    const userProgram = currentUser?.program || 'KRCHN';
    const userIntake = currentUser?.intake_year || new Date().getFullYear();
    
    $('#availableUnitsBody').html('<tr class="loading-row"><td colspan="8"><div class="loading-spinner"></div> Loading units...</td></tr>');
    
    try {
        // Query units from Supabase units_catalog table
        let query = supabase
            .from('units_catalog')
            .select('*')
            .eq('program', userProgram)
            .eq('status', 'active');
        
        if (block && block !== "") {
            query = query.eq('block', block);
        }
        if (unitType && unitType !== "") {
            query = query.eq('unit_type', unitType);
        }
        
        const { data: units, error } = await query.order('block', { ascending: true }).order('unit_code', { ascending: true });
        
        if (error) throw error;
        
        if (!units || units.length === 0) {
            $('#availableUnitsBody').html('<tr><td colspan="8" style="text-align:center">No units available for your program</td></tr>');
            return;
        }
        
        let html = '';
        for (const unit of units) {
            // Check if already registered
            const { data: existing } = await supabase
                .from('student_unit_registrations')
                .select('status')
                .eq('student_id', currentUser?.user_id || currentUser?.id)
                .eq('unit_code', unit.unit_code)
                .maybeSingle();
            
            const isRegistered = existing !== null;
            const regStatus = existing?.status || 'available';
            
            html += `<tr>
                         <td>${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${unit.unit_code}" data-classcode="${unit.unit_code}">` : '—'}</td>
                         <td><strong>${escapeHtml(unit.unit_code)}</strong></td>
                         <td>${escapeHtml(unit.unit_name)}</td>
                         <td>${escapeHtml(unit.block)}</td>
                         <td><span class="status-badge status-registered">${escapeHtml(unit.unit_type || 'Core')}</span></td>
                         <td>${unit.credits || 3}</td>
                         <td>${escapeHtml(unit.prerequisites || 'None')}</td>
                         <td><span class="status-badge ${isRegistered ? (regStatus === 'approved' ? 'status-approved' : 'status-pending') : 'status-pending'}">${isRegistered ? (regStatus === 'approved' ? 'Registered' : 'Pending') : 'Available'}</span></td>
                     </tr>`;
        }
        $('#availableUnitsBody').html(html);
        updateSelectedCount();
        attachCheckboxEvents();
        
    } catch (error) {
        console.error('Error loading units:', error);
        $('#availableUnitsBody').html('<tr><td colspan="8" style="text-align:center">Error loading units. Please try again.</td></tr>');
    }
}

// Load student's registered units from Supabase
async function loadRegisteredUnits() {
    if (!currentUser) {
        currentUser = await getCurrentUser();
    }
    
    if (!currentUser) {
        $('#registeredUnitsBody').html('<tr><td colspan="7" style="text-align:center">Please log in to view registered units</td></tr>');
        return;
    }
    
    const studentId = currentUser?.user_id || currentUser?.id;
    
    $('#registeredUnitsBody').html('<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div> Loading your registered units...</td></tr>');
    
    try {
        const { data: registrations, error } = await supabase
            .from('student_unit_registrations')
            .select('*')
            .eq('student_id', studentId)
            .order('submitted_date', { ascending: false });
        
        if (error) throw error;
        
        registeredUnits = registrations || [];
        
        const approved = registeredUnits.filter(u => u.status === 'approved').length;
        const pending = registeredUnits.filter(u => u.status === 'pending').length;
        $('#approved-units-count').text(approved);
        $('#pending-units-count').text(pending);
        
        if (pending > 0) {
            $('#unitRegBadge').text(pending).show();
        } else {
            $('#unitRegBadge').hide();
        }
        
        let html = '';
        if (registeredUnits.length === 0) {
            html = '<tr><td colspan="7" style="text-align:center">No units registered yet. Select units above and submit for approval.</td></tr>';
        } else {
            for (const unit of registeredUnits) {
                const statusClass = unit.status === 'approved' ? 'status-approved' : 'status-pending';
                const statusText = unit.status === 'approved' ? '✅ Approved' : '⏳ Pending Approval';
                html += `<tr>
                             <td><strong>${escapeHtml(unit.unit_code)}</strong></td>
                             <td>${escapeHtml(unit.unit_name)}</td>
                             <td>${escapeHtml(unit.block)}</td>
                             <td>${escapeHtml(unit.reg_type || 'Normal')}</td>
                             <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                             <td>${unit.approval_date || '—'}</td>
                             <td>${unit.status === 'pending' ? `<button class="action-btn-drop" onclick="dropUnit('${unit.unit_code}')"><i class="fas fa-trash"></i> Drop</button>` : '—'}</td>
                         </tr>`;
            }
        }
        $('#registeredUnitsBody').html(html);
        
    } catch (error) {
        console.error('Error loading registered units:', error);
        $('#registeredUnitsBody').html('<tr><td colspan="7" style="text-align:center">Error loading registered units</td></tr>');
    }
}

function updateSelectedCount() {
    const checked = $('.unit-checkbox:checked').length;
    $('#selected-units-count').text(checked);
    
    const currentTotal = registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
    if (checked + currentTotal > maxUnits) {
        $('#maxUnitsWarning').show();
    } else {
        $('#maxUnitsWarning').hide();
    }
}

function attachCheckboxEvents() {
    $('.unit-checkbox').off('change').on('change', updateSelectedCount);
}

// Select/Deselect all units
function selectAllUnits() {
    const isChecked = $('#selectAllUnits').prop('checked');
    const currentTotal = registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
    const availableCheckboxes = $('.unit-checkbox:not(:disabled)');
    
    if (isChecked) {
        const maxSelectable = maxUnits - currentTotal;
        if (availableCheckboxes.length > maxSelectable) {
            Swal.fire('Warning', `You can only select up to ${maxSelectable} more units (max ${maxUnits} total)`, 'warning');
            $('#selectAllUnits').prop('checked', false);
            return;
        }
    }
    
    availableCheckboxes.prop('checked', isChecked);
    updateSelectedCount();
}

// Submit selected units for approval (saves to Supabase)
window.submitUnitRegistration = async function() {
    const regType = $('#RegType').val();
    if (!regType) {
        Swal.fire('Warning', 'Please select Registration Type', 'warning');
        return;
    }
    
    if (!currentUser) {
        currentUser = await getCurrentUser();
    }
    
    if (!currentUser) {
        Swal.fire('Error', 'Please log in to register units', 'error');
        return;
    }
    
    const selectedUnits = [];
    $('.unit-checkbox:checked').each(function() {
        selectedUnits.push({
            code: $(this).data('code'),
            classCode: $(this).data('classcode') || ''
        });
    });
    
    if (selectedUnits.length === 0) {
        Swal.fire('Warning', 'No units selected. Please check the units you want to register.', 'warning');
        return;
    }
    
    const currentTotal = registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
    if (selectedUnits.length + currentTotal > maxUnits) {
        Swal.fire('Limit Exceeded', `You can only register up to ${maxUnits} units total. You currently have ${currentTotal} units.`, 'warning');
        return;
    }
    
    Swal.fire({
        title: 'Confirm Registration',
        text: `You are about to submit ${selectedUnits.length} unit(s) for approval. This action cannot be undone.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Submit',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Submitting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            
            try {
                // Get unit details for each selected code
                const { data: units, error: unitsError } = await supabase
                    .from('units_catalog')
                    .select('*')
                    .in('unit_code', selectedUnits.map(u => u.code));
                
                if (unitsError) throw unitsError;
                
                const studentId = currentUser?.user_id || currentUser?.id;
                const registrations = [];
                
                for (const unit of units) {
                    registrations.push({
                        student_id: studentId,
                        unit_code: unit.unit_code,
                        unit_name: unit.unit_name,
                        program: unit.program,
                        block: unit.block,
                        reg_type: regType,
                        status: 'pending',
                        submitted_date: new Date().toISOString()
                    });
                }
                
                const { error: insertError } = await supabase
                    .from('student_unit_registrations')
                    .insert(registrations);
                
                if (insertError) throw insertError;
                
                Swal.close();
                Swal.fire('Success', `${registrations.length} unit(s) submitted for approval!`, 'success');
                
                // Clear selections and refresh
                $('.unit-checkbox:checked').prop('checked', false);
                await loadRegisteredUnits();
                await loadAvailableUnits();
                updateSelectedCount();
                
            } catch (error) {
                Swal.close();
                console.error('Error submitting registration:', error);
                Swal.fire('Error', `Failed to submit registration: ${error.message}`, 'error');
            }
        }
    });
};

// Drop a registered unit (delete from Supabase)
window.dropUnit = async function(unitCode) {
    if (!currentUser) {
        currentUser = await getCurrentUser();
    }
    
    Swal.fire({
        title: 'Drop Unit?',
        text: 'Are you sure you want to drop this unit? You will need to re-register if needed.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Drop',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            
            try {
                const studentId = currentUser?.user_id || currentUser?.id;
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .delete()
                    .eq('student_id', studentId)
                    .eq('unit_code', unitCode)
                    .eq('status', 'pending');
                
                if (error) throw error;
                
                Swal.close();
                Swal.fire('Success', 'Unit dropped successfully!', 'success');
                await loadRegisteredUnits();
                await loadAvailableUnits();
                
            } catch (error) {
                Swal.close();
                console.error('Error dropping unit:', error);
                Swal.fire('Error', `Failed to drop unit: ${error.message}`, 'error');
            }
        }
    });
};

// Load blocks for filter dropdown from Supabase
async function loadBlocks() {
    try {
        const { data: units, error } = await supabase
            .from('units_catalog')
            .select('block')
            .eq('status', 'active');
        
        if (error) throw error;
        
        const blocks = [...new Set(units.map(u => u.block))];
        let options = '<option value="">All Blocks</option>';
        blocks.sort().forEach(block => {
            options += `<option value="${escapeHtml(block)}">${escapeHtml(block)}</option>`;
        });
        $('#BlockFilter').html(options);
        
    } catch (error) {
        console.error('Error loading blocks:', error);
        // Fallback default blocks
        const defaultBlocks = ['Introductory', 'Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Final'];
        let options = '<option value="">All Blocks</option>';
        defaultBlocks.forEach(block => {
            options += `<option value="${block}">${block}</option>`;
        });
        $('#BlockFilter').html(options);
    }
}

// Get max units allowed (from settings or default)
async function loadMaxUnits() {
    try {
        const { data: settings, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'max_units_per_trimester')
            .single();
        
        if (!error && settings) {
            maxUnits = parseInt(settings.value);
            $('#maxUnitsAllowed').text(maxUnits);
        }
    } catch (error) {
        console.log('Using default max units: 8');
    }
}

// Refresh all unit registration data
async function refreshUnitRegistration() {
    await loadRegisteredUnits();
    if ($('#RegType').val()) {
        await loadAvailableUnits();
    }
    Swal.fire('Refreshed', 'Unit registration data has been refreshed.', 'success');
}

// Escape HTML helper
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Initialize Unit Registration module
async function initUnitRegistration() {
    console.log('Initializing Unit Registration module...');
    
    // Get current user first
    currentUser = await getCurrentUser();
    console.log('Current user:', currentUser);
    
    await loadMaxUnits();
    await loadBlocks();
    await loadRegisteredUnits();
    
    $('#selectAllUnits').off('change').on('change', selectAllUnits);
    $('#refreshUnitsBtn').off('click').on('click', refreshUnitRegistration);
    $('#submitRegistrationBtn').off('click').on('click', window.submitUnitRegistration);
    $('#RegType, #BlockFilter, #UnitTypeFilter').off('change').on('change', loadAvailableUnits);
    
    if ($('#RegType').val()) {
        await loadAvailableUnits();
    }
}

// Export functions globally
window.unitRegistration = {
    init: initUnitRegistration,
    loadUnits: loadAvailableUnits,
    loadRegistered: loadRegisteredUnits,
    submit: window.submitUnitRegistration,
    drop: window.dropUnit,
    refresh: refreshUnitRegistration
};

// Auto-initialize when document is ready
$(document).ready(function() {
    if ($('#unit-registration').length) {
        setTimeout(function() {
            initUnitRegistration();
        }, 1000);
    }
});

console.log('✅ Unit Registration module loaded (Supabase version)');
