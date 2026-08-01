/*******************************************************
 * 10. UNIT MANAGEMENT - COMPLETE TVET/KRCHN SUPPORT
 * Renamed from "Courses" to "Units" for accuracy
 * Uses units_catalog table
 *******************************************************/

// ============================================================
// ADD UNIT - COMPLETE TVET SUPPORT
// ============================================================

async function handleAddUnit(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const unit_code = document.getElementById('new_unit_code').value.trim();
    const unit_name = document.getElementById('new_unit_name').value.trim();
    const description = document.getElementById('new_unit_description')?.value.trim() || '';
    const target_program = document.getElementById('new_unit_program').value;
    const year = parseInt(document.getElementById('new_unit_year').value);
    const block = document.getElementById('new_unit_block').value;
    const credits = parseInt(document.getElementById('new_unit_credits').value) || 3;
    const hours = parseInt(document.getElementById('new_unit_hours').value) || 30;
    const unit_type = document.getElementById('new_unit_type').value;
    const prerequisites = document.getElementById('new_unit_prerequisites').value.trim() || null;
    
    if (!unit_code || !unit_name || !target_program || !year || !block) {
        showFeedback('Unit Code, Unit Name, Program, Year, and Block/Term are required.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        // Check for duplicate unit_code
        const { data: existing, error: checkError } = await sb
            .from('units_catalog')
            .select('unit_code')
            .eq('unit_code', unit_code)
            .maybeSingle();
        
        if (checkError) throw checkError;
        
        if (existing) {
            showFeedback(`⚠️ Unit code "${unit_code}" already exists!`, 'error');
            setButtonLoading(submitButton, false, originalText);
            return;
        }

        const unitData = {
            unit_code: unit_code,
            unit_name: unit_name,
            description: description,
            program: target_program,
            year: year,
            block: block,
            credits: credits,
            hours: hours,
            unit_type: unit_type || 'Core',
            prerequisites: prerequisites,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📤 Adding unit with data:', unitData);

        const { error } = await sb.from('units_catalog').insert(unitData);
        if (error) throw error;
        
        await logAudit('UNIT_ADD', `Successfully added unit: ${unit_code} - ${unit_name} (${target_program}, ${block})`, null, 'SUCCESS');
        showFeedback(`✅ Unit "${unit_code} - ${unit_name}" added successfully!`, 'success');
        
        // Reset form
        document.getElementById('add-unit-form')?.reset();
        document.getElementById('new_unit_block').value = '';
        document.getElementById('new_unit_description').value = '';
        
        // Refresh units list
        if (typeof loadAllUnits === 'function') {
            loadAllUnits();
        } else {
            loadUnits();
        }

    } catch (error) {
        await logAudit('UNIT_ADD', `Failed to add unit ${unit_code}. Reason: ${error.message}`, null, 'FAILURE');
        showFeedback(`❌ Failed to add unit: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================================
// LOAD UNITS - COMPLETE TVET SUPPORT
// ============================================================

async function loadUnits() {
    const tbody = document.getElementById('units-table-body');
    if (!tbody) {
        // Fallback to old ID if it exists
        const oldTbody = document.getElementById('courses-table');
        if (oldTbody) {
            oldTbody.innerHTML = '<tr><td colspan="6">Loading units...</td></tr>';
            // Use the old variable
            const coursesTbody = oldTbody;
            const { data: units, error } = await fetchData('units_catalog', '*', {}, 'unit_code', true);
            if (error) { 
                coursesTbody.innerHTML = `<tr><td colspan="6">Error loading units: ${error.message}</td></tr>`; 
                return; 
            }

            coursesTbody.innerHTML = '';
            units.forEach(u => {
                const isTVET = isTVETProgram(u.program);
                const blockLabel = isTVET ? 'Term' : 'Block';
                const programType = getProgramType(u.program);
                const programBadge = programType === 'TVET' 
                    ? '<span style="background: #f59e0b; color: #78350f; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">🔧 TVET</span>'
                    : '<span style="background: #2563eb; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">🎓 KRCHN</span>';

                coursesTbody.innerHTML += `<tr>
                    <td><strong>${escapeHtml(u.unit_code)}</strong></td>
                    <td>${escapeHtml(u.unit_name)}</td>
                    <td>
                        ${escapeHtml(u.program || 'N/A')}
                        ${programBadge}
                    </td>
                    <td>${escapeHtml(u.year || 'N/A')}</td>
                    <td>${escapeHtml(blockLabel)}: ${escapeHtml(u.block || 'N/A')}</td>
                    <td>
                        <button class="btn-action" onclick="openEditUnitModal('${u.id}', '${escapeHtml(u.unit_code)}', '${escapeHtml(u.unit_name)}', '${escapeHtml(u.description || '')}', '${escapeHtml(u.program || '')}', '${u.year || ''}', '${escapeHtml(u.block || '')}', '${u.credits || 3}', '${u.hours || 0}', '${escapeHtml(u.unit_type || 'Core')}', '${escapeHtml(u.prerequisites || '')}')">Edit</button>
                        <button class="btn btn-delete" onclick="deleteUnit('${u.id}', '${escapeHtml(u.unit_code)}')">Delete</button>
                    </td>
                </tr>`;
            });
            
            filterTable('unit-search', 'courses-table', [0, 1, 3]);
            return;
        }
        console.warn('⚠️ units-table-body not found');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="7">Loading units...</td></tr>';

    const { data: units, error } = await fetchData('units_catalog', '*', {}, 'unit_code', true);
    if (error) { 
        tbody.innerHTML = `<tr><td colspan="7">Error loading units: ${error.message}</td></tr>`; 
        return; 
    }

    if (!units || units.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">No units found. Click "Add Unit" to create one.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    units.forEach(u => {
        const isTVET = isTVETProgram(u.program);
        const blockLabel = isTVET ? 'Term' : 'Block';
        const programType = getProgramType(u.program);
        const programDisplay = getProgramDisplayName(u.program);
        const programBadge = programType === 'TVET' 
            ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">🔧 TVET</span>'
            : '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">🎓 KRCHN</span>';
        
        const typeColor = u.unit_type === 'Core' ? '#2563eb' : 
                         u.unit_type === 'Elective' ? '#d97706' : 
                         u.unit_type === 'Clinical' ? '#059669' : '#6b7280';
        const typeBg = u.unit_type === 'Core' ? '#dbeafe' : 
                       u.unit_type === 'Elective' ? '#fef3c7' : 
                       u.unit_type === 'Clinical' ? '#d1fae5' : '#f3f4f6';
        
        const unitTypeBadge = `<span style="background: ${typeBg}; color: ${typeColor}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">${escapeHtml(u.unit_type || 'Core')}</span>`;
        
        const statusBadge = u.status === 'active' 
            ? '<span style="background: #d1fae5; color: #059669; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">✅ Active</span>'
            : '<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">❌ Inactive</span>';

        tbody.innerHTML += `<tr>
            <td><strong>${escapeHtml(u.unit_code)}</strong></td>
            <td>${escapeHtml(u.unit_name)}</td>
            <td>
                <div style="font-weight: 500; font-size: 13px;">${escapeHtml(programDisplay)}</div>
                ${programBadge}
            </td>
            <td>${escapeHtml(u.year || 'N/A')}</td>
            <td>
                <span style="background: ${isTVET ? '#fef3c7' : '#e0e7ff'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; color: ${isTVET ? '#92400e' : '#1e40af'};">
                    ${blockLabel}: ${escapeHtml(u.block || 'N/A')}
                </span>
            </td>
            <td style="text-align: center;">
                ${unitTypeBadge}
                <br>
                <small style="color: #6b7280;">${u.credits || 3} cr | ${u.hours || 0}h</small>
            </td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-action" onclick="openEditUnitModal('${u.id}', '${escapeHtml(u.unit_code)}', '${escapeHtml(u.unit_name)}', '${escapeHtml(u.description || '')}', '${escapeHtml(u.program || '')}', '${u.year || ''}', '${escapeHtml(u.block || '')}', '${u.credits || 3}', '${u.hours || 0}', '${escapeHtml(u.unit_type || 'Core')}', '${escapeHtml(u.prerequisites || '')}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteUnit('${u.id}', '${escapeHtml(u.unit_code)}')">Delete</button>
            </td>
        </tr>`;
    });
    
    // Update count
    const countEl = document.getElementById('unitCountDisplay');
    if (countEl) countEl.textContent = units.length;
    
    // Filter functionality
    const searchInput = document.getElementById('unit_search');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            filterUnitsTable(this.value);
        });
    }
}

// ============================================================
// FILTER UNITS TABLE
// ============================================================

function filterUnitsTable(searchTerm) {
    const rows = document.querySelectorAll('#units-table-body tr, #courses-table tbody tr');
    const term = searchTerm?.toLowerCase() || '';
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

// ============================================================
// DELETE UNIT
// ============================================================

async function deleteUnit(unitId, unitCode) {
    if (!confirm(`⚠️ Are you sure you want to delete unit "${unitCode}"? This cannot be undone.`)) return;
    
    try {
        // Check if unit has marks
        const { data: marks, error: checkError } = await sb
            .from('student_marks')
            .select('id')
            .eq('subject_name', unitCode)
            .limit(1);
        
        if (checkError) {
            console.warn('Could not check for marks:', checkError);
        }
        
        if (marks && marks.length > 0) {
            if (!confirm(`⚠️ This unit has ${marks.length} marks entries. Deleting it will remove all associated marks. Continue?`)) {
                return;
            }
        }
        
        const { error } = await sb.from('units_catalog').delete().eq('id', unitId);
        if (error) throw error;
        
        await logAudit('UNIT_DELETE', `Deleted unit ${unitCode}`, unitId, 'SUCCESS');
        showFeedback(`✅ Unit "${unitCode}" deleted successfully!`, 'success');
        
        if (typeof loadAllUnits === 'function') {
            loadAllUnits();
        } else {
            loadUnits();
        }
        
    } catch (error) {
        await logAudit('UNIT_DELETE', `Failed to delete unit ${unitCode}. Reason: ${error.message}`, unitId, 'FAILURE');
        showFeedback(`❌ Failed to delete unit: ${error.message}`, 'error');
    }
}

// ============================================================
// OPEN EDIT UNIT MODAL - COMPLETE TVET SUPPORT
// ============================================================

function openEditUnitModal(id, unit_code, unit_name, description, program, year, block, credits, hours, unit_type, prerequisites) {
    // Set values
    document.getElementById('edit_unit_id').value = id;
    document.getElementById('edit_unit_code').value = unit_code;
    document.getElementById('edit_unit_name').value = unit_name;
    document.getElementById('edit_unit_description').value = description || '';
    document.getElementById('edit_unit_year').value = year || '';
    document.getElementById('edit_unit_credits').value = credits || 3;
    document.getElementById('edit_unit_hours').value = hours || 0;
    document.getElementById('edit_unit_type').value = unit_type || 'Core';
    document.getElementById('edit_unit_prerequisites').value = prerequisites || '';
    
    // Set program
    const programSelect = document.getElementById('edit_unit_program');
    if (programSelect) {
        programSelect.value = program || 'KRCHN';
        // Trigger change to update block options
        const changeEvent = new Event('change', { bubbles: true });
        programSelect.dispatchEvent(changeEvent);
    }
    
    // Set block after options are populated
    setTimeout(() => {
        const blockSelect = document.getElementById('edit_unit_block');
        if (blockSelect && block) {
            blockSelect.value = block;
        }
    }, 200);
    
    // Show modal
    const modal = document.getElementById('editUnitModal');
    if (modal) modal.style.display = 'flex';
}

// ============================================================
// HANDLE EDIT UNIT - COMPLETE TVET SUPPORT
// ============================================================

async function handleEditUnit(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const id = document.getElementById('edit_unit_id').value;
    const unit_code = document.getElementById('edit_unit_code').value.trim();
    const unit_name = document.getElementById('edit_unit_name').value.trim();
    const description = document.getElementById('edit_unit_description').value.trim() || '';
    const program = document.getElementById('edit_unit_program').value;
    const year = parseInt(document.getElementById('edit_unit_year').value);
    const block = document.getElementById('edit_unit_block').value;
    const credits = parseInt(document.getElementById('edit_unit_credits').value) || 3;
    const hours = parseInt(document.getElementById('edit_unit_hours').value) || 0;
    const unit_type = document.getElementById('edit_unit_type').value;
    const prerequisites = document.getElementById('edit_unit_prerequisites').value.trim() || null;
    
    if (!unit_code || !unit_name || !program || !year || !block) {
        showFeedback('Unit Code, Unit Name, Program, Year, and Block/Term are required.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const updateData = {
            unit_code: unit_code,
            unit_name: unit_name,
            description: description,
            program: program,
            year: year,
            block: block,
            credits: credits,
            hours: hours,
            unit_type: unit_type || 'Core',
            prerequisites: prerequisites,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await sb.from('units_catalog').update(updateData).eq('id', id);
        if (error) throw error;

        await logAudit('UNIT_EDIT', `Updated unit ${unit_code}`, id, 'SUCCESS');
        showFeedback(`✅ Unit "${unit_code}" updated successfully!`, 'success');
        
        // Close modal
        const modal = document.getElementById('editUnitModal');
        if (modal) modal.style.display = 'none';
        
        // Refresh units list
        if (typeof loadAllUnits === 'function') {
            loadAllUnits();
        } else {
            loadUnits();
        }
        
    } catch (e) {
        await logAudit('UNIT_EDIT', `Failed to update unit ID ${id}. Reason: ${e.message}`, id, 'FAILURE');
        showFeedback(`❌ Failed to update unit: ${e.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================================
// EXPORT UNITS TO CSV
// ============================================================

function exportUnitsToCSV() {
    const rows = document.querySelectorAll('#units-table-body tr, #courses-table tbody tr');
    let csv = 'Unit Code,Unit Name,Program,Year,Block/Term,Type,Credits,Hours,Status\n';
    
    rows.forEach(row => {
        if (row.style.display === 'none') return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;
        
        const unitCode = cells[0]?.textContent?.trim() || '';
        const unitName = cells[1]?.textContent?.trim() || '';
        const program = cells[2]?.textContent?.trim() || '';
        const year = cells[3]?.textContent?.trim() || '';
        const block = cells[4]?.textContent?.trim() || '';
        const type = cells[5]?.textContent?.trim() || '';
        const status = cells[6]?.textContent?.trim() || '';
        
        csv += `"${unitCode}","${unitName}","${program}","${year}","${block}","${type}","${status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Units_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showFeedback('✅ Units exported successfully!', 'success');
}

// ============================================================
// FILTER UNITS BY PROGRAM TYPE
// ============================================================

function filterUnitsByProgramType() {
    const filter = document.getElementById('unit_program_type_filter')?.value || 'all';
    const rows = document.querySelectorAll('#units-table-body tr, #courses-table tbody tr');
    
    rows.forEach(row => {
        const programCell = row.querySelector('td:nth-child(3)') || row.cells[2];
        if (!programCell) return;
        
        const programText = programCell.textContent || '';
        const isTVET = programText.includes('TVET') || programText.includes('🔧');
        const isKRCHN = programText.includes('KRCHN') || programText.includes('🎓');
        
        let show = true;
        if (filter === 'krchn') show = isKRCHN;
        else if (filter === 'tvet') show = isTVET;
        
        row.style.display = show ? '' : 'none';
    });
}

// ============================================================
// RESET UNIT FILTERS
// ============================================================

function resetUnitFilters() {
    const search = document.getElementById('unit_search');
    const program = document.getElementById('unit_filter_program');
    const year = document.getElementById('unit_filter_year');
    const block = document.getElementById('unit_filter_block');
    const type = document.getElementById('unit_program_type_filter');
    
    if (search) search.value = '';
    if (program) program.value = '';
    if (year) year.value = '';
    if (block) block.value = '';
    if (type) type.value = 'all';
    
    // Show all rows
    document.querySelectorAll('#units-table-body tr, #courses-table tbody tr').forEach(row => {
        row.style.display = '';
    });
}

// ============================================================
// LEGACY SUPPORT - Keep old function names for compatibility
// ============================================================

// Alias for old "Courses" functions
const handleAddCourse = handleAddUnit;
const loadCourses = loadUnits;
const deleteCourse = deleteUnit;
const openEditCourseModal = openEditUnitModal;
const handleEditCourse = handleEditUnit;
const exportCoursesToCSV = exportUnitsToCSV;

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.handleAddUnit = handleAddUnit;
window.loadUnits = loadUnits;
window.deleteUnit = deleteUnit;
window.openEditUnitModal = openEditUnitModal;
window.handleEditUnit = handleEditUnit;
window.exportUnitsToCSV = exportUnitsToCSV;
window.filterUnitsTable = filterUnitsTable;
window.filterUnitsByProgramType = filterUnitsByProgramType;
window.resetUnitFilters = resetUnitFilters;

// Legacy aliases
window.handleAddCourse = handleAddUnit;
window.loadCourses = loadUnits;
window.deleteCourse = deleteUnit;
window.openEditCourseModal = openEditUnitModal;
window.handleEditCourse = handleEditUnit;
window.exportCoursesToCSV = exportUnitsToCSV;

console.log('✅ Unit Management module loaded (TVET/KRCHN support)!');
