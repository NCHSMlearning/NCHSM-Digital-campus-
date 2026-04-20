// ==================== UNIT REGISTRATION MODULE ====================
// Like KeMU Portal - Students can view all units, select, submit for approval
// Admin adds units per trimester (Introductory Block to Final Block)

// Global variables
let registeredUnits = [];
let selectedForSubmission = [];
let maxUnits = 8;

// Load available units from server (Admin adds these)
function loadAvailableUnits() {
    const regType = $('#RegType').val();
    const block = $('#BlockFilter').val();
    const unitType = $('#UnitTypeFilter').val();
    
    if (!regType) {
        $('#availableUnitsBody').html('<tr><td colspan="8" style="text-align:center">Please select Registration Type first</td></tr>');
        return;
    }
    
    ShowProgress();
    $.ajax({
        url: '/Course/GetProgramUnits',  // Your backend endpoint like KeMU
        type: 'POST',
        data: JSON.stringify({ 
            Type: regType, 
            Block: block, 
            UnitType: unitType 
        }),
        contentType: 'application/json',
        success: function(data) {
            HideProgress();
            if (data.success && data.units && data.units.length > 0) {
                let html = '';
                data.units.forEach(unit => {
                    const isRegistered = registeredUnits.some(r => r.code === unit.code);
                    const isPending = registeredUnits.some(r => r.code === unit.code && r.status === 'pending');
                    const isApproved = registeredUnits.some(r => r.code === unit.code && r.status === 'approved');
                    
                    html += `<tr>
                        <td>${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${unit.code}" data-classcode="${unit.classCode || ''}">` : '—'}</td>
                        <td><strong>${escapeHtml(unit.code)}</strong></td>
                        <td>${escapeHtml(unit.name)}</td>
                        <td>${escapeHtml(unit.block || '')}</td>
                        <td><span class="status-badge status-registered">${escapeHtml(unit.type || 'Core')}</span></td>
                        <td>${unit.credits || '3'}</td>
                        <td>${escapeHtml(unit.prerequisites || 'None')}</td>
                        <td><span class="status-badge ${isRegistered ? (isApproved ? 'status-approved' : 'status-pending') : 'status-pending'}">${isRegistered ? (isApproved ? 'Registered' : 'Pending') : 'Available'}</span></td>
                    </tr>`;
                });
                $('#availableUnitsBody').html(html);
                updateSelectedCount();
                attachCheckboxEvents();
            } else {
                $('#availableUnitsBody').html('<tr><td colspan="8" style="text-align:center">No units available for the selected criteria</td></tr>');
            }
        },
        error: function() {
            HideProgress();
            $('#availableUnitsBody').html('<tr><td colspan="8" style="text-align:center">Error loading units. Please try again.</td></tr>');
            Swal.fire('Error', 'Failed to load units. Please check your connection.', 'error');
        }
    });
}

// Load student's registered units from server
function loadRegisteredUnits() {
    ShowProgress();
    $.ajax({
        url: '/Course/GetStudentRegisteredUnits',  // Your backend endpoint
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            HideProgress();
            if (data.success) {
                registeredUnits = data.units || [];
                
                // Update statistics
                const approved = registeredUnits.filter(u => u.status === 'approved').length;
                const pending = registeredUnits.filter(u => u.status === 'pending').length;
                $('#approved-units-count').text(approved);
                $('#pending-units-count').text(pending);
                
                // Update badge on sidebar
                if (pending > 0) {
                    $('#unitRegBadge').text(pending).show();
                } else {
                    $('#unitRegBadge').hide();
                }
                
                // Render registered units table
                let html = '';
                if (registeredUnits.length === 0) {
                    html = '<tr><td colspan="7" style="text-align:center">No units registered yet. Select units above and submit for approval.</td></tr>';
                } else {
                    registeredUnits.forEach(unit => {
                        const statusClass = unit.status === 'approved' ? 'status-approved' : 'status-pending';
                        const statusText = unit.status === 'approved' ? '✅ Approved' : '⏳ Pending Approval';
                        html += `<tr>
                            <td><strong>${escapeHtml(unit.code)}</strong></td>
                            <td>${escapeHtml(unit.name)}</td>
                            <td>${escapeHtml(unit.block || '')}</td>
                            <td>${escapeHtml(unit.regType || 'Normal')}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>${unit.approvalDate || '—'}</td>
                            <td>${unit.status === 'pending' ? `<button class="action-btn-drop" onclick="dropUnit('${unit.code}')"><i class="fas fa-trash"></i> Drop</button>` : '—'}</td>
                        </tr>`;
                    });
                }
                $('#registeredUnitsBody').html(html);
            } else {
                $('#registeredUnitsBody').html('<tr><td colspan="7" style="text-align:center">Error loading registered units</td></tr>');
            }
        },
        error: function() {
            HideProgress();
            $('#registeredUnitsBody').html('<tr><td colspan="7" style="text-align:center">Error loading registered units. Please refresh.</td></tr>');
        }
    });
}

// Update selected units count
function updateSelectedCount() {
    const checked = $('.unit-checkbox:checked').length;
    $('#selected-units-count').text(checked);
    
    // Show/hide max units warning
    const currentTotal = registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
    if (checked + currentTotal > maxUnits) {
        $('#maxUnitsWarning').show();
    } else {
        $('#maxUnitsWarning').hide();
    }
}

// Attach checkbox change events
function attachCheckboxEvents() {
    $('.unit-checkbox').off('change').on('change', function() {
        updateSelectedCount();
    });
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

// Submit selected units for approval (Like KeMU's SubmitSelectedUnits)
window.submitUnitRegistration = function() {
    const regType = $('#RegType').val();
    if (!regType) {
        Swal.fire('Warning', 'Please select Registration Type', 'warning');
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
    }).then(result => {
        if (result.isConfirmed) {
            ShowProgress();
            $.ajax({
                url: '/Course/SaveSelectedUnits',  // Your backend endpoint like KeMU
                type: 'POST',
                data: JSON.stringify({ 
                    UnitReg: selectedUnits, 
                    Type: regType 
                }),
                contentType: 'application/json',
                success: function(response) {
                    HideProgress();
                    if (response.success) {
                        Swal.fire('Success', response.message, 'success');
                        // Clear selections
                        $('.unit-checkbox:checked').prop('checked', false);
                        // Refresh data
                        loadRegisteredUnits();
                        loadAvailableUnits();
                        updateSelectedCount();
                    } else {
                        Swal.fire('Warning', response.message, 'warning');
                    }
                },
                error: function() {
                    HideProgress();
                    Swal.fire('Error', 'An error occurred while saving units. Please try again.', 'error');
                }
            });
        }
    });
};

// Drop a registered unit (Like KeMU's DropRegisteredUnit)
window.dropUnit = function(unitCode) {
    Swal.fire({
        title: 'Drop Unit?',
        text: 'Are you sure you want to drop this unit? You will need to re-register if needed.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Drop',
        cancelButtonText: 'Cancel'
    }).then(result => {
        if (result.isConfirmed) {
            ShowProgress();
            $.ajax({
                url: '/Course/DropRegisteredUnit',  // Your backend endpoint like KeMU
                type: 'POST',
                data: JSON.stringify({ UnitCode: unitCode }),
                contentType: 'application/json',
                success: function(response) {
                    HideProgress();
                    if (response.success) {
                        Swal.fire('Success', response.message, 'success');
                        loadRegisteredUnits();
                        loadAvailableUnits();
                    } else {
                        Swal.fire('Warning', response.message, 'warning');
                    }
                },
                error: function() {
                    HideProgress();
                    Swal.fire('Error', 'Error dropping unit. Please try again.', 'error');
                }
            });
        }
    });
};

// Load blocks for filter dropdown
function loadBlocks() {
    $.ajax({
        url: '/Course/GetBlocks',  // Your backend endpoint
        type: 'GET',
        success: function(data) {
            if (data.success && data.blocks) {
                let options = '<option value="">All Blocks</option>';
                data.blocks.forEach(block => {
                    options += `<option value="${escapeHtml(block)}">${escapeHtml(block)}</option>`;
                });
                $('#BlockFilter').html(options);
            }
        },
        error: function() {
            console.log('Could not load blocks');
        }
    });
}

// Get max units allowed from server
function loadMaxUnits() {
    $.ajax({
        url: '/Course/GetMaxUnitsAllowed',
        type: 'GET',
        success: function(data) {
            if (data.success && data.maxUnits) {
                maxUnits = data.maxUnits;
                $('#maxUnitsAllowed').text(maxUnits);
            }
        },
        error: function() {
            console.log('Using default max units: 8');
        }
    });
}

// Refresh all unit registration data
function refreshUnitRegistration() {
    loadRegisteredUnits();
    if ($('#RegType').val()) {
        loadAvailableUnits();
    }
    Swal.fire('Refreshed', 'Unit registration data has been refreshed.', 'success');
}

// Export registration data (optional feature)
function exportRegistrationData() {
    const data = {
        student: {
            name: $('#header-user-name').text(),
            regNo: $('#profile-student-id').val(),
            program: $('#profile-program').val(),
            block: $('#profile-block').val()
        },
        registeredUnits: registeredUnits,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unit_registration_${$('#profile-student-id').val() || 'student'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Swal.fire('Exported', 'Registration data exported successfully.', 'success');
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Show progress (using your existing ShowProgress function)
function ShowProgress() {
    if (typeof window.ShowProgress === 'function') {
        window.ShowProgress();
    } else {
        Swal.fire({ title: 'Loading...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    }
}

function HideProgress() {
    if (typeof window.HideProgress === 'function') {
        window.HideProgress();
    } else {
        Swal.close();
    }
}

// Initialize Unit Registration module
function initUnitRegistration() {
    console.log('Initializing Unit Registration module...');
    
    // Load configuration
    loadMaxUnits();
    loadBlocks();
    loadRegisteredUnits();
    
    // Bind events
    $('#selectAllUnits').off('change').on('change', selectAllUnits);
    $('#refreshUnitsBtn').off('click').on('click', refreshUnitRegistration);
    $('#submitRegistrationBtn').off('click').on('click', window.submitUnitRegistration);
    $('#RegType, #BlockFilter, #UnitTypeFilter').off('change').on('change', loadAvailableUnits);
    
    // Optional: Add export button handler if export button exists
    if ($('#exportRegBtn').length) {
        $('#exportRegBtn').off('click').on('click', exportRegistrationData);
    }
    
    // Load available units if registration type is already selected
    if ($('#RegType').val()) {
        loadAvailableUnits();
    }
}

// Make functions available globally
window.unitRegistration = {
    init: initUnitRegistration,
    loadUnits: loadAvailableUnits,
    loadRegistered: loadRegisteredUnits,
    submit: window.submitUnitRegistration,
    drop: window.dropUnit,
    refresh: refreshUnitRegistration,
    export: exportRegistrationData
};

// Auto-initialize when document is ready and unit-registration tab exists
$(document).ready(function() {
    // Check if unit-registration tab exists in the DOM
    if ($('#unit-registration').length) {
        // Wait a bit for other modules to initialize
        setTimeout(function() {
            initUnitRegistration();
        }, 500);
    }
});
