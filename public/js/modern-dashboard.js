// Modern Dashboard JavaScript
// Handles data loading and functionality for the new HeroUI Pro dashboard

// Global variables
let currentCivPage = 0;
let currentVehPage = 0;
let currentGunPage = 0;
let currentLicensePage = 1; // Start on page 1 for licenses
const itemsPerPage = 6;
let isLoadingFirearms = false;

// Vehicle management variables
let linkedVehiclePage = 0;
let allLinkedVehicles = [];
let hasMoreVehicles = false;
const linkedVehiclesPerPage = 8;

// Firearm management variables
let linkedFirearmPage = 0;
let allLinkedFirearms = [];
let hasMoreFirearms = false;
const linkedFirearmsPerPage = 8;

// Initialize dashboard when document is ready
$(document).ready(function() {
    // Load initial data - load community data first, then civilians
    loadCommunityData().then(() => {
        loadCivilians();
    }).catch(() => {
        // Load civilians even if community data fails
        loadCivilians();
    });
    
    loadVehicles();
    loadFirearms();
    loadLicenses();
    
    // Setup subscription badge
    setupSubscriptionBadge();
    
    // Load departments
    fetchAndRenderModernDepartments();
    
    // Check civilian creation limits and update UI accordingly
    checkCivilianCreationLimitsOnLoad();
    
    // Check vehicle creation limits and update UI accordingly
    checkVehicleCreationLimitsOnLoad();
    
    // Check firearm creation limits and update UI accordingly
    checkFirearmCreationLimitsOnLoad();
    
    // Add backup event listeners for Add New Civilian buttons
    // This ensures the buttons work even if onclick attributes fail
    $(document).on('click', '#btnAddCivilian, [onclick*="openNewCivModal"]', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openNewCivModal === 'function') {
            openNewCivModal();
        } else {
            alert('Error: Function not loaded. Please refresh the page.');
        }
    });
    
    // Setup search functionality
    setupSearch();
    
    // Always check component permissions on page load
    // This ensures the UI reflects the current state of department components
    setTimeout(() => {
        refreshComponentPermissions();
    }, 1000); // Small delay to ensure community data is loaded first
    
    // Setup pagination
    setupPagination();
    
    // Setup modal event handlers
    $('#firearmDetailsModalClose').click(closeFirearmDetailsModal);
    $('#firearmDetailsModalClose2').click(closeFirearmDetailsModal);
    
    // Setup civilian modal event handlers
    $('#civDetailsModalClose').click(closeCivDetailsModal);
    $('#civDetailsModalClose2').click(closeCivDetailsModal);
    
    // Setup height/weight toggle buttons
    setupHeightWeightToggles();
    
    // Setup custom checkboxes
    setupCustomCheckboxes();
    
    // Initialize notification count
    fetchNotificationCount();
    
    // Set up periodic refresh of notification count (every 30 seconds)
    setInterval(fetchNotificationCount, 30000);
    
    // Prevent form submission for edit firearm form
    $('#editFirearmForm').on('submit', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Handle edit button click - prevent duplicate calls
    $('#firearmDetailsEditBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent duplicate calls
        if (isUpdatingFirearm) {
            return false;
        }
        
        const firearmId = document.getElementById('firearmIdHidden').value;
        if (firearmId) {
            updateFirearmModern(firearmId);
        } else {
            showToast('Error: No firearm ID found');
        }
        return false;
    });
    
    $('#firearmDetailsDeleteBtn').click(function() {
        const firearmId = document.getElementById('firearmIdHidden').value;
        if (firearmId) {
            deleteFirearmModern(firearmId);
        }
    });
    
    // Prevent form submission for edit civilian form
    $('#editCivilianForm').on('submit', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Setup civilian modal button handlers
    $('#civDetailsEditBtn').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        const civId = document.getElementById('civIdHidden').value;
        if (civId) {
            updateCivModern(civId);
        }
        return false;
    });
    
    $('#civDetailsDeleteBtn').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const civId = document.getElementById('civIdHidden').value;
        if (civId && confirm('Are you sure you want to delete this civilian? This action cannot be undone.')) {
            // Prevent any form submissions or redirects
            const currentUrl = window.location.href;
            
            $.ajax({
                url: `${API_URL}/api/v1/civilian/${civId}`,
                method: 'DELETE',
                xhrFields: {
                    // Prevent automatic redirect following
                    withCredentials: false
                },
                success: function(response, textStatus, xhr) {
                    // Ensure we're still on the same page
                    if (window.location.href !== currentUrl) {
                        // If somehow redirected, go back
                        window.history.pushState({}, '', currentUrl);
                    }
                    
                    showToast('Civilian deleted successfully!');
                    closeCivDetailsModal();
                    loadCivilians();
                    
                    // Update civilian creation button state after deleting civilian
                    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
                    if (communityId) {
                        updateCivilianCreationButtonState(communityId, null); // Will fetch current limit
                    }
                },
                error: function(xhr) {
                    // Ensure we're still on the same page
                    if (window.location.href !== currentUrl) {
                        // If somehow redirected, go back
                        window.history.pushState({}, '', currentUrl);
                    }
                    
                    // Check for 401/403 which might indicate session issues
                    if (xhr.status === 401 || xhr.status === 403) {
                        showToast('Authentication error. Please refresh the page and try again.');
                        return;
                    }
                    
                    showToast('Failed to delete civilian: ' + (xhr.responseJSON?.message || 'Unknown error'));
                }
            });
        }
        return false;
    });
    
    $('#generateSerialBtn').click(function() {
        generateSerialNumber(8, 'firearmSerial');
    });
    
    $('#firearmImageUpload').click(function() {
        $('#firearmImageInput').click();
    });
    
    // New firearm modal handlers
    $('#newFirearmModalClose').click(closeNewFirearmModal);
    $('#newFirearmModalCancel').click(closeNewFirearmModal);
    
    // Create firearm form submission
    $('#createFirearmForm').submit(function(e) {
        e.preventDefault();
        
        const newFirearmImageUrl = document.getElementById('newFirearmImageUrl') ? document.getElementById('newFirearmImageUrl').value : '';
        const formData = {
            serialNumber: $('#newFirearmSerial').val(),
            name: $('#newFirearmName').val(),
            weaponType: $('#newFirearmType').val(),
            caliber: $('#newFirearmCaliber').val(),
            color: $('#newFirearmColor').val(),
            isStolen: $('#newFirearmIsStolen').val(),
            image: newFirearmImageUrl,
            userID: dbUser._id,
            activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID
        };
        
        // Validate required fields
        if (!formData.serialNumber || !formData.name || !formData.weaponType) {
            showToast('Please fill in all required fields.');
            return;
        }
        
        // Make API call
        $.ajax({
            url: `${API_URL}/api/v1/firearm`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                showToast('Firearm created successfully!');
                closeNewFirearmModal();
                $('#createFirearmForm')[0].reset();
                // Reset to first page and refresh
                currentGunPage = 0;
                setTimeout(function() {
                    if (isLoadingFirearms) {
                        setTimeout(function() {
                            loadFirearms();
                        }, 200);
                    } else {
                        loadFirearms();
                    }
                }, 500);
                
                // Update firearm creation button states after successful creation
                const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
                if (communityId) {
                    checkFirearmCreationLimitsOnLoad();
                }
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'Failed to create firearm';
                showToast('Error: ' + errorMessage);
            }
        });
    });
    
    // Generate serial number for new firearm
    $('#generateNewSerialBtn').click(function() {
        generateSerialNumber(8, 'newFirearmSerial');
    });
    
    // New firearm image upload handler
    $('#newFirearmImageUpload').click(function() {
        $('#newFirearmImageInput').click();
    });
    
    // Emergency Services modal handlers
    $('#emergencyServicesModalClose').click(closeEmergencyServicesModal);
    $('#emergencyServicesModalCancel').click(closeEmergencyServicesModal);

    // Call 911 modal handlers
    $('#call911ModalClose').click(closeCall911Modal);
    $('#call911ModalCancel').click(closeCall911Modal);

    // Call 911 form submission
    $('#call911Form').submit(function(e) {
        e.preventDefault();
        submit911Call();
    });
    
    // Notification modal handlers
    $('#notificationModalClose').click(closeNotificationModal);
    $('#notificationModalCancel').click(closeNotificationModal);
    $('#notificationMenuModalClose').click(closeNotificationMenuModal);
    
    // Account modal handlers
    $('#accountModalClose').click(closeAccountModal);
    $('#deleteAccountConfirmModalClose').click(closeDeleteAccountModal);
    
    // Account form handlers
    $('#accountUsername_2').on('keyup', function(e) {
        if(e.target.value != dbUser.user.username && e.target.value != '') {
            $('#updateUsernameBtns').show();
        } else {
            $('#updateUsernameBtns').hide();
        }
    });
    
    $('#accountCallSign_2').on('keyup', function(e) {
        if(e.target.value != dbUser.user.callSign && e.target.value != '') {
            $('#updateCallSignBtns').show();
        } else {
            $('#updateCallSignBtns').hide();
        }
    });
    
    // Vehicle management handlers
    $('#manage-prev-veh-page-btn').on('click', function(e) {
        e.preventDefault();
        getPrevVehiclePage();
    });
    
    $('#manage-next-veh-page-btn').on('click', function(e) {
        e.preventDefault();
        getNextVehiclePage();
    });
    
    // License management handlers
    $('#manage-prev-license-page-btn').on('click', function(e) {
        e.preventDefault();
        getPrevLicensePage();
    });
    
    $('#manage-next-license-page-btn').on('click', function(e) {
        e.preventDefault();
        getNextLicensePage();
    });
    
    // License modal handlers
    $('#licenseDetailsModalClose').click(closeLicenseDetailsModal);
    $('#newLicenseModalClose').click(closeNewLicenseModal);
    
    // Vehicle search handler is now attached in the EJS file when the vehicles tab is clicked
    
    // Volume slider handler
    $('#alert-volume-slider').on('input', function() {
        $('#volume-display').text($(this).val());
    });

    // Wire up Delete Vehicle button in modal
    $('#vehDetailsDeleteBtn').off('click').on('click', function(e) {
        e.preventDefault();
        const vehId = $('#vehIdHidden').val();
        if (vehId && confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
            $.ajax({
                url: `${API_URL}/api/v1/vehicle/${vehId}`,
                method: 'DELETE',
                success: function() {
                    showToast('Vehicle deleted successfully!');
                    closeVehDetailsModal();
                    loadVehicles();
                    
                    // Update vehicle creation button states after successful deletion
                    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
                    if (communityId) {
                        checkVehicleCreationLimitsOnLoad();
                    }
                },
                error: function(xhr) {
                    showToast('Failed to delete vehicle: ' + (xhr.responseJSON?.message || xhr.statusText || 'Unknown error'));
                }
            });
        }
    });
});

// Search functionality
function setupSearch() {
    $('#civilian-search').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        
        if (searchTerm.length >= 2) {
            // Search across all sections
            searchAllSections(searchTerm);
        } else if (searchTerm.length === 0) {
            // Reset to show all items
            loadCivilians();
            loadVehicles();
            loadFirearms();
        }
    });
}

function searchAllSections(searchTerm) {
    // Search civilians
    $.ajax({
        url: `${API_URL}/api/v1/civilians/search?q=${searchTerm}&limit=8&page=0`,
        method: 'GET',
        success: function(data) {
            if (data && data.civilians) {
                renderCivilians(data.civilians);
            }
        },
        error: function(xhr) {
            // Silently handle search errors - user will see empty results
        }
    });
    
    // Search vehicles
    $.ajax({
        url: `${API_URL}/api/v1/vehicles/search?q=${searchTerm}&limit=8&page=0`,
        method: 'GET',
        success: function(data) {
            if (data && data.vehicles) {
                renderVehicles(data.vehicles);
            }
        },
        error: function(xhr) {
            // Silently handle search errors - user will see empty results
        }
    });
    
    // Search firearms
    $.ajax({
        url: `${API_URL}/api/v1/firearms/search?q=${searchTerm}&limit=8&page=0`,
        method: 'GET',
        success: function(data) {
            if (data && data.firearms) {
                renderFirearms(data.firearms);
            }
        },
        error: function(xhr) {
            // Silently handle search errors - user will see empty results
        }
    });
    
    // Search licenses with enhanced type matching
    $.ajax({
        url: `${API_URL}/api/v1/licenses/search?q=${searchTerm}&limit=8&page=1`,
        method: 'GET',
        success: function(data) {
            let licenses = [];
            if (data && data.data) {
                licenses = data.data;
            } else if (Array.isArray(data)) {
                licenses = data;
            }
            
            // Enhanced filtering for license types
            if (licenses.length > 0) {
                const filteredLicenses = licenses.filter(license => {
                    const licenseData = license.license ? license.license : license;
                    const type = licenseData.type || '';
                    const status = licenseData.status || '';
                    const notes = licenseData.notes || '';
                    
                    // Common license type variations and aliases
                    const licenseTypeVariations = {
                        'drivers': ['drivers license', 'driver license', 'driving license', 'dl', 'driver\'s license'],
                        'weapon': ['weapon license', 'firearm license', 'gun license', 'firearms permit', 'weapon permit'],
                        'hunting': ['hunting license', 'hunting permit', 'game license'],
                        'fishing': ['fishing license', 'fishing permit', 'angling license'],
                        'business': ['business license', 'commercial license', 'trade license'],
                        'medical': ['medical license', 'healthcare license', 'nursing license'],
                        'law': ['law license', 'legal license', 'attorney license', 'bar license'],
                        'real estate': ['real estate license', 'realtor license', 'property license'],
                        'contractor': ['contractor license', 'construction license', 'building license'],
                        'cosmetology': ['cosmetology license', 'beauty license', 'hair license'],
                        'massage': ['massage license', 'therapy license', 'wellness license'],
                        'liquor': ['liquor license', 'alcohol license', 'bar license', 'pub license'],
                        'food': ['food license', 'restaurant license', 'catering license'],
                        'vehicle': ['vehicle license', 'auto license', 'car license', 'motor vehicle license']
                    };
                    
                    // Check if search term matches any license type variations
                    const searchLower = searchTerm.toLowerCase();
                    const typeLower = type.toLowerCase();
                    const statusLower = status.toLowerCase();
                    const notesLower = notes.toLowerCase();
                    
                    // Direct matches
                    const directMatch = typeLower.includes(searchLower) || 
                                      statusLower.includes(searchLower) || 
                                      notesLower.includes(searchLower);
                    
                    // Check license type variations
                    let variationMatch = false;
                    for (const [category, variations] of Object.entries(licenseTypeVariations)) {
                        if (category.includes(searchLower) || variations.some(v => v.includes(searchLower))) {
                            variationMatch = true;
                            break;
                        }
                    }
                    
                    return directMatch || variationMatch;
                });
                
                renderLicenses(filteredLicenses);
            } else {
                renderLicenses([]);
            }
        },
        error: function(xhr) {
            // Silently handle search errors - show empty results
            renderLicenses([]);
        }
    });
}

// Load community data to check approval settings
function loadCommunityData() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    if (!communityId) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${API_URL}/api/v1/community/${communityId}`,
            method: 'GET',
            success: function(data) {
                window.currentCommunityData = data.community;
                // Show/hide approval notice based on community settings
                const approvalNotice = document.getElementById('civApprovalNotice');
                if (approvalNotice && data.community?.civilianApprovalSystemEnabled) {
                    approvalNotice.style.display = 'block';
                } else if (approvalNotice) {
                    approvalNotice.style.display = 'none';
                }
                
                // Check and apply component permissions
                checkComponentPermissions(data.community);
                
                // Re-render civilians if they're already loaded to show approval indicators
                if (lastRenderedCivilians && lastRenderedCivilians.length > 0) {
                    renderCivilians(lastRenderedCivilians);
                }
                resolve(data.community);
            },
            error: function(xhr) {
                // Silently handle error - will retry on next load
                reject(xhr);
            }
        });
    });
}

// Check component permissions and show/hide sections accordingly
function checkComponentPermissions(communityData) {
    if (!communityData || !communityData.departments) {
        return;
    }
    
    // Get the department ID from the URL or page data
    const currentDepartmentId = window.currentDepartmentId || getDepartmentIdFromUrl();
    
    // Find the department by ID first (most accurate)
    let civilianDept = null;
    if (currentDepartmentId) {
        civilianDept = communityData.departments.find(dept => dept._id === currentDepartmentId);
    }
    
    // If not found by ID, try finding by name as fallback
    if (!civilianDept) {
        civilianDept = communityData.departments.find(dept => 
            dept.name === 'Civvies' || dept.name === 'Civilians' || dept.name.toLowerCase().includes('civilian')
        );
    }
    
    // If still not found, try to find by template name
    if (!civilianDept) {
        civilianDept = communityData.departments.find(dept => 
            dept.template && dept.template.name && dept.template.name.toLowerCase().includes('civilian')
        );
    }
    
    // If still not found, use the first department as fallback
    if (!civilianDept && communityData.departments.length > 0) {
        civilianDept = communityData.departments[0];
    }
    
    // Helper function to get department ID from URL
    function getDepartmentIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedDeptId = urlParams.get('d');
        if (encodedDeptId) {
            try {
                // Decode the department ID (assuming it's base64 encoded)
                return atob(encodedDeptId);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
    
    if (!civilianDept || !civilianDept.template || !civilianDept.template.components) {
        return;
    }
    
    const components = civilianDept.template.components;
    
    // Check each component and show/hide corresponding sections
    const componentMappings = {
        'createCivilians': {
            navId: 'navAddCivilian',
            sectionId: 'civiliansSection',
            btnId: 'btnAddCivilian'
        },
        'createVehicles': {
            navId: 'navAddVehicle',
            sectionId: 'vehiclesSection',
            btnId: 'btnAddVehicle'
        },
        'createFirearms': {
            navId: 'navAddFirearm',
            sectionId: 'firearmsSection',
            btnId: 'btnAddFirearm'
        },
        'call911': {
            navId: 'navCall911',
            sectionId: null, // No main section for 911
            btnId: null
        }
    };
    
    // Apply permissions for each component
    Object.keys(componentMappings).forEach(componentName => {
        const component = components.find(comp => comp.name === componentName);
        const mapping = componentMappings[componentName];
        const isEnabled = component ? component.enabled : false;
        
        // Show/hide navigation items
        if (mapping.navId) {
            const navElement = document.getElementById(mapping.navId);
            if (navElement) {
                navElement.style.display = isEnabled ? 'block' : 'none';
            }
        }
        
        // Show/hide main sections
        if (mapping.sectionId) {
            const sectionElement = document.getElementById(mapping.sectionId);
            if (sectionElement) {
                sectionElement.style.display = isEnabled ? 'block' : 'none';
            }
        }
        
        // Show/hide buttons (if they exist outside the sections)
        if (mapping.btnId) {
            const btnElement = document.getElementById(mapping.btnId);
            if (btnElement) {
                // Check if user is admin before hiding buttons
                const isOwner = communityData && communityData.ownerID === dbUser._id;
                const hasAdminPermission = checkUserAdminPermission(communityData);
                const isAdmin = isOwner || hasAdminPermission;
                
                if (isAdmin && componentName === 'createCivilians') {
                    // Admin can always see civilian creation button, regardless of component status
                    btnElement.style.display = 'inline-flex';
                } else {
                    btnElement.style.display = isEnabled ? 'inline-flex' : 'none';
                }
            }
        }
    });
}

// Function to refresh component permissions (can be called from other pages)
function refreshComponentPermissions() {
    loadCommunityData().then((communityData) => {
        // Component permissions refreshed
        // After component permissions are set, check if user is admin and update button styling
        const isOwner = communityData && communityData.ownerID === dbUser._id;
        const hasAdminPermission = checkUserAdminPermission(communityData);
        const isAdmin = isOwner || hasAdminPermission;
        
        if (isAdmin) {
            // User is admin, ensure buttons are properly styled for admin
            // Use setTimeout to ensure this runs after checkComponentPermissions
            setTimeout(() => {
                updateCivilianCreationButtonsForAdmin(null);
            }, 0);
        }
    }).catch(() => {
        // Failed to refresh component permissions
    });
}

// Check if user has administrator permission in community roles
function checkUserAdminPermission(communityData) {
    if (!communityData || !communityData.roles || !Array.isArray(communityData.roles)) {
        return false;
    }
    
    const userId = dbUser._id;
    
    // Check each role to see if user is a member and has administrator permission
    for (const role of communityData.roles) {
        if (role.members && role.members.includes(userId)) {
            // User is a member of this role, check if role has administrator permission enabled
            if (role.permissions && Array.isArray(role.permissions)) {
                const hasAdminPermission = role.permissions.some(permission => 
                    permission.name === 'administrator' && permission.enabled === true
                );
                if (hasAdminPermission) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Make refreshComponentPermissions available globally so it can be called from other pages
window.refreshComponentPermissions = refreshComponentPermissions;

// Load Civilians
function loadCivilians() {
    $('#civilians-loading').show();
    $('#personas-thumbnail').hide();
    $('#issue-loading-personnel-alert').hide();
    $('#no-civilians-found-alert').hide();
    
    $.ajax({
        url: `${API_URL}/api/v1/civilians/user/${dbUser._id}?active_community_id=${dbUser.user.lastAccessedCommunity?.communityID}&limit=${itemsPerPage}&page=${currentCivPage}`,
        method: 'GET',
        success: function(data) {
            $('#civilians-loading').hide();
            
            // Handle both array and object responses
            let civilians = [];
            if (Array.isArray(data)) {
                // API returned array directly
                civilians = data;
            } else if (data && data.civilians && Array.isArray(data.civilians)) {
                // API returned object with civilians property
                civilians = data.civilians;
            }
            
            if (civilians.length > 0) {
                renderCivilians(civilians);
                $('#personas-thumbnail').show();
            } else {
                $('#no-civilians-found-alert').show();
            }
        },
        error: function(xhr) {
            // Silently handle error - user will see error alert
            $('#civilians-loading').hide();
            $('#issue-loading-personnel-alert').show();
        }
    });
}

let lastRenderedCivilians = [];
let lastRenderedVehicles = [];
let lastRenderedFirearms = [];
let lastRenderedLicenses = [];

function renderCivilians(civilians) {
    const container = $('#personas-thumbnail');
    
    container.empty();
    lastRenderedCivilians = civilians; // Store the full array for modal lookup
    
    civilians.forEach((civ, index) => {
        const civData = civ.civilian ? civ.civilian : civ;
        const fullName = civData.name || 'Unnamed Civilian';
        
        // Check approval status and community settings
        const approvalStatus = civData.approvalStatus;
        const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
        
        // Determine if we should show approval indicators
        let approvalIndicator = '';
        let cardClass = 'card civ-card';
        
        // Check if community has civilian approval system enabled
        if (communityId && window.currentCommunityData?.civilianApprovalSystemEnabled) {
            if (!civData.approvalStatus) {
                // No status field - needs action (yellow)
                approvalIndicator = '<div class="approval-badge no-status" title="Action Required"><i class="fa fa-exclamation-triangle"></i></div>';
                cardClass += ' no-status';
            } else if (approvalStatus === 'requested_review') {
                // Actively being reviewed (blue)
                approvalIndicator = '<div class="approval-badge requested-review" title="Requested Review"><i class="fa fa-clock"></i></div>';
                cardClass += ' requested-review';
            } else if (approvalStatus === 'approved') {
                // Approved (green)
                approvalIndicator = '<div class="approval-badge approved" title="Approved"><i class="fa fa-check-circle"></i></div>';
                cardClass += ' approved';
            } else if (approvalStatus === 'pending') {
                // Legacy pending status (orange)
                approvalIndicator = '<div class="approval-badge pending" title="Pending Approval"><i class="fa fa-clock"></i></div>';
                cardClass += ' pending-approval';
            }
        }
        
        // Avatar logic
        let avatarHtml = '';
        if (civData.image && civData.image.startsWith('https://')) {
            avatarHtml = `<img src="${civData.image}" alt="Avatar" style="width:50px;height:50px;object-fit:cover;border-radius:50%;background:#23263a;">`;
        } else {
            const initials = civData.name ? civData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'C';
            avatarHtml = `<span style="display:flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-size:1.3rem;font-weight:700;">${initials}</span>`;
        }
        // Use a data attribute to store the index for event delegation
        const card = `
            <div class="${cardClass}" data-civ-index="${index}">
                ${approvalIndicator || '<div class="edit-badge" title="Edit Civilian" style="position:absolute;top:0.5rem;right:0.5rem;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;z-index:10;background:rgba(102,126,234,0.25);color:#a0aec0;"><i class="fa fa-edit"></i></div>'}
                <div class="card-header">
                    <div class="card-avatar">
                        ${avatarHtml}
                    </div>
                    <div>
                        <div class="card-title" style="font-size:1.25rem;font-weight:700;color:#f7fafc;margin-bottom:0.25rem;">${fullName}</div>
                        <p class="card-subtitle">Age: ${getAge(civData.birthday)}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p><strong>Gender:</strong> ${civData.gender || 'N/A'}</p>
                    <p><strong>Address:</strong> ${civData.address || 'N/A'}</p>
                </div>
            </div>
        `;
        container.append(card);
    });
    
    // Add click handler for all civilian cards (event delegation)
    container.off('click', '.civ-card');
    container.on('click', '.civ-card', function() {
        const index = $(this).data('civ-index');
        const civ = lastRenderedCivilians[index];
        // Pass the full root object to the modal
        openCivDetailsModal(civ);
    });
    
    container.show();
}

// Load Vehicles
function loadVehicles() {
    $('#vehicles-loading').show();
    $('#vehicles-thumbnail').hide();
    $('#issue-loading-vehicles-alert').hide();
    $('#no-vehicles-found-alert').hide();
    
    $.ajax({
        url: `${API_URL}/api/v1/vehicles/user/${dbUser._id}?active_community_id=${dbUser.user.lastAccessedCommunity?.communityID}&limit=${itemsPerPage}&page=${currentVehPage}`,
        method: 'GET',
        success: function(data) {
            $('#vehicles-loading').hide();
            
            // Handle both array and object responses
            let vehicles = [];
            if (Array.isArray(data)) {
                // API returned array directly
                vehicles = data;
            } else if (data && data.vehicles && Array.isArray(data.vehicles)) {
                // API returned object with vehicles property
                vehicles = data.vehicles;
            }
            
            if (vehicles.length > 0) {
                renderVehicles(vehicles);
                $('#vehicles-thumbnail').show();
            } else {
                $('#no-vehicles-found-alert').show();
            }
        },
        error: function(xhr) {
            $('#vehicles-loading').hide();
            $('#issue-loading-vehicles-alert').show();
        }
    });
}

function renderVehicles(vehicles) {
    const container = $('#vehicles-thumbnail');
    
    container.empty();
    lastRenderedVehicles = vehicles; // Store the full array for modal lookup
    
    vehicles.forEach((veh, index) => {
        const vehData = veh.vehicle ? veh.vehicle : veh;
        const type = vehData.type || 'Unknown';
        let vehAvatarHtml = '';
        if (vehData.image && vehData.image.startsWith('https://')) {
            vehAvatarHtml = `<img src="${vehData.image}" alt="Vehicle" style="width:60px;height:45px;object-fit:cover;border-radius:8px;background:#23263a;">`;
        } else {
            vehAvatarHtml = `<i class="fa fa-car"></i>`;
        }
        const card = `
            <div class="card veh-card" data-veh-index="${index}">
                <div class="edit-badge" title="Edit Vehicle" style="position:absolute;top:0.5rem;right:0.5rem;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;z-index:10;background:rgba(102,126,234,0.25);color:#a0aec0;"><i class="fa fa-edit"></i></div>
                <div class="card-header">
                    <div class="card-avatar" style="${vehData.image && vehData.image.startsWith('https://') ? 'border-radius:8px;width:60px;height:45px;' : ''}">
                        ${vehAvatarHtml}
                    </div>
                    <div>
                        <h3 class="card-title" style="font-size:1.15rem;font-weight:700;color:#f7fafc;margin-bottom:0.25rem;">${vehData.plate}</h3>
                        <p class="card-subtitle">${type}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p><strong>Make:</strong> ${vehData.make || 'N/A'}</p>
                    <p><strong>Model:</strong> ${vehData.model || 'N/A'}</p>
                    <p><strong>Year:</strong> ${vehData.year || 'N/A'}</p>
                    ${(vehData.isStolen === 'true' || vehData.isStolen === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> STOLEN</p>' : ''}
                    ${(vehData.isExempt === 'true') ? '<p style="color:#3b82f6; font-weight:bold;"><i class="fa fa-shield"></i> EXEMPT</p>' : ''}
                    ${(vehData.validRegistration === 'false' || vehData.validRegistration === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> INVALID REGISTRATION</p>' : ''}
                    ${(vehData.validInsurance === 'false' || vehData.validInsurance === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> INVALID INSURANCE</p>' : ''}
                </div>
            </div>
        `;
        container.append(card);
    });
    
    // Add click handler for all vehicle cards (event delegation)
    container.off('click', '.veh-card');
    container.on('click', '.veh-card', function() {
        const index = $(this).data('veh-index');
        const veh = lastRenderedVehicles[index];
        // Pass the full root object to the modal
        openVehDetailsModal(veh);
    });
    
    container.show();
}

// Load Firearms
function loadFirearms() {
    // Prevent multiple simultaneous requests
    if (isLoadingFirearms) {
        return;
    }
    
    isLoadingFirearms = true;
    
    $('#firearms-loading').show();
    $('#firearms-thumbnail').hide();
    $('#issue-loading-firearms-alert').hide();
    $('#no-firearms-found-alert').hide();
    
    $.ajax({
        url: `${API_URL}/api/v1/firearms/user/${dbUser._id}?active_community_id=${dbUser.user.lastAccessedCommunity?.communityID}&limit=${itemsPerPage}&page=${currentGunPage}`,
        method: 'GET',
        timeout: 10000, // 10 second timeout
        success: function(data) {
            $('#firearms-loading').hide();
            isLoadingFirearms = false;
            
            // Handle both array and object responses
            let firearms = [];
            if (Array.isArray(data)) {
                // API returned array directly
                firearms = data;
            } else if (data && data.firearms && Array.isArray(data.firearms)) {
                // API returned object with firearms property
                firearms = data.firearms;
            }
            
            if (firearms.length > 0) {
                renderFirearms(firearms);
                $('#firearms-thumbnail').show();
                $('#no-firearms-found-alert').hide();
            } else {
                $('#firearms-thumbnail').hide();
                $('#no-firearms-found-alert').show();
            }
        },
        error: function(xhr) {
            $('#firearms-loading').hide();
            $('#firearms-thumbnail').hide();
            $('#issue-loading-firearms-alert').show();
            isLoadingFirearms = false;
        }
    });
}

// Load Licenses
function loadLicenses() {
    $('#licenses-loading').show();
    $('#licenses-thumbnail').hide();
    $('#issue-loading-licenses-alert').hide();
    $('#no-licenses-found-alert').hide();
    
    // For the main licenses tab, we need to get licenses for all civilians
    // This might need to be adjusted based on your requirements
    // For now, we'll use the user ID as a fallback, but ideally this should show all licenses
    const civilianId = dbUser._id; // This should be updated based on your requirements
    
    $.ajax({
        url: `${API_URL}/api/v1/licenses/civilian/${civilianId}?limit=${itemsPerPage}&page=${currentLicensePage}`,
        method: 'GET',
        success: function(data) {
            $('#licenses-loading').hide();
            
            // Handle the API response format with page, totalCount, and data
            let licenses = [];
            let totalCount = 0;
            let currentPage = 1;
            
            if (Array.isArray(data)) {
                // API returned array directly (fallback)
                licenses = data;
            } else if (data && data.data && Array.isArray(data.data)) {
                // API returned object with page, totalCount, and data properties
                licenses = data.data;
                totalCount = data.totalCount || 0;
                currentPage = data.page || 1;
            }
            
            if (licenses.length > 0) {
                renderLicenses(licenses);
                $('#licenses-thumbnail').show();
                $('#no-licenses-found-alert').hide();
                
                // Calculate proper pagination based on totalCount
                const totalPages = Math.ceil(totalCount / itemsPerPage);
                const hasMorePages = currentPage < totalPages;
                
                // Update pagination buttons
                $('#prev-license-page-btn').prop('disabled', currentPage <= 1);
                $('#next-license-page-btn').prop('disabled', !hasMorePages);
                
                // Update current page variable to match API response (API returns 1-based)
                currentLicensePage = currentPage;
            } else {
                $('#licenses-thumbnail').hide();
                $('#no-licenses-found-alert').show();
                
                // Update pagination buttons for empty results
                $('#prev-license-page-btn').prop('disabled', true);
                $('#next-license-page-btn').prop('disabled', true);
            }
        },
        error: function(xhr) {
            $('#licenses-loading').hide();
            $('#issue-loading-licenses-alert').show();
        }
    });
}

function renderFirearms(firearms) {
    const container = $('#firearms-thumbnail');
    
    container.empty();
    lastRenderedFirearms = firearms; // Store the full array for modal lookup
    
    firearms.forEach((firearm, index) => {
        const gunData = firearm.firearm ? firearm.firearm : firearm;
        
        let firearmAvatarHtml = '';
        if (gunData.image && gunData.image.startsWith('https://')) {
            firearmAvatarHtml = `<img src="${gunData.image}" alt="Firearm" style="width:60px;height:45px;object-fit:cover;border-radius:8px;background:#23263a;">`;
        } else {
            firearmAvatarHtml = `<i class="fa fa-crosshairs"></i>`;
        }
        const card = `
            <div class="card firearm-card" data-firearm-index="${index}">
                <div class="edit-badge" title="Edit Firearm" style="position:absolute;top:0.5rem;right:0.5rem;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;z-index:10;background:rgba(102,126,234,0.25);color:#a0aec0;"><i class="fa fa-edit"></i></div>
                <div class="card-header">
                    <div class="card-avatar" style="${gunData.image && gunData.image.startsWith('https://') ? 'border-radius:8px;width:60px;height:45px;' : ''}">
                        ${firearmAvatarHtml}
                    </div>
                    <div>
                        <h3 class="card-title">${gunData.name || gunData.serialNumber}</h3>
                        <p class="card-subtitle">${gunData.weaponType || 'Unknown Type'}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p><strong>Type:</strong> ${gunData.weaponType || 'N/A'}</p>
                    <p><strong>Caliber:</strong> ${gunData.caliber || 'N/A'}</p>
                    <p><strong>Serial:</strong> ${gunData.serialNumber || 'N/A'}</p>
                    ${(gunData.isStolen === 'true' || gunData.isStolen === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> STOLEN</p>' : ''}
                </div>
            </div>
        `;
        container.append(card);
    });
    
    // Add click handler for all firearm cards (event delegation)
    container.off('click', '.firearm-card');
    container.on('click', '.firearm-card', function() {
        const index = $(this).data('firearm-index');
        const firearm = lastRenderedFirearms[index];
        // Pass the full root object to the modal
        openFirearmDetailsModal(firearm);
    });
    
    container.show();
}

function renderLicenses(licenses) {
    const container = $('#licenses-thumbnail');
    
    container.empty();
    lastRenderedLicenses = licenses; // Store the full array for modal lookup
    
    licenses.forEach((license, index) => {
        const licenseData = license.license ? license.license : license;
        
        const card = `
            <div class="card license-card" data-license-index="${index}">
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fa fa-id-card"></i>
                    </div>
                    <div>
                        <h3 class="card-title">${licenseData.type || 'Unknown Type'}</h3>
                        <p class="card-subtitle">${licenseData.status || 'Unknown Status'}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p><strong>Type:</strong> ${licenseData.type || 'N/A'}</p>
                    <p><strong>Status:</strong> ${licenseData.status || 'N/A'}</p>
                    <p><strong>Expiry:</strong> ${licenseData.expirationDate || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${licenseData.notes || 'None'}</p>
                </div>
            </div>
        `;
        container.append(card);
    });
    
    // Add click handler for all license cards (event delegation)
    container.off('click', '.license-card');
    container.on('click', '.license-card', function() {
        const index = $(this).data('license-index');
        const license = lastRenderedLicenses[index];
        // Pass the full root object to the modal
        openLicenseDetailsModal(license);
    });
    
    container.show();
}

// Pagination functions
function setupPagination() {
    // Civilian pagination
    $('#prev-civ-page-btn').click(function() {
        if (currentCivPage > 0) {
            currentCivPage--;
            loadCivilians();
        }
    });
    
    $('#next-civ-page-btn').click(function() {
        currentCivPage++;
        loadCivilians();
    });
    
    // Vehicle pagination
    $('#prev-veh-page-btn').click(function() {
        if (currentVehPage > 0) {
            currentVehPage--;
            loadVehicles();
        }
    });
    
    $('#next-veh-page-btn').click(function() {
        currentVehPage++;
        loadVehicles();
    });
    
    // Firearm pagination
    $('#prev-gun-page-btn').click(function() {
        if (currentGunPage > 0) {
            currentGunPage--;
            loadFirearms();
        }
    });
    
    $('#next-gun-page-btn').click(function() {
        currentGunPage++;
        loadFirearms();
    });
    
    // License pagination
    $('#prev-license-page-btn').click(function() {
        if (currentLicensePage > 1) {
            currentLicensePage--;
            loadLicenses();
        }
    });
    
    $('#next-license-page-btn').click(function() {
        currentLicensePage++;
        loadLicenses();
    });
}

// Utility functions
function getAge(birthday) {
    if (!birthday) return 'N/A';
    
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Toast notification helper
function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2500);
}

// --- Civilian Pagination ---
function getPrevCivPage() {
    if (currentCivPage > 0) {
        currentCivPage--;
        loadCivilians();
    }
}

function getNextCivPage() {
    currentCivPage++;
    $.ajax({
        url: `${API_URL}/api/v1/civilians/user/${dbUser._id}?active_community_id=${dbUser.user.lastAccessedCommunity?.communityID}&limit=${itemsPerPage}&page=${currentCivPage}`,
        method: 'GET',
        success: function(data) {
            let civilians = [];
            if (Array.isArray(data)) {
                civilians = data;
            } else if (data && data.civilians && Array.isArray(data.civilians)) {
                civilians = data.civilians;
            }
            if (civilians.length > 0) {
                renderCivilians(civilians);
                $('#personas-thumbnail').show();
                $('#no-civilians-found-alert').hide();
            } else {
                currentCivPage--;
                showToast('No more civilians found.');
            }
        },
        error: function(xhr) {
            currentCivPage--;
            showToast('Error loading civilians.');
        }
    });
}

// --- Vehicle Pagination ---
function getPrevVehPage() {
    if (currentVehPage > 0) {
        currentVehPage--;
        loadVehicles();
    }
}

function getNextVehPage() {
    currentVehPage++;
    $.ajax({
        url: `${API_URL}/api/v1/vehicles/user/${dbUser._id}?active_community_id=${dbUser.user.lastAccessedCommunity?.communityID}&limit=${itemsPerPage}&page=${currentVehPage}`,
        method: 'GET',
        success: function(data) {
            let vehicles = [];
            if (Array.isArray(data)) {
                vehicles = data;
            } else if (data && data.vehicles && Array.isArray(data.vehicles)) {
                vehicles = data.vehicles;
            }
            if (vehicles.length > 0) {
                renderVehicles(vehicles);
                $('#vehicles-thumbnail').show();
                $('#no-vehicles-found-alert').hide();
            } else {
                currentVehPage--;
                showToast('No more vehicles found.');
            }
        },
        error: function(xhr) {
            currentVehPage--;
            showToast('Error loading vehicles.');
        }
    });
}

// --- Firearm Pagination ---
function getPrevGunPage() {
    if (currentGunPage > 0) {
        currentGunPage--;
        loadFirearms();
    }
}

function getNextGunPage() {
    currentGunPage++;
    loadFirearms();
}

// --- License Pagination ---
function getPrevLicensePage() {
    if (currentLicensePage > 1) {
        currentLicensePage--;
        loadLicenses();
    }
}

function getNextLicensePage() {
    currentLicensePage++;
    loadLicenses();
}

// --- Update button disabling on page load ---
$(document).ready(function() {
    function updatePaginationButtons() {
        $('#prev-civ-page-btn').parent().toggleClass('disabled', currentCivPage === 0);
        $('#prev-veh-page-btn').parent().toggleClass('disabled', currentVehPage === 0);
        $('#prev-gun-page-btn').parent().toggleClass('disabled', currentGunPage === 0);
        $('#prev-license-page-btn').prop('disabled', currentLicensePage === 1);
    }
    updatePaginationButtons();
    $(document).on('click', '#prev-civ-page-btn, #next-civ-page-btn, #prev-veh-page-btn, #next-veh-page-btn, #prev-gun-page-btn, #next-gun-page-btn, #prev-license-page-btn, #next-license-page-btn', function() {
        setTimeout(updatePaginationButtons, 200);
    });
}); 

// Update Civilian (modern modal)
function updateCivModern(civId) {
    const heightObj = getHeightAndClassification();
    const weightObj = getWeightAndClassification();
    const data = {
        name: $('#civName').val().trim(),
        birthday: $('#civDOB').val(),
        address: $('#civAddress').val().trim() || undefined,
        occupation: $('#civOccupation').val().trim() || undefined,
        gender: $('#civGender').val(),
        height: heightObj.value,
        heightClassification: heightObj.classification,
        weight: weightObj.value,
        weightClassification: weightObj.classification,
        eyeColor: $('#civEyeColor').val().trim() || undefined,
        hairColor: $('#civHairColor').val().trim() || undefined,
        organDonor: $('#civOrganDonor').data('checked') === true,
        veteran: $('#civVeteran').data('checked') === true,
        onParole: $('#civParole').data('checked') === true,
        onProbation: $('#civProbation').data('checked') === true,
        userID: dbUser._id,
        activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID
    };
    $.ajax({
        url: `${API_URL}/api/v1/civilian/${civId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(civ) {
            showToast('Civilian updated successfully!');
            closeCivDetailsModal();
            // Optionally, reload civilians or update the card in place
            loadCivilians();
        },
        error: function(xhr) {
            showToast('Failed to update civilian: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

// Send civilian for approval
function sendCivilianForApproval(civId) {
    if (!confirm('Are you sure you want to send this civilian for approval? This will notify community administrators.')) {
        return;
    }
    
    // Use the backend API following the existing pattern
    const requestData = {
        civilianId: civId,
        communityId: dbUser?.user?.lastAccessedCommunity?.communityID,
        userId: dbUser._id,
        action: 'send_for_approval'
    };
    
    $.ajax({
        url: `${API_URL}/api/v1/civilian/approval`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function(response) {
            showToast('Civilian sent for approval successfully!');
            closeCivDetailsModal();
            loadCivilians(); // Refresh the list to show updated status
        },
        error: function(xhr) {
            // Silently handle error - user sees toast message
            showToast('Failed to send civilian for approval. Please try again.');
        }
    });
}

// Wire up Update Civilian button in modal
$(document).ready(function() {
    $('#civDetailsEditBtn').off('click').on('click', function(e) {
        e.preventDefault();
        // Get the civilian ID from the hidden input
        const civId = $('#civIdHidden').val();
        if (civId) {
            updateCivModern(civId);
        } else {
            showToast('No civilian selected.');
        }
    });
    
    // Wire up Send for Approval button
    $('#civDetailsSendApprovalBtn').off('click').on('click', function(e) {
        e.preventDefault();
        const civId = $('#civIdHidden').val();
        if (civId) {
            sendCivilianForApproval(civId);
        } else {
            showToast('No civilian selected.');
        }
    });
});

// When opening the modal, store the current civ ID for update
function openCivDetailsModal(civ) {
    const civId = civ._id;
    const civData = civ.civilian ? civ.civilian : civ;
    
    // Ensure any existing modals are properly closed first
    closeVehDetailsModal();
    closeFirearmDetailsModal();
    closeNewFirearmModal();
    
    const modal = document.getElementById('civDetailsModal');
    if (!modal) {
        // Silently handle missing modal
        return;
    }
    
    document.getElementById('civIdHidden').value = civId || '';
    // Avatar logic
    var avatarImg = document.getElementById('civAvatarImg');
    var avatarInitials = document.getElementById('civAvatarInitials');
    if (civData.image && civData.image.startsWith('https://')) {
        avatarImg.src = civData.image;
        avatarImg.style.display = 'block';
        avatarInitials.style.display = 'none';
    } else {
        avatarImg.src = '';
        avatarImg.style.display = 'none';
        avatarInitials.textContent = civData.name ? civData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'C';
        avatarInitials.style.display = 'block';
    }
    document.getElementById('civName').value = civData.name || '';
    document.getElementById('civDOB').value = civData.birthday ? civData.birthday.split('T')[0] : '';
    document.getElementById('civAge').value = civData.birthday ? getAge(civData.birthday) : '';
    document.getElementById('civAddress').value = civData.address || '';
    document.getElementById('civOccupation').value = civData.occupation || '';
    document.getElementById('civGender').value = civData.gender || '';
    // Height/Weight prefill logic
    if (civData.heightClassification === 'Imperial') {
        $("#imperial").prop('checked', true);
        $(".height-imperial").show();
        $(".height-metric").hide();
        const totalInches = parseInt(civData.height) || 0;
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        $('#foot').val(feet);
        $('#inches').val(inches);
        $('#centimeters').val('');
    } else {
        $("#metric").prop('checked', true);
        $(".height-imperial").hide();
        $(".height-metric").show();
        $('#centimeters').val(civData.height || '');
        $('#foot').val('');
        $('#inches').val('');
    }
    if (civData.weightClassification === 'lbs') {
        $('#imperial-weight').prop('checked', true);
        $('.weight-imperial').show();
        $('.weight-metric').hide();
        $('#pounds').val(civData.weight || '');
        $('#kilos').val('');
    } else {
        $('#metric-weight').prop('checked', true);
        $('.weight-imperial').hide();
        $('.weight-metric').show();
        $('#kilos').val(civData.weight || '');
        $('#pounds').val('');
    }
    // Set custom checkbox states
    setCustomCheckboxState('#civOrganDonor', !!civData.organDonor);
    setCustomCheckboxState('#civVeteran', !!civData.veteran);
    setCustomCheckboxState('#civParole', !!civData.onParole);
    setCustomCheckboxState('#civProbation', !!civData.onProbation);
    document.getElementById('civEyeColor').value = civData.eyeColor || '';
    document.getElementById('civHairColor').value = civData.hairColor || '';
    // Show modal
    const civModal = document.getElementById('civDetailsModal');
    civModal.style.cssText = 'display: flex !important; position: fixed !important; z-index: 2000 !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(30,32,44,0.65) !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important;';
    
    // Reset all tabs to inactive state
    const allTabs = civModal.querySelectorAll('.heroui-tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.color = '#a0aec0';
    });
    
    // Set Edit tab as active
    const editTab = civModal.querySelector('.heroui-tab[data-tab="edit"]');
    if (editTab) {
        editTab.classList.add('active');
        editTab.style.color = '#fff';
    }
    
    // Hide all tab content
    const allTabContent = civModal.querySelectorAll('.heroui-tab-content');
    allTabContent.forEach(content => {
        content.style.display = 'none';
    });
    
    // Ensure Edit tab content is visible
    const tabContent = civModal.querySelector('#civTabContent-edit');
    if (tabContent) {
        tabContent.style.display = 'block';
    }
    
    // Clear search input if it exists
    const searchInput = document.getElementById('manage-vehicle-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Ensure modal is visible and properly positioned
    setTimeout(() => {
        if (civModal.style.display === 'flex') {
            civModal.scrollTop = 0;
        }
    }, 100);
    
    // Show/hide approval button and warning based on civilian status and community settings
    const approvalBtn = document.getElementById('civDetailsSendApprovalBtn');
    const pendingWarning = document.getElementById('civPendingWarning');
    const warningTitle = document.getElementById('civWarningTitle');
    const warningMessage = document.getElementById('civWarningMessage');
    const approvalStatus = civData.approvalStatus;
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (communityId && window.currentCommunityData?.civilianApprovalSystemEnabled) {
        if (!civData.approvalStatus || approvalStatus === 'requested_review' || approvalStatus === 'approved') {
            // Show approval button and warning for civilians that need action, are being reviewed, or are approved
            if (approvalBtn) approvalBtn.style.display = 'inline-block';
            if (pendingWarning) {
                pendingWarning.style.display = 'block';
                
                // Set dynamic warning message based on status
                if (!civData.approvalStatus) {
                    // No status - needs action
                    warningTitle.textContent = 'Action Required';
                    warningMessage.textContent = 'This civilian has no approval status and needs to be sent for review before appearing in CAD searches. You can send for approval by scrolling to the bottom of this form.';
                    // Change background to orange for no status
                    pendingWarning.style.background = 'linear-gradient(135deg,#ed8936 0%,#f6ad55 100%)';
                    pendingWarning.style.borderLeftColor = '#c05621';
                } else if (approvalStatus === 'requested_review') {
                    // Being reviewed
                    warningTitle.textContent = 'Review in Progress';
                    warningMessage.textContent = 'This civilian is currently being reviewed by community administrators. You will be notified once the review is complete.';
                    // Change background to blue for requested_review
                    pendingWarning.style.background = 'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)';
                    pendingWarning.style.borderLeftColor = '#2563eb';
                } else if (approvalStatus === 'approved') {
                    // Approved - show green warning
                    warningTitle.textContent = 'Civilian Approved';
                    warningMessage.textContent = 'This civilian is approved. Any changes will require re-approval. Use "Send for Approval" to submit changes.';
                    pendingWarning.style.background = 'linear-gradient(135deg,#10b981 0%,#34d399 100%)';
                    pendingWarning.style.borderLeftColor = '#059669';
                }
            }
        } else {
            // Hide approval button and warning for other statuses (handled by resubmit logic)
            if (approvalBtn) approvalBtn.style.display = 'none';
            if (pendingWarning) pendingWarning.style.display = 'none';
        }
    } else {
        // Hide both if approval system is not enabled
        if (approvalBtn) approvalBtn.style.display = 'none';
        if (pendingWarning) pendingWarning.style.display = 'none';
    }
    
    // Handle resubmit button for requires_edits, rejected, or denied civilians
    const resubmitBtn = document.getElementById('civDetailsResubmitBtn');
    if (resubmitBtn && communityId && window.currentCommunityData?.civilianApprovalSystemEnabled) {
        if (approvalStatus === 'requires_edits' || approvalStatus === 'require_edits' || approvalStatus === 'pending' || approvalStatus === 'rejected' || approvalStatus === 'denied') {
            // Show resubmit button and warning
            resubmitBtn.style.display = 'inline-block';
            if (pendingWarning) {
                pendingWarning.style.display = 'block';
                
                if (approvalStatus === 'requires_edits' || approvalStatus === 'require_edits' || approvalStatus === 'pending') {
                    // Require edits - show orange warning
                    warningTitle.textContent = 'Edits Required';
                    warningMessage.textContent = 'This civilian requires edits before approval. Please make the necessary changes and resubmit for approval.';
                    pendingWarning.style.background = 'linear-gradient(135deg,#ed8936 0%,#f6ad55 100%)';
                    pendingWarning.style.borderLeftColor = '#c05621';
                } else if (approvalStatus === 'rejected' || approvalStatus === 'denied') {
                    // Rejected - show red warning
                    warningTitle.textContent = 'Civilian Rejected';
                    warningMessage.textContent = 'This civilian was rejected. Please make the necessary changes and resubmit for approval.';
                    pendingWarning.style.background = 'linear-gradient(135deg,#f56565 0%,#fc8181 100%)';
                    pendingWarning.style.borderLeftColor = '#e53e3e';
                }
            }
        } else {
            // Hide resubmit button for other statuses
            resubmitBtn.style.display = 'none';
        }
    }
    
    // Handle Update Civilian button visibility based on approval status
    const updateBtn = document.getElementById('civDetailsEditBtn');
    if (updateBtn && communityId && window.currentCommunityData?.civilianApprovalSystemEnabled) {
        if (approvalStatus === 'approved') {
            // Approved civilian - hide update button to prevent changes
            updateBtn.style.display = 'none';
        } else {
            // Not approved - show update button
            updateBtn.style.display = 'inline-block';
        }
    }
    
    // Height/Weight prefill logic for details modal
    // Height
    if (civData.heightClassification === 'Imperial') {
        // Set toggle button state
        $('#civImperial').addClass('active').css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'color': '#fff'
        });
        $('#civMetric').removeClass('active').css({
            'background': 'transparent',
            'color': '#a0aec0'
        });
        $('.civ-height-imperial').show();
        $('.civ-height-metric').hide();
        const totalInches = parseInt(civData.height) || 0;
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        $('#civHeightFoot').val(feet);
        $('#civHeightInches').val(inches);
        $('#civHeightCm').val('');
    } else {
        // Set toggle button state
        $('#civMetric').addClass('active').css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'color': '#fff'
        });
        $('#civImperial').removeClass('active').css({
            'background': 'transparent',
            'color': '#a0aec0'
        });
        $('.civ-height-imperial').hide();
        $('.civ-height-metric').show();
        $('#civHeightCm').val(civData.height || '');
        $('#civHeightFoot').val('');
        $('#civHeightInches').val('');
    }
    // Weight
    if (civData.weightClassification === 'lbs') {
        // Set toggle button state
        $('#civImperialWeight').addClass('active').css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'color': '#fff'
        });
        $('#civMetricWeight').removeClass('active').css({
            'background': 'transparent',
            'color': '#a0aec0'
        });
        $('.civ-weight-imperial').show();
        $('.civ-weight-metric').hide();
        $('#civWeightLbs').val(civData.weight || '');
        $('#civWeightKg').val('');
    } else {
        // Set toggle button state
        $('#civMetricWeight').addClass('active').css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'color': '#fff'
        });
        $('#civImperialWeight').removeClass('active').css({
            'background': 'transparent',
            'color': '#a0aec0'
        });
        $('.civ-weight-imperial').hide();
        $('.civ-weight-metric').show();
        $('#civWeightKg').val(civData.weight || '');
        $('#civWeightLbs').val('');
    }

    // --- Civilian Records Sub-Tab Logic ---
    function renderCivRecordsTabs(civData) {
      // Render Criminal History
      const criminalHistory = civData.criminalHistory || [];
      let criminalHtml = '';
      if (criminalHistory.length === 0) {
        criminalHtml = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No criminal history found.</div>`;
      } else {
        criminalHtml = criminalHistory.map(entry => {
          const fines = (entry.fines || []).map(fine => `<li><strong>${fine.fineType}</strong> (${fine.category}): $${fine.fineAmount}</li>`).join('');
          return `
            <div class="criminal-history-entry" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-weight:600;font-size:1.1rem;">${entry.type || 'Unknown Type'}</div>
                <div style="font-size:0.95rem;color:#a0aec0;">${new Date(entry.createdAt).toLocaleDateString()}</div>
              </div>
              <ul style="margin:0.5rem 0 0.5rem 1.25rem;padding:0;list-style:disc;">${fines}</ul>
              <div style="font-size:0.95rem;color:#a0aec0;">${entry.notes ? `<strong>Notes:</strong> ${entry.notes}` : ''}</div>
              ${entry.redacted ? '<div style="color:#ef4444;font-weight:600;">Redacted</div>' : ''}
            </div>
          `;
        }).join('');
      }
      $('#civRecordsTabCriminal').html(criminalHtml);

      // Render Medical History (placeholder for now)
      $('#civRecordsTabMedical').html('<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No medical history records found.</div>');
    }

    // Tab switching logic for Records sub-tabs
    $(document).on('click', '#civTabCriminalHistory', function() {
      $('#civTabCriminalHistory, #civTabMedicalHistory').removeClass('active');
      $('#civTabCriminalHistory').addClass('active');
      $('#civRecordsTabCriminal').show();
      $('#civRecordsTabMedical').hide();
    });
    $(document).on('click', '#civTabMedicalHistory', function() {
      $('#civTabCriminalHistory, #civTabMedicalHistory').removeClass('active');
      $('#civTabMedicalHistory').addClass('active');
      $('#civRecordsTabMedical').show();
      $('#civRecordsTabCriminal').hide();
    });

    // Show default sub-tab when Records tab is shown
    $(document).on('click', '.heroui-tab[data-tab="records"]', function() {
      setTimeout(function() {
        $('#civTabCriminalHistory').addClass('active');
        $('#civTabMedicalHistory').removeClass('active');
        $('#civRecordsTabCriminal').show();
        $('#civRecordsTabMedical').hide();
        // Render content for the selected civilian
        const civId = $('#civIdHidden').val();
        const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
        const civData = civ?.civilian || civ || {};
        renderCivRecordsTabs(civData);
      }, 50);
    });

    // Also render records when modal is opened and Records tab is already active
    $('#civDetailsModal').on('show', function() {
      if ($('.heroui-tab[data-tab="records"]').hasClass('active')) {
        const civId = $('#civIdHidden').val();
        const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
        const civData = civ?.civilian || civ || {};
        renderCivRecordsTabs(civData);
      }
    });

    // Medical tab click handler
    $(document).on('click', '.heroui-tab[data-tab="medical"]', function() {
      setTimeout(function() {
        renderCivMedicalTabs();
      }, 50);
    });

    // Also render medical when modal is opened and Medical tab is already active
    $('#civDetailsModal').on('show', function() {
      if ($('.heroui-tab[data-tab="medical"]').hasClass('active')) {
        renderCivMedicalTabs();
      }
    });
} 

// Close civilian details modal
function closeCivDetailsModal() {
    const modal = document.getElementById('civDetailsModal');
    if (modal) {
        modal.style.cssText = 'display: none !important;';
        // Remove modal backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove any body classes that might have been added
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

// --- New Civilian Creation Functions ---

// Check civilian creation limits before opening modal
function openNewCivModal() {
    // Check if modal exists
    const modal = $('#newCivModal');
    if (!modal.length) {
        const errorMsg = 'Error: Modal not found. Please refresh the page.';
        if (typeof showToast === 'function') {
            showToast(errorMsg);
        } else {
            alert(errorMsg);
        }
        return;
    }
    
    // Check if jQuery and Bootstrap are available
    if (typeof $ === 'undefined' || typeof $.fn.modal === 'undefined') {
        const errorMsg = 'Error: Required libraries not loaded. Please refresh the page.';
        if (typeof showToast === 'function') {
            showToast(errorMsg);
        } else {
            alert(errorMsg);
        }
        return;
    }
    
    // Check if civilian creation limits are enabled for this community
    // If check fails, we'll fallback to showing modal directly
    try {
        checkCivilianCreationLimits();
    } catch (e) {
        // If there's any error, show modal directly as fallback
        try {
            $('#newCivModal').modal('show');
        } catch (modalError) {
            alert('Error opening modal. Please refresh the page.');
        }
    }
}

// Make function globally available
if (typeof window !== 'undefined') {
    window.openNewCivModal = openNewCivModal;
}

// Check civilian creation limits
function checkCivilianCreationLimits() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        if (typeof showToast === 'function') {
            showToast('Error: No active community found');
        }
        // Fallback: try to show modal anyway
        try {
            $('#newCivModal').modal('show');
        } catch (e) {
            if (typeof showToast === 'function') {
                showToast('Error: Could not open modal. Please refresh the page.');
            } else {
                alert('Error: Could not open modal. Please refresh the page.');
            }
        }
        return;
    }
    
    // Fetch community settings to check limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        timeout: 5000, // 5 second timeout
        success: function(data) {
            try {
                // Check if user is admin (community owner or has administrator permission)
                const isOwner = data.community && data.community.ownerID === dbUser._id;
                const hasAdminPermission = typeof checkUserAdminPermission === 'function' ? checkUserAdminPermission(data.community) : false;
                const isAdmin = isOwner || hasAdminPermission;
                
                const limitsEnabled = data.community && data.community.civilianCreationLimitsEnabled;
                
                if (limitsEnabled && !isAdmin) {
                    // Limits are enabled and user is not admin, check current count
                    checkCurrentCivilianCount(communityId, data.community.civilianCreationLimit);
                } else {
                    // No limits or user is admin, allow creation
                    if (isAdmin && typeof showToast === 'function') {
                        showToast('Admin: Bypassing civilian creation limits');
                    }
                    $('#newCivModal').modal('show');
                }
            } catch (e) {
                // If there's an error processing the response, show modal anyway
                $('#newCivModal').modal('show');
            }
        },
        error: function(xhr) {
            // If we can't fetch settings, allow creation as fallback
            $('#newCivModal').modal('show');
        }
    });
}

// Check current civilian count for the user's department
function checkCurrentCivilianCount(communityId, limit) {
    const userId = dbUser._id;
    
    if (!userId) {
        // Fallback: show modal if we can't get user ID
        $('#newCivModal').modal('show');
        return;
    }
    
    // Get user's current department from the community
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        timeout: 5000, // 5 second timeout
        success: function(data) {
            try {
                if (data.community && data.community.departments) {
                    // Find the department the user is in
                    const userDepartment = findUserDepartment(data.community.departments, userId);
                    
                    // Count total civilians for this user (not per department)
                    countUserCivilians(userId, limit);
                } else {
                    // Fallback: show modal if we can't get department info
                    $('#newCivModal').modal('show');
                }
            } catch (e) {
                // Fallback: show modal on error
                $('#newCivModal').modal('show');
            }
        },
        error: function(xhr) {
            // Fallback: show modal if API call fails
            $('#newCivModal').modal('show');
        }
    });
}

// Find which department the user belongs to
function findUserDepartment(departments, userId) {
    for (const dept of departments) {
        if (dept.members && Array.isArray(dept.members)) {
            const member = dept.members.find(m => m.userID === userId);
            if (member && member.status === 'approved') {
                return dept;
            }
        }
    }
    return null;
}

// Count civilians for a user (total, not per department)
function countUserCivilians(userId, limit) {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        // Fallback: show modal if we can't get community ID
        $('#newCivModal').modal('show');
        return;
    }
    
    $.ajax({
        url: `${API_URL}/api/v1/civilians/user/${userId}?active_community_id=${communityId}`,
        method: 'GET',
        timeout: 5000, // 5 second timeout
        success: function(data) {
            try {
                let civilianCount = 0;
                
                if (data && Array.isArray(data)) {
                    // Count ALL civilians for this user (total count, not per department)
                    civilianCount = data.length;
                }
                
                if (civilianCount >= limit) {
                    // User has reached their limit
                    showCivilianLimitWarning(limit, civilianCount, true);
                } else {
                    // User can create more civilians
                    $('#newCivModal').modal('show');
                }
            } catch (e) {
                // Fallback: show modal on error
                $('#newCivModal').modal('show');
            }
        },
        error: function(xhr) {
            // If we can't count, allow creation as fallback
            $('#newCivModal').modal('show');
        }
    });
}

// Show warning modal when user has reached their limit
function showCivilianLimitWarning(limit, currentCount, limitsEnabled = true) {
    // Create and show a custom warning modal
    const warningHtml = `
        <div class="modal fade" id="civilianLimitWarningModal" tabindex="-1" role="dialog" aria-labelledby="civilianLimitWarningModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content" style="background: #1a202c; border: 1px solid #4a5568; border-radius: 12px;">
                    <div class="modal-header" style="border-bottom: 1px solid #4a5568; padding: 1.5rem;">
                        <h5 class="modal-title" id="civilianLimitWarningModalLabel" style="color: #fff; font-weight: 600;">
                            <i class="fa fa-exclamation-triangle" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                            Community Limit Reached
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: #fff; background: none; border: none; font-size: 1.5rem; padding: 0; margin: 0; margin-left: auto; float: right;">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </h5>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem;">
                        <div style="text-align: center; margin-bottom: 1.5rem;">
                            <div style="background: #2d3748; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                                <i class="fa fa-exclamation-triangle" style="font-size: 2rem; color: #f59e0b;"></i>
                            </div>
                            <h4 style="color: #fff; margin-bottom: 0.5rem;">Limit Reached</h4>
                            <p style="color: #a0aec0; margin-bottom: 0;">You have reached your limit of <strong style="color: #fff;">${limit}</strong> civilian${limit !== 1 ? 's' : ''} total</p>
                        </div>
                        
                        <div style="background: #1e3a8a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; color: #93c5fd; font-size: 0.875rem;">
                                <i class="fa fa-info-circle" style="color: #3b82f6; margin-right: 0.5rem;"></i>
                                <strong>Current Count:</strong> ${currentCount} civilian${currentCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                        
                        <div style="background: #f59e0b; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #f59e0b;">
                            <p style="margin: 0; color: #fff; font-size: 0.875rem;">
                                <i class="fa fa-lightbulb" style="color: #fff; margin-right: 0.5rem;"></i>
                                <strong>Tip:</strong> Contact your community administrator if you need to create more civilians.
                            </p>
                        </div>
                        
                        ${limitsEnabled ? `
                        <div style="background: #1e3a8a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; color: #93c5fd; font-size: 0.875rem;">
                                <i class="fa fa-info-circle" style="color: #3b82f6; margin-right: 0.5rem;"></i>
                                <strong>Note:</strong> Community administrators can bypass these limits and create unlimited civilians.
                            </p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #4a5568; padding: 1.5rem;">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal" style="background: #6b7280; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;">
                            <i class="fa fa-times" style="margin-right: 0.5rem;"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if it exists
    $('#civilianLimitWarningModal').remove();
    
    // Add modal to body and show it
    $('body').append(warningHtml);
    $('#civilianLimitWarningModal').modal('show');
    
    // Clean up modal when hidden
    $('#civilianLimitWarningModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

// Check civilian creation limits when page loads and update UI
function checkCivilianCreationLimitsOnLoad() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        return; // No active community, can't check limits
    }
    
    // Fetch community settings to check limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            // Check if user is admin (community owner or has administrator permission)
            const isOwner = data.community && data.community.ownerID === dbUser._id;
            const hasAdminPermission = checkUserAdminPermission(data.community);
            const isAdmin = isOwner || hasAdminPermission;
            
            if (data.community && data.community.civilianCreationLimitsEnabled && !isAdmin) {
                // Limits are enabled and user is not admin, check current count and update UI
                updateCivilianCreationButtonState(communityId, data.community.civilianCreationLimit);
            } else if (isAdmin) {
                // Admin bypass - show admin message and enable buttons
                updateCivilianCreationButtonsForAdmin(data.community);
            }
        },
        error: function(xhr) {
            // Silently handle error - limits check will be skipped
        }
    });
}

// Update the civilian creation button state based on current limits
function updateCivilianCreationButtonState(communityId, limit) {
    const userId = dbUser._id;
    
    // If no limit provided, fetch it from community settings
    if (limit === null) {
        $.ajax({
            url: `${API_URL}/api/v1/community/${communityId}`,
            method: 'GET',
            success: function(data) {
                if (data.community && data.community.civilianCreationLimitsEnabled) {
                    updateCivilianCreationButtonState(communityId, data.community.civilianCreationLimit);
                }
            },
            error: function(xhr) {
                // Silently handle error - will use fallback
            }
        });
        return;
    }
    
    // Get user's current department from the community
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            if (data.community && data.community.departments) {
                // Find the department the user is in
                const userDepartment = findUserDepartment(data.community.departments, userId);
                
                // Count total civilians for this user (not per department)
                $.ajax({
                    url: `${API_URL}/api/v1/civilians/user/${userId}?active_community_id=${communityId}`,
                    method: 'GET',
                    success: function(civResponse) {
                        let civilianCount = 0;
                        
                        if (civResponse && Array.isArray(civResponse)) {
                            // Count ALL civilians for this user (total count, not per department)
                            civilianCount = civResponse.length;
                        }
                        
                        // Update all "Add New Civilian" buttons
                        updateCivilianCreationButtons(civilianCount, limit);
                    },
                    error: function(xhr) {
                        // Silently handle error - button state won't update
                    }
                });
            }
        },
        error: function(xhr) {
            // Silently handle error - limits check will be skipped
        }
    });
}

// Update all civilian creation buttons based on current count vs limit
function updateCivilianCreationButtons(currentCount, limit) {
    // Find all buttons that call openNewCivModal
    const buttons = document.querySelectorAll('[onclick*="openNewCivModal"]');
    
    buttons.forEach((button, index) => {
        // Check if user is admin before applying limits
        const isOwner = window.currentCommunityData && window.currentCommunityData.ownerID === dbUser._id;
        const hasAdminPermission = checkUserAdminPermission(window.currentCommunityData);
        const isAdmin = isOwner || hasAdminPermission;
        
        if (currentCount >= limit && !isAdmin) {
            // User has reached their limit and is not admin
            button.disabled = false; // Keep enabled so click events work
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
            button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
            button.style.alignItems = 'center'; // Center align icon and text vertically
            button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
            
            // Add tooltip or update text to show limit reached
            const originalText = button.innerHTML;
            button.innerHTML = `<i class="fa fa-ban"></i> Limit Reached (${currentCount}/${limit})`;
            button.title = `You have reached your limit of ${limit} civilian${limit !== 1 ? 's' : ''} total`;
            
            // Store original text for potential restoration
            button.setAttribute('data-original-text', originalText);
            
            // Add click handler to show warning modal when limit reached button is clicked
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                showCivilianLimitWarning(limit, currentCount, true);
            };
        } else if (isAdmin) {
            // Admin can always create civilians, regardless of limit
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
            button.style.alignItems = 'center'; // Center align icon and text vertically
            button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
            
            // Restore original text and add admin styling
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Restore original onclick functionality
            button.onclick = function() {
                openNewCivModal();
            };
            
            button.title = `Create new civilian (Admin - limits bypassed)`;
        } else {
            // User can still create civilians (under limit)
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
            button.style.alignItems = 'center'; // Center align icon and text vertically
            button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
            
            // Restore original text if it was changed
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Remove the warning modal click handler and restore original onclick
            button.onclick = null;
            
            button.title = `Create new civilian (${currentCount}/${limit} used)`;
        }
    });
}

// Add admin limit indicator next to section titles
function addAdminLimitIndicatorToSection(button, entityType) {
    // Find the section title based on the button's context
    let sectionTitle = null;
    
    // Try to find the section title by looking for common patterns
    const buttonParent = button.closest('.content-section, .section-header, .card, [class*="section"]');
    if (buttonParent) {
        // Look for h1, h2, h3, or elements with title-like classes
        sectionTitle = buttonParent.querySelector('h1, h2, h3, .section-title, .title, [class*="title"]');
    }
    
    // If we can't find a section title, try to find it by looking at the button's siblings
    if (!sectionTitle && button.parentNode) {
        const siblings = Array.from(button.parentNode.children);
        const buttonIndex = siblings.indexOf(button);
        
        // Look backwards from the button to find a title
        for (let i = buttonIndex - 1; i >= 0; i--) {
            const element = siblings[i];
            if (element.tagName && element.tagName.match(/^H[1-6]$/) || 
                element.classList.contains('section-title') || 
                element.classList.contains('title')) {
                sectionTitle = element;
                break;
            }
        }
    }
    
    if (!sectionTitle) {
        // Silently handle missing element
        return;
    }
    
    // Remove any existing limit indicator from this section
    const existingIndicator = sectionTitle.parentNode.querySelector('.admin-limit-indicator-section');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Create limit indicator
    const indicator = document.createElement('span');
    indicator.className = 'admin-limit-indicator-section';
    indicator.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 0.5rem;
        cursor: pointer;
        color: #f59e0b;
        font-size: 1rem;
        vertical-align: baseline;
        line-height: 1;
    `;
    
    // Add lock icon with larger size
    indicator.innerHTML = '<i class="fa fa-lock" style="font-size: 1.1rem; line-height: 1;"></i>';
    
    // Add click handler to show limit info modal
    indicator.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        showAdminLimitInfoModal(entityType);
    };
    
    // Add hover tooltip
    indicator.title = `Click to view ${entityType} creation limits`;
    
    // Insert after the title text
    sectionTitle.appendChild(indicator);
}

// Add admin limit indicator next to sidebar items
function addAdminLimitIndicator(button, entityType) {
    // Map entity types to sidebar item IDs
    const sidebarItemMap = {
        'civilian': 'navAddCivilian',
        'vehicle': 'navAddVehicle', 
        'firearm': 'navAddFirearm'
    };
    
    const sidebarItemId = sidebarItemMap[entityType];
    if (!sidebarItemId) {
        // Silently handle unknown entity type
        return;
    }
    
    // Find the sidebar item
    const sidebarItem = document.getElementById(sidebarItemId);
    if (!sidebarItem) {
        // Silently handle missing sidebar item
        return;
    }
    
    // Find the nav-text span within the sidebar item
    const navText = sidebarItem.querySelector('.nav-text');
    if (!navText) {
        // Silently handle missing nav-text
        return;
    }
    
    // Remove any existing limit indicator from this sidebar item
    const existingIndicator = sidebarItem.querySelector('.admin-limit-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Create limit indicator
    const indicator = document.createElement('span');
    indicator.className = 'admin-limit-indicator';
    indicator.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 0.5rem;
        cursor: pointer;
        color: #f59e0b;
        font-size: 0.875rem;
        vertical-align: baseline;
        line-height: 1;
    `;
    
    // Add lock icon
    indicator.innerHTML = '<i class="fa fa-lock" style="font-size: 0.9rem; line-height: 1;"></i>';
    
    // Add click handler to show limit info modal
    indicator.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        showAdminLimitInfoModal(entityType);
    };
    
    // Add hover tooltip
    indicator.title = `Click to view ${entityType} creation limits`;
    
    // Insert after the nav-text
    navText.appendChild(indicator);
}

// Show admin limit info modal
function showAdminLimitInfoModal(entityType) {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    if (!communityId) return;
    
    // Fetch community settings to get current limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            const community = data.community;
            let limitInfo = '';
            let iconClass = '';
            let entityName = '';
            
            switch(entityType) {
                case 'civilian':
                    entityName = 'Civilians';
                    iconClass = 'fa-users';
                    if (community.civilianCreationLimitsEnabled) {
                        limitInfo = `Limit: ${community.civilianCreationLimit} civilian${community.civilianCreationLimit !== 1 ? 's' : ''}`;
                    } else {
                        limitInfo = 'No limits set';
                    }
                    break;
                case 'vehicle':
                    entityName = 'Vehicles';
                    iconClass = 'fa-car';
                    if (community.vehicleCreationLimitsEnabled) {
                        limitInfo = `Limit: ${community.vehicleCreationLimit} vehicle${community.vehicleCreationLimit !== 1 ? 's' : ''}`;
                    } else {
                        limitInfo = 'No limits set';
                    }
                    break;
                case 'firearm':
                    entityName = 'Firearms';
                    iconClass = 'fa-crosshairs';
                    if (community.firearmCreationLimitsEnabled) {
                        limitInfo = `Limit: ${community.firearmCreationLimit} firearm${community.firearmCreationLimit !== 1 ? 's' : ''}`;
                    } else {
                        limitInfo = 'No limits set';
                    }
                    break;
            }
            
            const modalHtml = `
                <div class="modal fade" id="adminLimitInfoModal" tabindex="-1" role="dialog" aria-labelledby="adminLimitInfoModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered" role="document">
                        <div class="modal-content" style="background: #1a202c; border: 1px solid #4a5568; border-radius: 12px;">
                            <div class="modal-header" style="border-bottom: 1px solid #4a5568; padding: 1.5rem;">
                                <h5 class="modal-title" id="adminLimitInfoModalLabel" style="color: #fff; font-weight: 600;">
                                    <i class="fa ${iconClass}" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                                    ${entityName} Creation Limits
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: #fff; background: none; border: none; font-size: 1.5rem; padding: 0; margin: 0; margin-left: auto; float: right;">
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </h5>
                            </div>
                            <div class="modal-body" style="padding: 1.5rem;">
                                <div style="text-align: center; margin-bottom: 1.5rem;">
                                    <div style="background: #2d3748; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                                        <i class="fa ${iconClass}" style="font-size: 2rem; color: #f59e0b;"></i>
                                    </div>
                                    <h4 style="color: #fff; margin-bottom: 0.5rem;">Admin View</h4>
                                    <p style="color: #a0aec0; margin-bottom: 0;">Current ${entityName.toLowerCase()} creation limits</p>
                                </div>
                                
                                <div style="background: #1e3a8a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3b82f6;">
                                    <p style="margin: 0; color: #93c5fd; font-size: 0.875rem;">
                                        <i class="fa fa-info-circle" style="color: #3b82f6; margin-right: 0.5rem;"></i>
                                        <strong>${limitInfo}</strong>
                                    </p>
                                </div>
                                
                                <div style="background: #f59e0b; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #f59e0b;">
                                    <p style="margin: 0; color: #fff; font-size: 0.875rem;">
                                        <i class="fa fa-shield-alt" style="color: #fff; margin-right: 0.5rem;"></i>
                                        <strong>Admin Privilege:</strong> You can bypass these limits and create unlimited ${entityName.toLowerCase()}.
                                    </p>
                                </div>
                                
                                <div style="background: #2d3748; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                                    <p style="margin: 0; color: #a0aec0; font-size: 0.875rem;">
                                        <i class="fa fa-cog" style="color: #a0aec0; margin-right: 0.5rem;"></i>
                                        <strong>Note:</strong> These limits are set by the community owner and apply to regular users.
                                    </p>
                                </div>
                            </div>
                            <div class="modal-footer" style="border-top: 1px solid #4a5568; padding: 1.5rem;">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal" style="background: #6b7280; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;">
                                    <i class="fa fa-times" style="margin-right: 0.5rem;"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove any existing modal
            $('#adminLimitInfoModal').remove();
            
            // Add modal to body
            $('body').append(modalHtml);
            
            // Show modal
            $('#adminLimitInfoModal').modal('show');
            
            // Remove modal from DOM when hidden
            $('#adminLimitInfoModal').on('hidden.bs.modal', function() {
                $(this).remove();
            });
        },
        error: function(xhr) {
            // Silently handle error - user sees toast message
            showToast('Error loading limit information');
        }
    });
}

// Update civilian creation buttons for admin users (bypass limits)
function updateCivilianCreationButtonsForAdmin(communityData = null) {
    // Find all buttons that call openNewCivModal
    const buttons = document.querySelectorAll('[onclick*="openNewCivModal"]');
    
    buttons.forEach((button, index) => {
        // Admin can always create civilians
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
        button.style.alignItems = 'center'; // Center align icon and text vertically
        button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
        
        // Restore original text if it was changed
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
        
        // Restore the original onclick functionality by calling openNewCivModal directly
        button.onclick = function() {
            openNewCivModal();
        };
        
        // Add admin indicator to tooltip
        button.title = `Create new civilian (Admin - limits bypassed)`;
        
        // Add limit indicator for admin (both sidebar and section title) only if limits are enabled
        if (communityData && communityData.civilianCreationLimitsEnabled) {
            addAdminLimitIndicator(button, 'civilian');
            addAdminLimitIndicatorToSection(button, 'civilian');
        }
    });
}

// Check vehicle creation limits
function checkVehicleCreationLimits() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        showToast('Error: No active community found');
        return;
    }
    
    // Fetch community settings to check limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            // Check if user is admin (community owner or has administrator permission)
            const isOwner = data.community && data.community.ownerID === dbUser._id;
            const hasAdminPermission = checkUserAdminPermission(data.community);
            const isAdmin = isOwner || hasAdminPermission;
            
            if (data.community && data.community.vehicleCreationLimitsEnabled && !isAdmin) {
                // Limits are enabled and user is not admin, check current count
                checkCurrentVehicleCount(communityId, data.community.vehicleCreationLimit);
            } else {
                // No limits or user is admin, allow creation
                if (isAdmin) {
                    showToast('Admin: Bypassing vehicle creation limits');
                }
                // Open the vehicle modal properly
                document.getElementById('createVehicleForm').reset();
                $('#newVehicleModal').modal('show');
            }
        },
        error: function(xhr) {
            // Silently handle error - will use fallback
            // If we can't fetch settings, allow creation as fallback
            $('#newVehicleModal').modal('show');
        }
    });
}

// Check current vehicle count for the user
function checkCurrentVehicleCount(communityId, limit) {
    const userId = dbUser._id;
    
    // Count vehicles for this user
    countUserVehicles(userId, limit);
}

// Count vehicles for a user (total, not per department)
function countUserVehicles(userId, limit) {
    $.ajax({
        url: `${API_URL}/api/v1/vehicles/user/${userId}?active_community_id=${dbUser.user.lastAccessedCommunity.communityID}`,
        method: 'GET',
        success: function(data) {
            let vehicleCount = 0;
            
            if (data && Array.isArray(data)) {
                // Count ALL vehicles for this user (total count, not per department)
                vehicleCount = data.length;
            }
            
            if (vehicleCount >= limit) {
                // User has reached their limit
                showVehicleLimitWarning(limit, vehicleCount, true);
            } else {
                // User can create more vehicles
                // Open the vehicle modal properly
                document.getElementById('createVehicleForm').reset();
                $('#newVehicleModal').modal('show');
            }
        },
        error: function(xhr) {
            // If we can't count, allow creation as fallback
            $('#newVehicleModal').modal('show');
        }
    });
}

// Show warning modal when user has reached their vehicle limit
function showVehicleLimitWarning(limit, currentCount, limitsEnabled = true) {
    const modalHtml = `
        <div class="modal fade" id="vehicleLimitWarningModal" tabindex="-1" role="dialog" aria-labelledby="vehicleLimitWarningModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content" style="background: #1a202c; border: 1px solid #4a5568; border-radius: 12px;">
                    <div class="modal-header" style="border-bottom: 1px solid #4a5568; padding: 1.5rem;">
                        <h5 class="modal-title" id="vehicleLimitWarningModalLabel" style="color: #fff; font-weight: 600;">
                            <i class="fa fa-car" style="color: #ef4444; margin-right: 0.5rem;"></i>
                            Vehicle Creation Limit Reached
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: #fff; background: none; border: none; font-size: 1.5rem; padding: 0; margin: 0; margin-left: auto; float: right;">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </h5>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem;">
                        <div style="text-align: center; margin-bottom: 1.5rem;">
                            <div style="background: #2d3748; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                                <i class="fa fa-car" style="font-size: 2rem; color: #ef4444;"></i>
                            </div>
                            <h4 style="color: #fff; margin-bottom: 0.5rem;">Limit Reached</h4>
                            <p style="color: #a0aec0; margin-bottom: 0;">You have reached your limit of <strong style="color: #fff;">${limit}</strong> vehicle${limit !== 1 ? 's' : ''} total</p>
                        </div>
                        
                        <div style="background: #1e3a8a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; color: #93c5fd; font-size: 0.875rem;">
                                <i class="fa fa-info-circle" style="color: #3b82f6; margin-right: 0.5rem;"></i>
                                <strong>Current Count:</strong> ${currentCount} vehicle${currentCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                        
                        <div style="background: #2d3748; padding: 1rem; border-radius: 8px;">
                            <p style="margin: 0; color: #a0aec0; font-size: 0.875rem;">
                                <i class="fa fa-lightbulb" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                                <strong>Tip:</strong> Contact your community administrator if you need to create more vehicles.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #4a5568; padding: 1rem 1.5rem;">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal" style="background: #4a5568; border: 1px solid #6b7280; color: #fff; padding: 0.5rem 1rem; border-radius: 6px;">
                            <i class="fa fa-times" style="margin-right: 0.5rem;"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    $('#vehicleLimitWarningModal').remove();
    
    // Add modal to body
    $('body').append(modalHtml);
    
    // Show modal
    $('#vehicleLimitWarningModal').modal('show');
    
    // Remove modal from DOM when hidden
    $('#vehicleLimitWarningModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

// Check vehicle creation limits when page loads and update UI
function checkVehicleCreationLimitsOnLoad() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        return; // No active community, can't check limits
    }
    
    // Fetch community settings to check limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            // Check if user is admin (community owner or has administrator permission)
            const isOwner = data.community && data.community.ownerID === dbUser._id;
            const hasAdminPermission = checkUserAdminPermission(data.community);
            const isAdmin = isOwner || hasAdminPermission;
            
            if (data.community && data.community.vehicleCreationLimitsEnabled && !isAdmin) {
                // Limits are enabled and user is not admin, check current count and update UI
                updateVehicleCreationButtonState(communityId, data.community.vehicleCreationLimit);
            } else if (isAdmin) {
                // Admin bypass - show admin message and enable buttons
                updateVehicleCreationButtonsForAdmin(data.community);
            }
        },
        error: function(xhr) {
            // Silently handle error - limits check will be skipped
        }
    });
}

// Update the vehicle creation button state based on current limits
function updateVehicleCreationButtonState(communityId, limit) {
    const userId = dbUser._id;
    
    // If no limit provided, fetch it from community settings
    if (limit === null) {
        $.ajax({
            url: `${API_URL}/api/v1/community/${communityId}`,
            method: 'GET',
            success: function(data) {
                if (data.community && data.community.vehicleCreationLimitsEnabled) {
                    updateVehicleCreationButtonState(communityId, data.community.vehicleCreationLimit);
                }
            },
            error: function(xhr) {
                // Silently handle error - will use fallback
            }
        });
        return;
    }
    
    // Count vehicles for this user
    $.ajax({
        url: `${API_URL}/api/v1/vehicles/user/${userId}?active_community_id=${dbUser.user.lastAccessedCommunity.communityID}`,
        method: 'GET',
        success: function(data) {
            let vehicleCount = 0;
            
            if (data && Array.isArray(data)) {
                vehicleCount = data.length;
            }
            
            // Update all vehicle creation buttons
            updateVehicleCreationButtons(vehicleCount, limit);
        },
        error: function(xhr) {
            // Silently handle error - limits check will be skipped
        }
    });
}

// Update all vehicle creation buttons based on current count vs limit
function updateVehicleCreationButtons(currentCount, limit) {
    // Find all buttons that call openNewVehicleModal
    const buttons = document.querySelectorAll('[onclick*="openNewVehicleModal"]');
    
    buttons.forEach((button, index) => {
        // Check if user is admin before applying limits
        const isOwner = window.currentCommunityData && window.currentCommunityData.ownerID === dbUser._id;
        const hasAdminPermission = checkUserAdminPermission(window.currentCommunityData);
        const isAdmin = isOwner || hasAdminPermission;
        
        if (currentCount >= limit && !isAdmin) {
            // User has reached their limit and is not admin
            button.disabled = false; // Keep enabled so click events work
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
            button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
            button.style.alignItems = 'center'; // Center align icon and text vertically
            button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
            
            // Add tooltip or update text to show limit reached
            const originalText = button.innerHTML;
            button.innerHTML = `<i class="fa fa-ban"></i> Limit Reached (${currentCount}/${limit})`;
            button.title = `You have reached your limit of ${limit} vehicle${limit !== 1 ? 's' : ''} total`;
            
            // Store original text for potential restoration
            button.setAttribute('data-original-text', originalText);
            
            // Add click handler to show warning modal when limit reached button is clicked
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                showVehicleLimitWarning(limit, currentCount, true);
            };
        } else if (isAdmin) {
            // Admin can always create vehicles, regardless of limit
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.display = 'inline-flex';
            button.style.alignItems = 'center';
            button.style.gap = '0.5rem';
            
            // Restore original text if it was changed
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Restore the original onclick functionality
            button.onclick = function() {
                checkVehicleCreationLimits();
            };
            
            // Add admin indicator to tooltip
            button.title = `Create new vehicle (Admin - limits bypassed)`;
        } else {
            // User is under limit, ensure button is properly enabled
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.display = 'inline-flex';
            button.style.alignItems = 'center';
            button.style.gap = '0.5rem';
            
            // Restore original text if it was changed
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Restore the original onclick functionality
            button.onclick = function() {
                checkVehicleCreationLimits();
            };
            
            // Update tooltip to show remaining count
            const remaining = limit - currentCount;
            button.title = `Create new vehicle (${remaining} remaining)`;
        }
    });
}

// Update vehicle creation buttons for admin users (bypass limits)
function updateVehicleCreationButtonsForAdmin(communityData = null) {
    // Find all buttons that call openNewVehicleModal
    const buttons = document.querySelectorAll('[onclick*="openNewVehicleModal"]');
    
    buttons.forEach((button, index) => {
        // Admin can always create vehicles
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
        button.style.alignItems = 'center'; // Center align icon and text vertically
        button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
        
        // Restore original text if it was changed
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
        
        // Restore the original onclick functionality by calling checkVehicleCreationLimits directly
        button.onclick = function() {
            checkVehicleCreationLimits();
        };
        
        // Add admin indicator to tooltip
        button.title = `Create new vehicle (Admin - limits bypassed)`;
        
        // Add limit indicator for admin (both sidebar and section title) only if limits are enabled
        if (communityData && communityData.vehicleCreationLimitsEnabled) {
            addAdminLimitIndicator(button, 'vehicle');
            addAdminLimitIndicatorToSection(button, 'vehicle');
        }
    });
}

// Check firearm creation limits
function checkFirearmCreationLimits() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        showToast('Error: No active community found');
        return;
    }
    
    // Fetch community settings to check limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            // Check if user is admin (community owner or has administrator permission)
            const isOwner = data.community && data.community.ownerID === dbUser._id;
            const hasAdminPermission = checkUserAdminPermission(data.community);
            const isAdmin = isOwner || hasAdminPermission;
            
            if (data.community && data.community.firearmCreationLimitsEnabled && !isAdmin) {
                // Limits are enabled and user is not admin, check current count
                checkCurrentFirearmCount(communityId, data.community.firearmCreationLimit);
            } else {
                // No limits or user is admin, allow creation
                if (isAdmin) {
                    showToast('Admin: Bypassing firearm creation limits');
                }
                // Open the firearm modal properly
                openFirearmModalDirectly();
            }
        },
        error: function(xhr) {
            // Silently handle error - will use fallback
            // If we can't fetch settings, allow creation as fallback
            openFirearmModalDirectly();
        }
    });
}

// Check current firearm count for the user
function checkCurrentFirearmCount(communityId, limit) {
    const userId = dbUser._id;
    
    // Count firearms for this user
    countUserFirearms(userId, limit);
}

// Count firearms for a user (total, not per department)
function countUserFirearms(userId, limit) {
    $.ajax({
        url: `${API_URL}/api/v1/firearms/user/${userId}?active_community_id=${dbUser.user.lastAccessedCommunity.communityID}`,
        method: 'GET',
        success: function(data) {
            let firearmCount = 0;
            
            if (data && Array.isArray(data)) {
                // Count ALL firearms for this user (total count, not per department)
                firearmCount = data.length;
            }
            
            if (firearmCount >= limit) {
                // User has reached their limit
                showFirearmLimitWarning(limit, firearmCount, true);
            } else {
                // User can create more firearms
                // Open the firearm modal properly
                openFirearmModalDirectly();
            }
        },
        error: function(xhr) {
            // If we can't count, allow creation as fallback
            openFirearmModalDirectly();
        }
    });
}

// Show warning modal when user has reached their firearm limit
function showFirearmLimitWarning(limit, currentCount, limitsEnabled = true) {
    const modalHtml = `
        <div class="modal fade" id="firearmLimitWarningModal" tabindex="-1" role="dialog" aria-labelledby="firearmLimitWarningModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content" style="background: #1a202c; border: 1px solid #4a5568; border-radius: 12px;">
                    <div class="modal-header" style="border-bottom: 1px solid #4a5568; padding: 1.5rem;">
                        <h5 class="modal-title" id="firearmLimitWarningModalLabel" style="color: #fff; font-weight: 600;">
                            <i class="fa fa-crosshairs" style="color: #ef4444; margin-right: 0.5rem;"></i>
                            Firearm Creation Limit Reached
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: #fff; background: none; border: none; font-size: 1.5rem; padding: 0; margin: 0; margin-left: auto; float: right;">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </h5>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem;">
                        <div style="text-align: center; margin-bottom: 1.5rem;">
                            <div style="background: #2d3748; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                                <i class="fa fa-crosshairs" style="font-size: 2rem; color: #ef4444;"></i>
                            </div>
                            <h4 style="color: #fff; margin-bottom: 0.5rem;">Limit Reached</h4>
                            <p style="color: #a0aec0; margin-bottom: 0;">You have reached your limit of <strong style="color: #fff;">${limit}</strong> firearm${limit !== 1 ? 's' : ''} total</p>
                        </div>
                        
                        <div style="background: #1e3a8a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; color: #93c5fd; font-size: 0.875rem;">
                                <i class="fa fa-info-circle" style="color: #3b82f6; margin-right: 0.5rem;"></i>
                                <strong>Current Count:</strong> ${currentCount} firearm${currentCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                        
                        <div style="background: #2d3748; padding: 1rem; border-radius: 8px;">
                            <p style="margin: 0; color: #a0aec0; font-size: 0.875rem;">
                                <i class="fa fa-lightbulb" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                                <strong>Tip:</strong> Contact your community administrator if you need to create more firearms.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #4a5568; padding: 1rem 1.5rem;">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal" style="background: #4a5568; border: 1px solid #6b7280; color: #fff; padding: 0.5rem 1rem; border-radius: 6px;">
                            <i class="fa fa-times" style="margin-right: 0.5rem;"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    $('#firearmLimitWarningModal').remove();
    
    // Add modal to body
    $('body').append(modalHtml);
    
    // Show modal
    $('#firearmLimitWarningModal').modal('show');
    
    // Remove modal from DOM when hidden
    $('#firearmLimitWarningModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

// Check firearm creation limits when page loads and update UI
function checkFirearmCreationLimitsOnLoad() {
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    
    if (!communityId) {
        return; // No active community, can't check limits
    }
    
    // Fetch community settings to check limits
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: 'GET',
        success: function(data) {
            // Check if user is admin (community owner or has administrator permission)
            const isOwner = data.community && data.community.ownerID === dbUser._id;
            const hasAdminPermission = checkUserAdminPermission(data.community);
            const isAdmin = isOwner || hasAdminPermission;
            
            if (data.community && data.community.firearmCreationLimitsEnabled && !isAdmin) {
                // Limits are enabled and user is not admin, check current count and update UI
                updateFirearmCreationButtonState(communityId, data.community.firearmCreationLimit);
            } else if (isAdmin) {
                // Admin bypass - show admin message and enable buttons
                updateFirearmCreationButtonsForAdmin(data.community);
            }
        },
        error: function(xhr) {
            // Silently handle error - limits check will be skipped
        }
    });
}

// Update the firearm creation button state based on current limits
function updateFirearmCreationButtonState(communityId, limit) {
    const userId = dbUser._id;
    
    // If no limit provided, fetch it from community settings
    if (limit === null) {
        $.ajax({
            url: `${API_URL}/api/v1/community/${communityId}`,
            method: 'GET',
            success: function(data) {
                if (data.community && data.community.firearmCreationLimitsEnabled) {
                    updateFirearmCreationButtonState(communityId, data.community.firearmCreationLimit);
                }
            },
            error: function(xhr) {
                // Silently handle error - will use fallback
            }
        });
        return;
    }
    
    // Count firearms for this user
    $.ajax({
        url: `${API_URL}/api/v1/firearms/user/${userId}?active_community_id=${dbUser.user.lastAccessedCommunity.communityID}`,
        method: 'GET',
        success: function(data) {
            let firearmCount = 0;
            
            if (data && Array.isArray(data)) {
                firearmCount = data.length;
            }
            
            // Update all firearm creation buttons
            updateFirearmCreationButtons(firearmCount, limit);
        },
        error: function(xhr) {
            // Silently handle error - limits check will be skipped
        }
    });
}

// Update all firearm creation buttons based on current count vs limit
function updateFirearmCreationButtons(currentCount, limit) {
    // Find all buttons that call openNewFirearmModal
    const buttons = document.querySelectorAll('[onclick*="openNewFirearmModal"]');
    
    buttons.forEach((button, index) => {
        // Check if user is admin before applying limits
        const isOwner = window.currentCommunityData && window.currentCommunityData.ownerID === dbUser._id;
        const hasAdminPermission = checkUserAdminPermission(window.currentCommunityData);
        const isAdmin = isOwner || hasAdminPermission;
        
        if (currentCount >= limit && !isAdmin) {
            // User has reached their limit and is not admin
            button.disabled = false; // Keep enabled so click events work
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
            button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
            button.style.alignItems = 'center'; // Center align icon and text vertically
            button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
            
            // Add tooltip or update text to show limit reached
            const originalText = button.innerHTML;
            button.innerHTML = `<i class="fa fa-ban"></i> Limit Reached (${currentCount}/${limit})`;
            button.title = `You have reached your limit of ${limit} firearm${limit !== 1 ? 's' : ''} total`;
            
            // Store original text for potential restoration
            button.setAttribute('data-original-text', originalText);
            
            // Add click handler to show warning modal when limit reached button is clicked
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                showFirearmLimitWarning(limit, currentCount, true);
            };
        } else if (isAdmin) {
            // Admin can always create firearms, regardless of limit
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.display = 'inline-flex';
            button.style.alignItems = 'center';
            button.style.gap = '0.5rem';
            
            // Restore original text if it was changed
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Restore the original onclick functionality
            button.onclick = function() {
                checkFirearmCreationLimits();
            };
            
            // Add admin indicator to tooltip
            button.title = `Create new firearm (Admin - limits bypassed)`;
        } else {
            // User is under limit, ensure button is properly enabled
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.display = 'inline-flex';
            button.style.alignItems = 'center';
            button.style.gap = '0.5rem';
            
            // Restore original text if it was changed
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Restore the original onclick functionality
            button.onclick = function() {
                checkFirearmCreationLimits();
            };
            
            // Update tooltip to show remaining count
            const remaining = limit - currentCount;
            button.title = `Create new firearm (${remaining} remaining)`;
        }
    });
}

// Update firearm creation buttons for admin users (bypass limits)
function updateFirearmCreationButtonsForAdmin(communityData = null) {
    // Find all buttons that call openNewFirearmModal
    const buttons = document.querySelectorAll('[onclick*="openNewFirearmModal"]');
    
    buttons.forEach((button, index) => {
        // Admin can always create firearms
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.display = 'inline-flex'; // Ensure proper flexbox layout for icon alignment
        button.style.alignItems = 'center'; // Center align icon and text vertically
        button.style.gap = '0.5rem'; // Add consistent spacing between icon and text
        
        // Restore original text if it was changed
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
        
        // Restore the original onclick functionality by calling checkFirearmCreationLimits directly
        button.onclick = function() {
            checkFirearmCreationLimits();
        };
        
        // Add admin indicator to tooltip
        button.title = `Create new firearm (Admin - limits bypassed)`;
        
        // Add limit indicator for admin (both sidebar and section title) only if limits are enabled
        if (communityData && communityData.firearmCreationLimitsEnabled) {
            addAdminLimitIndicator(button, 'firearm');
            addAdminLimitIndicatorToSection(button, 'firearm');
        }
    });
}

// Open firearm modal directly (used when limits are bypassed or not enabled)
function openFirearmModalDirectly() {
    // Ensure any existing modals are properly closed first
    closeFirearmDetailsModal();
    closeCivDetailsModal();
    closeVehDetailsModal();
    
    const modal = document.getElementById('newFirearmModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset form fields
        document.getElementById('newFirearmSerial').value = '';
        document.getElementById('newFirearmName').value = '';
        document.getElementById('newFirearmType').value = '';
        document.getElementById('newFirearmCaliber').value = '';
        document.getElementById('newFirearmColor').value = '';
        document.getElementById('newFirearmIsStolen').value = 'false';
    }
}

// Toggle input visibility for height/weight units
function toggleInput(showClass, hideClass) {
    $('.' + showClass).show();
    $('.' + hideClass).hide();
}

// Create new civilian
function createNewCiv() {
    const heightObj = getHeightAndClassification();
    const weightObj = getWeightAndClassification();
    const formData = {
        name: $('#civ-first-name').val().trim(),
        birthday: $('#birthday').val(),
        address: $('#address').val().trim() || undefined,
        occupation: $('#occupation').val().trim() || undefined,
        gender: $('#gender').val(),
        height: heightObj.value,
        heightClassification: heightObj.classification,
        weight: weightObj.value,
        weightClassification: weightObj.classification,
        eyeColor: $('#eyeColor').val().trim() || undefined,
        hairColor: $('#hairColor').val().trim() || undefined,
        organDonor: $('#organDonor').is(':checked'),
        veteran: $('#veteran').is(':checked'),
        onParole: $('#onParole').is(':checked'),
        onProbation: $('#onProbation').is(':checked'),
        image: $('#newCivPhotoUrl').val() || undefined,
        approvalStatus: 'requested_review',
        userID: dbUser._id,
        activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID
    };
    
    // Validate required fields
    if (!formData.name) {
        showToast('Name is required');
        return;
    }
    
    if (!formData.birthday) {
        showToast('Date of birth is required');
        return;
    }
    
    // Show loading state
    $('#submitNewCiv').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');
    
    // Make API call
    $.ajax({
        url: `${API_URL}/api/v1/civilian`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(response) {
            
            showToast('Civilian created successfully!');
            
            // Close modal and reset form
            $('#newCivModal').modal('hide');
            $('#create-civ-form')[0].reset();
            
            // Reload civilians to show the new one
            loadCivilians();
            
            // Update civilian creation button state after creating new civilian
            const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
            if (communityId) {
                updateCivilianCreationButtonState(communityId, null); // Will fetch current limit
            }
            
            // Reset button
            $('#submitNewCiv').prop('disabled', false).html('<i class="fa fa-plus"></i> Create Civilian');
        },
        error: function(xhr) {
            const errorMessage = xhr.responseJSON?.message || 'Failed to create civilian';
            showToast('Error: ' + errorMessage);
            
            // Reset button
            $('#submitNewCiv').prop('disabled', false).html('<i class="fa fa-plus"></i> Create Civilian');
        }
    });
}

// Helper function to get height in the correct format
function getHeightAndClassification() {
    const heightClassification = $('.height-toggle-btn.active').data('value');
    
    if (heightClassification === 'imperial') {
        const foot = parseInt($('#foot').val()) || 0;
        const inches = parseInt($('#inches').val()) || 0;
        const totalInches = foot * 12 + inches;
        return {
            value: totalInches > 0 ? String(totalInches) : undefined,
            classification: 'Imperial'
        };
    } else {
        const centimeters = parseInt($('#centimeters').val()) || 0;
        return {
            value: centimeters > 0 ? String(centimeters) : undefined,
            classification: 'Metric'
        };
    }
}

// Helper function to get weight in the correct format
function getWeightAndClassification() {
    const weightClassification = $('.weight-toggle-btn.active').data('value');
    
    if (weightClassification === 'imperial') {
        const pounds = parseInt($('#pounds').val()) || 0;
        return {
            value: pounds > 0 ? String(pounds) : undefined,
            classification: 'lbs'
        };
    } else {
        const kilos = parseInt($('#kilos').val()) || 0;
        return {
            value: kilos > 0 ? String(kilos) : undefined,
            classification: 'kg'
        };
    }
}

// Wire up form submission
$(document).ready(function() {
    $('#create-civ-form').on('submit', function(e) {
        e.preventDefault();
        createNewCiv();
    });
    
    // Auto-calculate age when birthday changes
    $('#birthday').on('change', function() {
        const birthday = $(this).val();
        if (birthday) {
            const age = getAge(birthday);
            $('#ageAmount').val(age);
        }
    });
}); 

// VIN Generator
function generateRandomVin() {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = '';
    for (let i = 0; i < 17; i++) {
        vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
}

function generateSerialNumber(length, targetId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let serial = '';
    for (let i = 0; i < length; i++) {
        serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById(targetId).value = serial;
}

$(document).ready(function() {
    $('#generateVinBtn').on('click', function() {
        $('#vehVin').val(generateRandomVin());
    });
    // VIN generator for Add New Vehicle modal
    $('#generateNewVinBtn').on('click', function() {
        $('#newVehVin').val(generateRandomVin());
    });
});

// --- Vehicle Modal Functions ---

// Open vehicle details modal
function openVehDetailsModal(veh) {
    var vehData = veh.vehicle ? veh.vehicle : veh;
    
    // Ensure any existing modals are properly closed first
    closeCivDetailsModal();
    closeFirearmDetailsModal();
    closeNewFirearmModal();
    
    const modal = document.getElementById('vehDetailsModal');
    if (!modal) {
        return;
    }
    
    // Set vehicle ID
    document.getElementById('vehIdHidden').value = veh._id || '';
    
    // Handle vehicle image
    var vehImageImg = document.getElementById('vehImageImg');
    var vehImageIcon = document.getElementById('vehImageIcon');
    var vehImageUrlInput = document.getElementById('vehImageUrl');
    if (vehData.image && vehData.image.startsWith('https://')) {
        vehImageImg.src = vehData.image;
        vehImageImg.style.display = 'block';
        vehImageIcon.style.display = 'none';
        if (vehImageUrlInput) vehImageUrlInput.value = vehData.image;
    } else {
        vehImageImg.src = '';
        vehImageImg.style.display = 'none';
        vehImageIcon.style.display = 'block';
        if (vehImageUrlInput) vehImageUrlInput.value = '';
    }
    
    // Populate form fields
    const plateField = document.getElementById('vehPlate');
    const plateStateField = document.getElementById('vehPlateState');
    const vinField = document.getElementById('vehVin');
    const typeField = document.getElementById('vehType');
    const makeField = document.getElementById('vehMake');
    const modelField = document.getElementById('vehModel');
    const yearField = document.getElementById('vehYear');
    const colorField = document.getElementById('vehColor');
    
    if (plateField) plateField.value = vehData.plate || '';
    if (plateStateField) plateStateField.value = vehData.licensePlateState || '';
    if (vinField) vinField.value = vehData.vin || '';
    if (typeField) typeField.value = vehData.type || '';
    if (makeField) makeField.value = vehData.make || '';
    if (modelField) modelField.value = vehData.model || '';
    if (yearField) yearField.value = vehData.year || '';
    if (colorField) colorField.value = vehData.color || '';
    
    // Registration/Insurance fields - convert to string "true"/"false" system
    function boolToSelect(val) {
        if (val === true || val === 'true' || val === 1 || val === '1') return 'true';
        if (val === false || val === 'false' || val === 2 || val === '2') return 'false';
        return 'true'; // default to true
    }
    
    // Special handling for stolen status - convert to string "true"/"false" system
    function stolenToSelect(val) {
        if (val === "2" || val === "true" || val === true) return 'true'; // Stolen = "true"
        if (val === "1" || val === "false" || val === false) return 'false'; // Not stolen = "false"
        return 'false'; // default to not stolen
    }
    
    document.getElementById('vehValidRegistration').value = boolToSelect(vehData.validRegistration);
    document.getElementById('vehValidInsurance').value = boolToSelect(vehData.validInsurance);
    document.getElementById('vehIsStolen').value = stolenToSelect(vehData.isStolen);
    document.getElementById('vehIsExempt').value = boolToSelect(vehData.isExempt || 'false');
    
    // Show modal
    modal.style.cssText = 'display: flex !important; position: fixed !important; z-index: 2000 !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(30,32,44,0.65) !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important;';
    
    // Ensure tab content is visible
    const tabContent = modal.querySelector('#vehTabContent-edit');
    if (tabContent) {
        tabContent.style.display = 'block';
    }
    
    // Ensure modal is visible and properly positioned
    setTimeout(() => {
        if (modal.style.display === 'flex') {
            modal.scrollTop = 0;
        }
    }, 100);
}

// Close vehicle details modal
function closeVehDetailsModal() {
    const modal = document.getElementById('vehDetailsModal');
    if (modal) {
        modal.style.cssText = 'display: none !important;';
        // Remove modal backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove any body classes that might have been added
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

// Wire up vehicle modal functionality
$(document).ready(function() {
    // Close modal buttons
    document.getElementById('vehDetailsModalClose').onclick = closeVehDetailsModal;
    document.getElementById('vehDetailsModalClose2').onclick = closeVehDetailsModal;
    
    // Wire up Update Vehicle button in modal
    $('#vehDetailsEditBtn').off('click').on('click', function(e) {
        e.preventDefault();
        // Get the vehicle ID from the hidden input
        const vehId = $('#vehIdHidden').val();

        if (vehId) {
            updateVehModern(vehId);
        } else {
            showToast('No vehicle selected.');
        }
    });
});

// Update Vehicle (modern modal)
function updateVehModern(vehId) {
    // Helper function to convert select values to string "true"/"false"
    function selectToBoolString(val) {
        // Accepts "1" (yes/true), "2" (no/false), "true", "false", true, false
        if (val === "1" || val === "true" || val === true) return "true";
        if (val === "2" || val === "false" || val === false) return "false";
        return "true"; // default to true for registration/insurance
    }
    
    // Special handling for stolen status - convert to string "true"/"false" system
    function selectToStolenString(val) {
        if (val === "2" || val === "true" || val === true) return "true"; // Stolen = "true"
        if (val === "1" || val === "false" || val === false) return "false"; // Not stolen = "false"
        return "false"; // default to not stolen
    }
    
    const vehImageUrl = document.getElementById('vehImageUrl') ? document.getElementById('vehImageUrl').value : '';
    const data = {
        plate: $('#vehPlate').val() ? $('#vehPlate').val().trim().toUpperCase() : '',
        licensePlateState: $('#vehPlateState').val() ? $('#vehPlateState').val().trim().toUpperCase() : '',
        vin: $('#vehVin').val() ? $('#vehVin').val().trim().toUpperCase() : '',
        type: $('#vehType').val(),
        make: $('#vehMake').val() ? $('#vehMake').val().trim() : '',
        model: $('#vehModel').val() ? $('#vehModel').val().trim() : '',
        year: $('#vehYear').val(),
        color: $('#vehColor').val() ? $('#vehColor').val().trim() : '',
        image: vehImageUrl,
        validRegistration: selectToBoolString($('#vehValidRegistration').val()),
        validInsurance: selectToBoolString($('#vehValidInsurance').val()),
        isStolen: selectToStolenString($('#vehIsStolen').val()),
        isExempt: selectToBoolString($('#vehIsExempt').val()),
        userID: dbUser._id,
        activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID
    };

    // Validate required fields
    if (!data.plate) {
        showToast('License plate is required');
        return;
    }
    
    if (!data.vin) {
        showToast('VIN is required');
        return;
    }
    
    if (!data.type) {
        showToast('Vehicle type is required');
        return;
    }
    
    $.ajax({
        url: `${API_URL}/api/v1/vehicle/${vehId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(veh) {
            showToast('Vehicle updated successfully!');
            closeVehDetailsModal();
            // Reload vehicles to show the updated one
            loadVehicles();
        },
        error: function(xhr) {
            showToast('Failed to update vehicle: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
} 

// Open Add New Vehicle modal
function openNewVehicleModal() {
    // Check vehicle creation limits before opening modal
    checkVehicleCreationLimits();
}

// Close Add New Vehicle modal
function closeNewVehicleModal() {
    $('#newVehicleModal').modal('hide');
}

$(document).ready(function() {
    // Remove old logs from vehicle loading, rendering, etc.
    // Wire up Add New Vehicle modal open/close
    $('#addNewVehicleBtn').on('click', openNewVehicleModal);
    $('#newVehicleModalClose, #newVehicleModalCancel').on('click', closeNewVehicleModal);

    // VIN generator for Add New Vehicle modal
    $('#generateNewVinBtn').on('click', function() {
        $('#newVehVin').val(generateRandomVin());
    });

    // Handle Add New Vehicle form submission
    $('#createVehicleForm').on('submit', function(e) {
        e.preventDefault();
        
        // Helper function to convert select values to string "true"/"false"
        function selectToBoolString(val) {
            // Accepts "1" (yes/true), "2" (no/false), "true", "false", true, false
            if (val === "1" || val === "true" || val === true) return "true";
            if (val === "2" || val === "false" || val === false) return "false";
            return "true"; // default to true for registration/insurance
        }
        
        const newVehImageUrl = document.getElementById('newVehImageUrl') ? document.getElementById('newVehImageUrl').value : '';
        const data = {
            plate: $('#newVehPlate').val() ? $('#newVehPlate').val().trim().toUpperCase() : '',
            licensePlateState: $('#newVehPlateState').val() ? $('#newVehPlateState').val().trim().toUpperCase() : '',
            vin: $('#newVehVin').val() ? $('#newVehVin').val().trim().toUpperCase() : '',
            type: $('#newVehType').val(),
            make: $('#newVehMake').val() ? $('#newVehMake').val().trim() : '',
            model: $('#newVehModel').val() ? $('#newVehModel').val().trim() : '',
            year: $('#newVehYear').val(),
            color: $('#newVehColor').val() ? $('#newVehColor').val().trim() : '',
            image: newVehImageUrl,
            validRegistration: selectToBoolString($('#newVehValidRegistration').val()),
            validInsurance: selectToBoolString($('#newVehValidInsurance').val()),
            isStolen: selectToStolenString($('#newVehIsStolen').val()),
            isExempt: selectToBoolString($('#newVehIsExempt').val()),
            registeredOwner: '', // Always include, even if empty
            registeredOwnerID: '', // Always include, even if empty
            userID: dbUser._id,
            activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID
        };
        // Validate required fields
        if (!data.plate) {
            showToast('License plate is required');
            return;
        }
        if (!data.vin) {
            showToast('VIN is required');
            return;
        }
        if (!data.type) {
            showToast('Vehicle type is required');
            return;
        }
        // Make API call
        $.ajax({
            url: `${API_URL}/api/v1/vehicle`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                showToast('Vehicle created successfully!');
                closeNewVehicleModal();
                // Reset the form
                $('#createVehicleForm')[0].reset();
                // Reset image upload state
                var nvu = document.getElementById('newVehImageUrl');
                var nvi = document.getElementById('newVehImageImg');
                var nvic = document.getElementById('newVehImageIcon');
                var nvinput = document.getElementById('newVehImageInput');
                if (nvu) nvu.value = '';
                if (nvi) { nvi.src = ''; nvi.style.display = 'none'; }
                if (nvic) nvic.style.display = 'block';
                if (nvinput) nvinput.value = '';
                loadVehicles();

                // Update vehicle creation button states after successful creation
                const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
                if (communityId) {
                    checkVehicleCreationLimitsOnLoad();
                }
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'Failed to create vehicle';
                showToast('Error: ' + errorMessage);
            }
            });
  });
});

// --- Vehicle Management Functions for Civilian Modal ---

// Fetch vehicles for a civilian
function getLinkedVehicles(page) {
    const civilianId = document.getElementById('civIdHidden').value;
    if (!civilianId) return;

    document.getElementById('manage-vehicles-loading').style.display = 'flex';
    document.getElementById('manage-vehicles-thumbnail').style.display = 'none';
    document.getElementById('manage-no-vehicles-message').style.display = 'none';
    document.getElementById('issue-loading-vehicles-alert').style.display = 'none';
    
    const prevBtn = document.getElementById('manage-prev-veh-page-btn');
    const nextBtn = document.getElementById('manage-next-veh-page-btn');
    if (prevBtn) prevBtn.parentElement.classList.toggle('disabled', page === 0);

    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    const userId = dbUser._id;

    $.ajax({
        url: `${API_URL}/api/v1/vehicles/user/${userId}?active_community_id=${communityId}&limit=${linkedVehiclesPerPage}&page=${page}`,
        method: 'GET',
        success: function(data) {
            const currentCivId = document.getElementById('civIdHidden').value;
            if (currentCivId !== civilianId) return;

            linkedVehiclePage = page;
            hasMoreVehicles = data.length === linkedVehiclesPerPage;
            
            // Store the vehicles for search filtering
            allLinkedVehicles = data || [];

            renderLinkedVehicles(data || [], civilianId);
            document.getElementById('manage-vehicles-loading').style.display = 'none';
            document.getElementById('manage-vehicles-thumbnail').style.display = 'grid';
            
            if (prevBtn) prevBtn.parentElement.classList.toggle('disabled', page === 0);
            if (nextBtn) nextBtn.parentElement.classList.toggle('disabled', !hasMoreVehicles);
            
            if (data.length === 0) {
                document.getElementById('manage-no-vehicles-message').style.display = 'block';
            }
        },
        error: function(xhr) {
            const currentCivId = document.getElementById('civIdHidden').value;
            if (currentCivId !== civilianId) return;
            
            // Silently handle error - user will see empty list
            document.getElementById('manage-vehicles-loading').style.display = 'none';
            document.getElementById('issue-loading-vehicles-alert').style.display = 'block';
            document.getElementById('manage-no-vehicles-message').style.display = 'none';
            showToast('Failed to load vehicles: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

// Fetch civilian name for display
function fetchCivName(civId) {
    return $.ajax({
        url: `${API_URL}/api/v1/civilian/${civId}`,
        method: 'GET',
    }).then(function(data) {
        return data?.civilian?.name || 'Unknown';
    }).catch(function(xhr, status, error) {
        // Silently handle error - return default name
        return 'Unknown';
    });
}

// Render vehicles in the thumbnail grid
function renderLinkedVehicles(vehicles, civilianId) {
    const currentCivId = document.getElementById('civIdHidden').value;
    if (currentCivId !== civilianId) return;

    const thumbnail = document.getElementById('manage-vehicles-thumbnail');
    thumbnail.innerHTML = '';

    if (vehicles.length === 0) {
        document.getElementById('manage-no-vehicles-message').style.display = 'block';
        document.getElementById('manage-vehicles-loading').style.display = 'none';
        return;
    }

    const namePromises = vehicles.map(vehicle => {
        if (vehicle?.vehicle?.linkedCivilianID && vehicle?.vehicle?.linkedCivilianID !== civilianId && vehicle?.vehicle?.linkedCivilianID !== "") {
            return fetchCivName(vehicle?.vehicle?.linkedCivilianID).then(name => ({
                vehicle,
                linkedCivName: name
            }));
        }
        return Promise.resolve({ vehicle, linkedCivName: '' });
    });

    Promise.all(namePromises).then(results => {
        const currentCivId = document.getElementById('civIdHidden').value;
        if (currentCivId !== civilianId) return;
        
        results.forEach(({ vehicle, linkedCivName }) => {
            const isLinkedToCurrent = vehicle?.vehicle?.linkedCivilianID === civilianId;
            const isLinkedToOther = vehicle?.vehicle?.linkedCivilianID && !isLinkedToCurrent;

            let buttonHtml = '';
            let linkedInfo = '';

            if (isLinkedToCurrent) {
                buttonHtml = `<button onclick="delinkVehicle('${vehicle._id}')" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%) !important; color:#fff !important; border:none !important; border-radius:8px !important; padding:0.6rem 1.2rem !important; font-weight:500 !important; cursor:pointer !important; width:100% !important; margin-top:0.5rem !important; transition:all 0.2s ease !important; font-size:1rem !important; box-shadow:0 4px 14px 0 rgba(239,68,68,0.4) !important;">Delink</button>`;
            } else {
                buttonHtml = `<button onclick="linkVehicle('${vehicle._id}')" style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%) !important; color:#fff !important; border:none !important; border-radius:8px !important; padding:0.6rem 1.2rem !important; font-weight:500 !important; cursor:pointer !important; width:100% !important; margin-top:0.5rem !important; transition:all 0.2s ease !important; font-size:1rem !important; box-shadow:0 4px 14px 0 rgba(99,102,241,0.4) !important;">Link</button>`;
                if (isLinkedToOther && vehicle?.vehicle?.linkedCivilianID !== "") {
                    linkedInfo = `<p style="color:#a0aec0; font-size:0.875rem; margin:0.5rem 0 0;">Linked to ${linkedCivName}</p>`;
                }
            }

            const vehicleCard = document.createElement('div');
            vehicleCard.className = 'card';
            vehicleCard.innerHTML = `
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fa fa-car"></i>
                    </div>
                    <div>
                        <h4 class="card-title">${vehicle?.vehicle?.make || ''} ${vehicle?.vehicle?.model || ''}</h4>
                        <p class="card-subtitle">${vehicle?.vehicle?.plate || 'No Plate'}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p>Type: ${vehicle?.vehicle?.type || 'Unknown'}</p>
                    <p>Year: ${vehicle?.vehicle?.year || 'Unknown'}</p>
                    ${(vehicle?.vehicle?.isStolen === 'true' || vehicle?.vehicle?.isStolen === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> STOLEN</p>' : ''}
                    ${(vehicle?.vehicle?.isExempt === 'true') ? '<p style="color:#3b82f6; font-weight:bold;"><i class="fa fa-shield"></i> EXEMPT</p>' : ''}
                    ${(vehicle?.vehicle?.validRegistration === 'false' || vehicle?.vehicle?.validRegistration === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> INVALID REGISTRATION</p>' : ''}
                    ${(vehicle?.vehicle?.validInsurance === 'false' || vehicle?.vehicle?.validInsurance === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> INVALID INSURANCE</p>' : ''}
                    ${linkedInfo}
                    ${buttonHtml}
                </div>
            `;
            thumbnail.appendChild(vehicleCard);
        });
        
        document.getElementById('manage-vehicles-loading').style.display = 'none';
    }).catch(error => {
        const currentCivId = document.getElementById('civIdHidden').value;
        if (currentCivId !== civilianId) return;
        
        // Silently handle error - user will see empty list
        document.getElementById('manage-vehicles-loading').style.display = 'none';
        document.getElementById('issue-loading-vehicles-alert').style.display = 'block';
        showToast('Error rendering vehicle data: ' + error.message);
    });
}

// Pagination functions
function getPrevVehiclePage() {
    if (linkedVehiclePage > 0) {
        getLinkedVehicles(linkedVehiclePage - 1);
    }
}

function getNextVehiclePage() {
    getLinkedVehicles(linkedVehiclePage + 1);
}

// Link a vehicle to the civilian
function linkVehicle(vehicleId) {
    const civilianId = document.getElementById('civIdHidden').value;
    
    $.ajax({
        url: `${API_URL}/api/v1/vehicle/${vehicleId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            linkedCivilianID: civilianId,
        }),
        success: function(response) {
            showToast('Vehicle linked successfully!');
            getLinkedVehicles(linkedVehiclePage);
        },
        error: function(xhr) {
            showToast('Error linking vehicle: ' + (xhr.responseJSON?.message || 'Please try again.'));
        }
    });
}

// Delink a vehicle from the civilian
function delinkVehicle(vehicleId) {
    if (!confirm('Are you sure you want to delink this vehicle?')) return;
    
    $.ajax({
        url: `${API_URL}/api/v1/vehicle/${vehicleId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            linkedCivilianID: "",
        }),
        success: function(response) {
            showToast('Vehicle delinked successfully!');
            getLinkedVehicles(linkedVehiclePage);
        },
        error: function(xhr) {
            showToast('Error delinking vehicle: ' + (xhr.responseJSON?.message || 'Please try again.'));
        }
    });
} 

$(document).ready(function() {
    // Wire up Add New Civilian modal Cancel button
    $('#newCivModalCancel').on('click', function() {
        $('#newCivModal').modal('hide');
    });
}); 

// Function to load firearm data via socket and open the new modal
// Firearm modal functions
function openFirearmDetailsModal(firearm) {
    var firearmData = firearm.firearm ? firearm.firearm : firearm;
    
    // Ensure any existing modals are properly closed first
    closeCivDetailsModal();
    closeVehDetailsModal();
    closeNewFirearmModal();
    
    const modal = document.getElementById('firearmDetailsModal');
    if (!modal) {
        return;
    }
    
    // Set firearm ID
    document.getElementById('firearmIdHidden').value = firearm._id || '';
    
    // Handle firearm image
    var firearmImg = document.getElementById('firearmImageImg');
    var firearmIcon = document.getElementById('firearmImageIcon');
    var firearmImageUrlInput = document.getElementById('firearmImageUrl');
    if (firearmData.image && firearmData.image.startsWith('https://')) {
        firearmImg.src = firearmData.image;
        firearmImg.style.display = 'block';
        firearmIcon.style.display = 'none';
        if (firearmImageUrlInput) firearmImageUrlInput.value = firearmData.image;
    } else {
        firearmImg.src = '';
        firearmImg.style.display = 'none';
        firearmIcon.style.display = 'block';
        if (firearmImageUrlInput) firearmImageUrlInput.value = '';
    }
    
    // Populate form fields
    const serialField = document.getElementById('firearmSerial');
    const nameField = document.getElementById('firearmName');
    const typeField = document.getElementById('firearmType');
    const caliberField = document.getElementById('firearmCaliber');
    const stolenField = document.getElementById('firearmIsStolen');
    
    if (serialField) serialField.value = firearmData.serialNumber || '';
    if (nameField) nameField.value = firearmData.name || '';
    if (typeField) typeField.value = firearmData.weaponType || '';
    if (caliberField) caliberField.value = firearmData.caliber || '';
    if (stolenField) stolenField.value = firearmData.isStolen || 'false';
    
    // Show modal
    modal.style.cssText = 'display: flex !important; position: fixed !important; z-index: 2000 !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(30,32,44,0.65) !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important;';
    
    // Ensure tab content is visible
    const tabContent = modal.querySelector('#firearmTabContent-edit');
    if (tabContent) {
        tabContent.style.display = 'block';
    }
    
    // Ensure modal is visible and properly positioned
    setTimeout(() => {
        if (modal.style.display === 'flex') {
            modal.scrollTop = 0;
        }
    }, 100);
}

function closeFirearmDetailsModal() {
    const modal = document.getElementById('firearmDetailsModal');
    if (modal) {
        modal.style.cssText = 'display: none !important;';
        // Remove modal backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove any body classes that might have been added
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Reset form fields
        document.getElementById('firearmSerial').value = '';
        document.getElementById('firearmName').value = '';
        document.getElementById('firearmType').value = '';
        document.getElementById('firearmCaliber').value = '';
        document.getElementById('firearmIsStolen').value = 'false';
        document.getElementById('firearmIdHidden').value = '';
    }
}

function openNewFirearmModal() {
    // Check firearm creation limits before opening modal
    checkFirearmCreationLimits();
}

function closeNewFirearmModal() {
    const modal = document.getElementById('newFirearmModal');
    if (modal) {
        modal.style.display = 'none';
        // Remove modal backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove any body classes that might have been added
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Reset form fields
        document.getElementById('newFirearmSerial').value = '';
        document.getElementById('newFirearmName').value = '';
        document.getElementById('newFirearmType').value = '';
        document.getElementById('newFirearmCaliber').value = '';
        document.getElementById('newFirearmColor').value = '';
        document.getElementById('newFirearmIsStolen').value = 'false';

        // Reset image upload state
        var newFirearmImageUrl = document.getElementById('newFirearmImageUrl');
        var newFirearmImageImg = document.getElementById('newFirearmImageImg');
        var newFirearmImageIcon = document.getElementById('newFirearmImageIcon');
        var newFirearmImageInput = document.getElementById('newFirearmImageInput');
        if (newFirearmImageUrl) newFirearmImageUrl.value = '';
        if (newFirearmImageImg) { newFirearmImageImg.src = ''; newFirearmImageImg.style.display = 'none'; }
        if (newFirearmImageIcon) newFirearmImageIcon.style.display = 'block';
        if (newFirearmImageInput) newFirearmImageInput.value = '';
    }
}

// Flag to prevent duplicate firearm updates
let isUpdatingFirearm = false;

function updateFirearmModern(firearmId) {
    // Prevent duplicate calls
    if (isUpdatingFirearm) {
        return;
    }
    
    isUpdatingFirearm = true;
    
    // Get form data
    const firearmImageUrl = document.getElementById('firearmImageUrl') ? document.getElementById('firearmImageUrl').value : '';
    const formData = {
        serialNumber: document.getElementById('firearmSerial').value,
        name: document.getElementById('firearmName').value,
        weaponType: document.getElementById('firearmType').value,
        caliber: document.getElementById('firearmCaliber').value,
        isStolen: document.getElementById('firearmIsStolen').value,
        image: firearmImageUrl
    };
    
    // Validate required fields
    if (!formData.serialNumber || !formData.name || !formData.weaponType) {
        isUpdatingFirearm = false;
        showToast('Please fill in all required fields.');
        return;
    }
    
    // Send update request
    $.ajax({
        url: `${API_URL}/api/v1/firearm/${firearmId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(formData),
        success: function(response) {
            isUpdatingFirearm = false;
            showToast('Firearm updated successfully!');
            closeFirearmDetailsModal();
            
            // Refresh firearms with a slight delay to ensure API has processed the update
            setTimeout(function() {
                // Reset to first page to ensure we see the updated firearm
                currentGunPage = 0;
                // Wait a bit more if firearms are currently loading
                if (isLoadingFirearms) {
                    setTimeout(function() {
                        loadFirearms();
                    }, 200);
                } else {
                    loadFirearms();
                }
            }, 500);
        },
        error: function(xhr) {
            isUpdatingFirearm = false;
            showToast('Error updating firearm: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

function deleteFirearmModern(firearmId) {
    if (!confirm('Are you sure you want to delete this firearm? This action cannot be undone.')) {
        return;
    }
    
    $.ajax({
        url: `${API_URL}/api/v1/firearm/${firearmId}`,
        method: 'DELETE',
        success: function(response) {
            showToast('Firearm deleted successfully!');
            closeFirearmDetailsModal();
            
            // Refresh firearms with a slight delay to ensure API has processed the deletion
            setTimeout(function() {
                // Reset to first page to ensure we see the updated list
                currentGunPage = 0;
                // Wait a bit more if firearms are currently loading
                if (isLoadingFirearms) {
                    setTimeout(function() {
                        loadFirearms();
                    }, 200);
                } else {
                    loadFirearms();
                }
                
                // Update firearm creation button states after successful deletion
                const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
                if (communityId) {
                    checkFirearmCreationLimitsOnLoad();
                }
            }, 500);
        },
        error: function(xhr) {
            showToast('Error deleting firearm: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}



function loadFirearmSocketData(firearmID) {
    var socket = io();
    var myReq = {
        firearmID: firearmID,
    };
    socket.emit("lookup_firearm_by_id", myReq);
    socket.on("load_firearm_by_id_result", (res) => {
        // For now, just show a toast since we don't have the firearm modal
        showToast('Firearm details: ' + (res.firearm ? res.firearm.serialNumber : 'Unknown'));
    });
}

// Notification Modal Functions
function openNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        fetchNotifications(0);
    }
}

function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function openNotificationMenuModal() {
    const modal = document.getElementById('notificationMenuModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

function closeNotificationMenuModal() {
    const modal = document.getElementById('notificationMenuModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Notification Count Functions
function updateNotificationCount(unseenCount) {
    const $count = $("#notification-count");
    if (unseenCount > 0) {
        if (unseenCount > 99) {
            $count.text("99+");
        } else {
            $count.text(unseenCount);
        }
        $count.css("display", "inline-block");
    } else {
        $count.css("display", "none");
    }
}

function fetchNotificationCount() {
    const userId = dbUser._id;
    $.ajax({
        url: `${API_URL}/api/v2/users/${userId}/notifications?limit=1&page=0`,
        method: "GET",
        success: function (data) {
            updateNotificationCount(data.unseenCount || 0);
        },
        error: function (xhr) {
            // Silently handle error - notification count won't update
        },
    });
}

// Account Modal Functions
function openAccountModal() {
    const modal = document.getElementById('accountModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        fillAccountDetails();
        initializeAccountSettings();
        
        // Ensure account tab is active and visible by default
        const accountTab = modal.querySelector('.heroui-tab[data-tab="account"]');
        const settingsTab = modal.querySelector('.heroui-tab[data-tab="settings"]');
        const accountContent = modal.querySelector('#accountTabContent-account');
        const settingsContent = modal.querySelector('#accountTabContent-settings');
        
        if (accountTab && settingsTab && accountContent && settingsContent) {
            // Reset tabs
            accountTab.classList.add('active');
            accountTab.style.color = '#fff';
            settingsTab.classList.remove('active');
            settingsTab.style.color = '#a0aec0';
            
            // Reset content
            accountContent.style.display = 'block';
            settingsContent.style.display = 'none';
        }
    }
}

function closeAccountModal() {
    const modal = document.getElementById('accountModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function openDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountConfirmModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function fillAccountDetails() {
    $('#accountEmail_2').val(dbUser.user.email);
    $('#accountUsername_2').val(dbUser.user.username);
    $('#accountCallSign_2').val(dbUser.user.callSign);
}

function initializeAccountSettings() {
    $('#panic-button-check-sound').prop("checked", dbUser.user.panicButtonSound);
    $('#alert-volume-slider').val(dbUser.user.alertVolumeLevel || 50);
    $('#volume-display').text(dbUser.user.alertVolumeLevel || 50);
}

function cancelUsername() {
    $('#accountUsername_2').val(dbUser.user.username);
    $('#updateUsernameBtns').hide();
}

function cancelCallSign() {
    $('#accountCallSign_2').val(dbUser.user.callSign);
    $('#updateCallSignBtns').hide();
}

function togglePanicBtnSound() {
    var socket = io();
    socket.emit('update_panic_btn_sound', dbUser);
    socket.on('load_panic_btn_result', (res) => {
        $('#panic-button-check-sound').prop("checked", !res.user.panicButtonSound);
        showSuccessAlert();
    });
}

function adjustAlertVolumeSlider() {
    var socket = io();
    var volumeAmount = $('#alert-volume-slider').val();
    var myObj = {
        dbUser: dbUser,
        volume: volumeAmount
    };
    socket.emit('update_alert_volume_slider', myObj);
    socket.on('load_alert_volume_result', (res) => {
        showSuccessAlert();
    });
}

function showSuccessAlert() {
    $('#successfully-updated-alert').show().delay(2000).fadeOut(1000, function() {
        $(this).hide();
    });
}

function openAlertVolumeHelp() {
    showToast('Alert volume controls the sound level for notifications and alerts in the application.');
}

// Emergency Services Modal Functions
window._selectedEmergencyDept = null;

var EMERGENCY_TEMPLATES = ['Police', 'Fire', 'EMS'];

function openEmergencyServicesModal() {
    const modal = document.getElementById('emergencyServicesModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.cssText = 'display: flex !important; position: fixed !important; z-index: 2000 !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(30,32,44,0.65) !important; align-items: center !important; justify-content: center !important;';
        document.body.classList.add('modal-open');
    }

    // Fetch and render emergency departments
    var communityId = dbUser?.user?.lastAccessedCommunity?.communityID || dbUser?.user?.activeCommunity;
    var loadingEl = document.getElementById('emergencyDeptLoading');
    var listEl = document.getElementById('emergencyDeptList');
    if (loadingEl) loadingEl.style.display = 'block';
    if (listEl) listEl.innerHTML = '';

    if (!communityId) {
        if (loadingEl) loadingEl.style.display = 'none';
        return;
    }

    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}/departments`,
        method: 'GET',
        success: function(data) {
            if (loadingEl) loadingEl.style.display = 'none';
            var depts = (data.departments || []).filter(function(dept) {
                return EMERGENCY_TEMPLATES.indexOf(dept.template.name) !== -1;
            });
            if (depts.length === 0) return;

            var templateIcons = { 'Police': 'fa-shield', 'Fire': 'fa-fire', 'EMS': 'fa-medkit' };
            var templateColors = { 'Police': '#3b82f6', 'Fire': '#f97316', 'EMS': '#10b981' };

            var html = '<div style="color:#a0aec0; font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">Departments</div>';
            depts.forEach(function(dept) {
                var icon = templateIcons[dept.template.name] || 'fa-building';
                var color = templateColors[dept.template.name] || '#6b7280';
                // Escape for JS string literal (backslashes first, then quotes)
                var safeName = dept.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                // Escape for HTML display
                var displayName = dept.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                html += '<div onclick="selectEmergencyDepartment(\'' + dept._id + '\', \'' + safeName + '\', \'' + dept.template.name + '\')" style="cursor:pointer; background:#1e2028; border:1.5px solid #35385a; border-radius:12px; padding:1rem 1.2rem; margin-bottom:0.75rem; display:flex; align-items:center; gap:1rem; transition:border-color 0.15s, transform 0.15s;" onmouseover="this.style.borderColor=\'' + color + '\';this.style.transform=\'translateY(-1px)\';" onmouseout="this.style.borderColor=\'#35385a\';this.style.transform=\'\';">'
                    + '<div style="background:' + color + '22; border-radius:10px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">'
                    + '<i class="fa ' + icon + '" style="color:' + color + '; font-size:1rem;"></i></div>'
                    + '<div><div style="color:#f7fafc; font-weight:600;">' + displayName + '</div>'
                    + '<div style="color:#a0aec0; font-size:0.8rem;">' + dept.template.name + ' Department</div></div>'
                    + '</div>';
            });
            if (listEl) listEl.innerHTML = html;
        },
        error: function() {
            if (loadingEl) loadingEl.style.display = 'none';
            showToast('Error: Failed to load emergency departments.');
        }
    });
}

function closeEmergencyServicesModal() {
    var modal = document.getElementById('emergencyServicesModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function selectEmergencyDepartment(deptId, deptName, templateName) {
    if (deptId) {
        window._selectedEmergencyDept = { _id: deptId, name: deptName, templateName: templateName };
    } else {
        window._selectedEmergencyDept = null;
    }
    closeEmergencyServicesModal();

    // Update call form title
    var titleEl = document.getElementById('call911ModalTitle');
    if (titleEl) {
        if (window._selectedEmergencyDept) {
            titleEl.innerHTML = '<i class="fa fa-phone" style="color:#3b82f6; margin-right:0.5rem;"></i>Emergency Call &mdash; ' + window._selectedEmergencyDept.name;
        } else {
            titleEl.innerHTML = '<i class="fa fa-exclamation-triangle" style="color:#f56565; margin-right:0.5rem;"></i>Emergency 911 Call';
        }
    }

    openCall911Modal();
}

// Call 911 Modal Functions
function openCall911Modal() {
    const modal = document.getElementById('call911Modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.cssText = 'display: flex !important; position: fixed !important; z-index: 2000 !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(30,32,44,0.65) !important; align-items: center !important; justify-content: center !important;';
        document.body.classList.add('modal-open');

        // Focus on the first input
        setTimeout(() => {
            document.getElementById('call911Name').focus();
        }, 100);
    }
}

function closeCall911Modal() {
    const modal = document.getElementById('call911Modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');

        // Reset form
        document.getElementById('call911Form').reset();
    }
    window._selectedEmergencyDept = null;
}

function submit911Call() {

    // Get form data
    const name = document.getElementById('call911Name').value.trim();
    const location = document.getElementById('call911Location').value.trim();
    const peopleDescription = document.getElementById('call911PeopleDescription').value.trim();
    const callDescription = document.getElementById('call911Description').value.trim();

    // Validation
    if (!name || !location || !peopleDescription || !callDescription) {
        showToast('Please fill in all required fields.');
        return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submit911Call');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:0.5rem;"></i>Submitting...';

    // Get community ID and user info
    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID || dbUser?.user?.activeCommunity;
    const userId = dbUser._id;
    const username = dbUser?.user?.username;

    if (!communityId) {
        showToast('Error: No active community found. Please join a community first.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }

    const selectedDept = window._selectedEmergencyDept;

    // Fetch dispatch departments
    $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}/departments`,
        method: 'GET',
        success: function(data) {
            const dispatchDepartments = data.departments.filter(dept => dept.template.name === 'Dispatch');
            const departmentIds = dispatchDepartments.map(dept => dept._id);

            if (departmentIds.length === 0) {
                showToast('Error: No dispatch departments found in this community.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            // If a specific department was selected, add it too
            if (selectedDept && departmentIds.indexOf(selectedDept._id) === -1) {
                departmentIds.push(selectedDept._id);
            }

            // Build title
            const titlePrefix = selectedDept ? selectedDept.templateName + ' Emergency' : '911';

            // Create call data
            const callData = {
                title: `${titlePrefix}: ${location}`,
                details: `911 Caller: ${name}\nLocation: ${location}\nPeople Description: ${peopleDescription}\nCall Description: ${callDescription}`,
                departments: departmentIds,
                status: true,
                communityId: communityId,
                createdByID: userId,
                createdByUsername: username
            };

            // Submit the call
            $.ajax({
                url: `${API_URL}/api/v1/calls`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(callData),
                success: function(response) {
                    showToast('Emergency call submitted successfully!');
                    closeCall911Modal();

                    // Show success alert
                    const alert = document.getElementById('911CallCreatedAlert');
                    if (alert) {
                        alert.classList.remove('hide');
                        alert.classList.add('show');
                        setTimeout(() => {
                            alert.classList.remove('show');
                            alert.classList.add('hide');
                        }, 5000);
                    }
                },
                error: function(xhr) {
                    const errorMessage = xhr.responseJSON?.message || 'Failed to submit emergency call';
                    showToast('Error: ' + errorMessage);
                },
                complete: function() {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
        },
        error: function(xhr) {
            showToast('Error: Failed to fetch dispatch departments.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// --- Firearm Management Functions for Civilian Modal ---

// Fetch firearms for a civilian
function getLinkedFirearms(page) {
    const civilianId = document.getElementById('civIdHidden').value;
    if (!civilianId) return;

    document.getElementById('manage-firearms-loading').style.display = 'flex';
    document.getElementById('manage-firearms-thumbnail').style.display = 'none';
    document.getElementById('manage-no-firearms-message').style.display = 'none';
    document.getElementById('issue-loading-firearms-alert').style.display = 'none';
    
    const prevBtn = document.getElementById('manage-prev-firearm-page-btn');
    const nextBtn = document.getElementById('manage-next-firearm-page-btn');
    if (prevBtn) prevBtn.parentElement.classList.toggle('disabled', page === 0);

    const communityId = dbUser?.user?.lastAccessedCommunity?.communityID;
    const userId = dbUser._id;

    $.ajax({
        url: `${API_URL}/api/v1/firearms/user/${userId}?active_community_id=${communityId}&limit=${linkedFirearmsPerPage}&page=${page}`,
        method: 'GET',
        success: function(data) {
            const currentCivId = document.getElementById('civIdHidden').value;
            if (currentCivId !== civilianId) return;

            linkedFirearmPage = page;
            hasMoreFirearms = data.length === linkedFirearmsPerPage;
            
            // Store the firearms for search filtering
            allLinkedFirearms = data || [];

            renderLinkedFirearms(data || [], civilianId);
            document.getElementById('manage-firearms-loading').style.display = 'none';
            document.getElementById('manage-firearms-thumbnail').style.display = 'grid';
            
            if (prevBtn) prevBtn.parentElement.classList.toggle('disabled', page === 0);
            if (nextBtn) nextBtn.parentElement.classList.toggle('disabled', !hasMoreFirearms);
            
            if (data.length === 0) {
                document.getElementById('manage-no-firearms-message').style.display = 'block';
            }
        },
        error: function(xhr) {
            const currentCivId = document.getElementById('civIdHidden').value;
            if (currentCivId !== civilianId) return;
            
            document.getElementById('manage-firearms-loading').style.display = 'none';
            document.getElementById('issue-loading-firearms-alert').style.display = 'block';
            document.getElementById('manage-no-firearms-message').style.display = 'none';
            showToast('Failed to load firearms: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

// Render firearms in the thumbnail grid
function renderLinkedFirearms(firearms, civilianId) {
    const currentCivId = document.getElementById('civIdHidden').value;
    if (currentCivId !== civilianId) return;

    const thumbnail = document.getElementById('manage-firearms-thumbnail');
    thumbnail.innerHTML = '';

    if (firearms.length === 0) {
        document.getElementById('manage-no-firearms-message').style.display = 'block';
        document.getElementById('manage-firearms-loading').style.display = 'none';
        return;
    }

    const namePromises = firearms.map(firearm => {
        if (firearm?.firearm?.linkedCivilianID && firearm?.firearm?.linkedCivilianID !== civilianId && firearm?.firearm?.linkedCivilianID !== "") {
            return fetchCivName(firearm?.firearm?.linkedCivilianID).then(name => ({
                firearm,
                linkedCivName: name
            }));
        }
        return Promise.resolve({ firearm, linkedCivName: '' });
    });

    Promise.all(namePromises).then(results => {
        const currentCivId = document.getElementById('civIdHidden').value;
        if (currentCivId !== civilianId) return;
        
        results.forEach(({ firearm, linkedCivName }) => {
            const isLinkedToCurrent = firearm?.firearm?.linkedCivilianID === civilianId;
            const isLinkedToOther = firearm?.firearm?.linkedCivilianID && !isLinkedToCurrent;

            let buttonHtml = '';
            let linkedInfo = '';

            if (isLinkedToCurrent) {
                buttonHtml = `<button onclick="delinkFirearm('${firearm._id}')" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%) !important; color:#fff !important; border:none !important; border-radius:8px !important; padding:0.6rem 1.2rem !important; font-weight:500 !important; cursor:pointer !important; width:100% !important; margin-top:0.5rem !important; transition:all 0.2s ease !important; font-size:1rem !important; box-shadow:0 4px 14px 0 rgba(239,68,68,0.4) !important;">Delink</button>`;
            } else {
                buttonHtml = `<button onclick="linkFirearm('${firearm._id}')" style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%) !important; color:#fff !important; border:none !important; border-radius:8px !important; padding:0.6rem 1.2rem !important; font-weight:500 !important; cursor:pointer !important; width:100% !important; margin-top:0.5rem !important; transition:all 0.2s ease !important; font-size:1rem !important; box-shadow:0 4px 14px 0 rgba(99,102,241,0.4) !important;">Link</button>`;
                if (isLinkedToOther && firearm?.firearm?.linkedCivilianID !== "") {
                    linkedInfo = `<p style="color:#a0aec0; font-size:0.875rem; margin:0.5rem 0 0;">Linked to ${linkedCivName}</p>`;
                }
            }

            const firearmCard = document.createElement('div');
            firearmCard.className = 'card';
            firearmCard.innerHTML = `
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fa fa-crosshairs"></i>
                    </div>
                    <div>
                        <h4 class="card-title">${firearm?.firearm?.name || ''} ${firearm?.firearm?.weaponType || ''}</h4>
                        <p class="card-subtitle">${firearm?.firearm?.serialNumber || 'No Serial'}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p>Type: ${firearm?.firearm?.weaponType || 'Unknown'}</p>
                    <p>Caliber: ${firearm?.firearm?.caliber || 'Unknown'}</p>
                    ${(firearm?.firearm?.isStolen === 'true' || firearm?.firearm?.isStolen === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> STOLEN</p>' : ''}
                    ${linkedInfo}
                    ${buttonHtml}
                </div>
            `;
            thumbnail.appendChild(firearmCard);
        });
        
        document.getElementById('manage-firearms-loading').style.display = 'none';
    }).catch(error => {
        const currentCivId = document.getElementById('civIdHidden').value;
        if (currentCivId !== civilianId) return;
        
        document.getElementById('manage-firearms-loading').style.display = 'none';
        document.getElementById('issue-loading-firearms-alert').style.display = 'block';
        showToast('Error rendering firearm data: ' + error.message);
    });
}

// Pagination functions
function getPrevFirearmPage() {
    if (linkedFirearmPage > 0) {
        getLinkedFirearms(linkedFirearmPage - 1);
    }
}

function getNextFirearmPage() {
    getLinkedFirearms(linkedFirearmPage + 1);
}

// Link a firearm to the civilian
function linkFirearm(firearmId) {
    const civilianId = document.getElementById('civIdHidden').value;
    
    $.ajax({
        url: `${API_URL}/api/v1/firearm/${firearmId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            linkedCivilianID: civilianId,
        }),
        success: function(response) {
            showToast('Firearm linked successfully!');
            getLinkedFirearms(linkedFirearmPage);
        },
        error: function(xhr) {
            showToast('Error linking firearm: ' + (xhr.responseJSON?.message || 'Please try again.'));
        }
    });
}

// Delink a firearm from the civilian
function delinkFirearm(firearmId) {
    if (!confirm('Are you sure you want to delink this firearm?')) return;
    
    $.ajax({
        url: `${API_URL}/api/v1/firearm/${firearmId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            linkedCivilianID: "",
        }),
        success: function(response) {
            showToast('Firearm delinked successfully!');
            getLinkedFirearms(linkedFirearmPage);
        },
        error: function(xhr) {
            showToast('Error delinking firearm: ' + (xhr.responseJSON?.message || 'Please try again.'));
        }
    });
}

// Search functionality for firearms
function setupFirearmSearch() {
    const searchInput = document.getElementById('manage-firearm-search');
    if (!searchInput) return;
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const civilianId = document.getElementById('civIdHidden').value;
        if (query === '') {
            if (allLinkedFirearms.length > 0) {
                renderLinkedFirearms(allLinkedFirearms, civilianId);
                document.getElementById('manage-firearms-thumbnail').style.display = 'grid';
                document.getElementById('manage-no-firearms-message').style.display = 'none';
            } else {
                document.getElementById('manage-firearms-thumbnail').style.display = 'none';
                document.getElementById('manage-no-firearms-message').style.display = 'block';
            }
            return;
        }
        // Filter firearms by name, type, or serial number
        const filteredFirearms = allLinkedFirearms.filter(firearm => {
            const name = firearm?.firearm?.name || '';
            const type = firearm?.firearm?.weaponType || '';
            const serial = firearm?.firearm?.serialNumber || '';
            return (
                name.toLowerCase().includes(query) ||
                type.toLowerCase().includes(query) ||
                serial.toLowerCase().includes(query)
            );
        });
        if (filteredFirearms.length > 0) {
            renderLinkedFirearms(filteredFirearms, civilianId);
            document.getElementById('manage-firearms-thumbnail').style.display = 'grid';
            document.getElementById('manage-no-firearms-message').style.display = 'none';
        } else {
            document.getElementById('manage-firearms-thumbnail').style.display = 'none';
            document.getElementById('manage-no-firearms-message').style.display = 'block';
            document.getElementById('manage-no-firearms-message').innerHTML = `<p style="text-align:center; color:#a0aec0; font-style:italic; font-size:1rem;">No firearms found with "${query}"</p>`;
        }
    });
}

// Attach event listeners for pagination and search when the tab is activated
function setupManageFirearmsTab() {
    const prevBtn = document.getElementById('manage-prev-firearm-page-btn');
    const nextBtn = document.getElementById('manage-next-firearm-page-btn');
    if (prevBtn) prevBtn.onclick = getPrevFirearmPage;
    if (nextBtn) nextBtn.onclick = getNextFirearmPage;
    setupFirearmSearch();
}

// --- License Management Functions for Civilian Modal ---

// License management variables
let linkedLicensePage = 1;
let allLinkedLicenses = [];
let hasMoreLicenses = false;
const linkedLicensesPerPage = 6;

// Fetch licenses for a civilian
function getLinkedLicenses(page) {
    const civilianId = document.getElementById('civIdHidden').value;
    if (!civilianId) return;

    document.getElementById('manage-licenses-loading').style.display = 'flex';
    document.getElementById('manage-licenses-thumbnail').style.display = 'none';
    document.getElementById('manage-no-licenses-message').style.display = 'none';
    document.getElementById('issue-loading-licenses-alert').style.display = 'none';
    
    const prevBtn = document.getElementById('manage-prev-license-page-btn');
    const nextBtn = document.getElementById('manage-next-license-page-btn');
    if (prevBtn) prevBtn.disabled = page <= 1;

    $.ajax({
        url: `${API_URL}/api/v1/licenses/civilian/${civilianId}?limit=${linkedLicensesPerPage}&page=${page}`,
        method: 'GET',
        success: function(data) {
            const currentCivId = document.getElementById('civIdHidden').value;
            if (currentCivId !== civilianId) return;

            linkedLicensePage = page;
            
            // Handle the API response format with page, totalCount, and data
            let licenses = [];
            let totalCount = 0;
            let currentPage = 1;
            
            if (Array.isArray(data)) {
                // API returned array directly (fallback)
                licenses = data;
            } else if (data && data.data && Array.isArray(data.data)) {
                // API returned object with page, totalCount, and data properties
                licenses = data.data;
                totalCount = data.totalCount || 0;
                currentPage = data.page || 1;
            }
            
            // Calculate proper pagination based on totalCount
            const totalPages = Math.ceil(totalCount / linkedLicensesPerPage);
            hasMoreLicenses = currentPage < totalPages;
            
            // Store the licenses for search filtering
            allLinkedLicenses = licenses || [];

            renderLinkedLicenses(licenses || [], civilianId);
            document.getElementById('manage-licenses-loading').style.display = 'none';
            document.getElementById('manage-licenses-thumbnail').style.display = 'grid';
            
            // Update pagination buttons based on proper pagination info
            if (prevBtn) prevBtn.disabled = currentPage <= 1;
            if (nextBtn) nextBtn.disabled = !hasMoreLicenses;
            
            if (licenses.length === 0) {
                document.getElementById('manage-no-licenses-message').style.display = 'block';
            }
        },
        error: function(xhr) {
            const currentCivId = document.getElementById('civIdHidden').value;
            if (currentCivId !== civilianId) return;
            
            document.getElementById('manage-licenses-loading').style.display = 'none';
            document.getElementById('issue-loading-licenses-alert').style.display = 'block';
            document.getElementById('manage-no-licenses-message').style.display = 'none';
            showToast('Failed to load licenses: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

// Render licenses in the thumbnail grid
function renderLinkedLicenses(licenses, civilianId) {
    const currentCivId = document.getElementById('civIdHidden').value;
    if (currentCivId !== civilianId) return;

    const thumbnail = document.getElementById('manage-licenses-thumbnail');
    thumbnail.innerHTML = '';

    if (licenses.length === 0) {
        document.getElementById('manage-no-licenses-message').style.display = 'block';
        document.getElementById('manage-licenses-loading').style.display = 'none';
        return;
    }

    const namePromises = licenses.map(license => {
        if (license?.license?.civilianID && license?.license?.civilianID !== civilianId && license?.license?.civilianID !== "") {
            return fetchCivName(license?.license?.civilianID).then(name => ({
                license,
                linkedCivName: name
            }));
        }
        return Promise.resolve({ license, linkedCivName: '' });
    });

    Promise.all(namePromises).then(results => {
        const currentCivId = document.getElementById('civIdHidden').value;
        if (currentCivId !== civilianId) return;
        
        results.forEach(({ license, linkedCivName }) => {
            const licenseCard = document.createElement('div');
            licenseCard.className = 'card';
            licenseCard.style.cursor = 'pointer';
            licenseCard.onclick = function() {
                openLicenseDetailsModal(license);
            };
            licenseCard.innerHTML = `
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fa fa-id-card"></i>
                    </div>
                    <div>
                        <h4 class="card-title">${license?.license?.type || ''}</h4>
                        <p class="card-subtitle">${license?.license?.status || 'Unknown Status'}</p>
                    </div>
                </div>
                <div class="card-content">
                    <p>Expiry: ${license?.license?.expirationDate || 'Unknown'}</p>
                    <p>Notes: ${license?.license?.notes || 'None'}</p>
                </div>
            `;
            thumbnail.appendChild(licenseCard);
        });
        
        document.getElementById('manage-licenses-loading').style.display = 'none';
    }).catch(error => {
        const currentCivId = document.getElementById('civIdHidden').value;
        if (currentCivId !== civilianId) return;
        
        document.getElementById('manage-licenses-loading').style.display = 'none';
        document.getElementById('issue-loading-licenses-alert').style.display = 'block';
        showToast('Error rendering license data: ' + error.message);
    });
}

// Pagination functions
function getPrevLicensePage() {
    if (linkedLicensePage > 1) {
        getLinkedLicenses(linkedLicensePage - 1);
    }
}

function getNextLicensePage() {
    getLinkedLicenses(linkedLicensePage + 1);
}

// Link a license to the civilian
function linkLicense(licenseId) {
    const civilianId = document.getElementById('civIdHidden').value;
    
    $.ajax({
        url: `${API_URL}/api/v1/license/${licenseId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            civilianID: civilianId,
        }),
        success: function(response) {
            showToast('License linked successfully!');
            getLinkedLicenses(linkedLicensePage);
        },
        error: function(xhr) {
            showToast('Error linking license: ' + (xhr.responseJSON?.message || 'Please try again.'));
        }
    });
}

// Delink a license from the civilian
function delinkLicense(licenseId) {
    if (!confirm('Are you sure you want to delink this license?')) return;
    
    $.ajax({
        url: `${API_URL}/api/v1/license/${licenseId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            civilianID: "",
        }),
        success: function(response) {
            showToast('License delinked successfully!');
            getLinkedLicenses(linkedLicensePage);
        },
        error: function(xhr) {
            showToast('Error delinking license: ' + (xhr.responseJSON?.message || 'Please try again.'));
        }
    });
}

// Search functionality for licenses
function setupLicenseSearch() {
    const searchInput = document.getElementById('manage-license-search');
    if (!searchInput) return;
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const civilianId = document.getElementById('civIdHidden').value;
        if (query === '') {
            if (allLinkedLicenses.length > 0) {
                renderLinkedLicenses(allLinkedLicenses, civilianId);
                document.getElementById('manage-licenses-thumbnail').style.display = 'grid';
                document.getElementById('manage-no-licenses-message').style.display = 'none';
            } else {
                document.getElementById('manage-licenses-thumbnail').style.display = 'none';
                document.getElementById('manage-no-licenses-message').style.display = 'block';
            }
            return;
        }
        // Enhanced filtering for license types with comprehensive variations
        const filteredLicenses = allLinkedLicenses.filter(license => {
            const licenseData = license.license ? license.license : license;
            const type = licenseData.type || '';
            const status = licenseData.status || '';
            const notes = licenseData.notes || '';
            
            // Comprehensive license type variations and aliases
            const licenseTypeVariations = {
                'drivers': ['drivers license', 'driver license', 'driving license', 'dl', 'driver\'s license'],
                'weapon': ['weapon license', 'firearm license', 'gun license', 'firearms permit', 'weapon permit'],
                'hunting': ['hunting license', 'hunting permit', 'game license'],
                'fishing': ['fishing license', 'fishing permit', 'angling license'],
                'business': ['business license', 'commercial license', 'trade license'],
                'medical': ['medical license', 'healthcare license', 'nursing license'],
                'law': ['law license', 'legal license', 'attorney license', 'bar license'],
                'real estate': ['real estate license', 'realtor license', 'property license'],
                'contractor': ['contractor license', 'construction license', 'building license'],
                'cosmetology': ['cosmetology license', 'beauty license', 'hair license'],
                'massage': ['massage license', 'therapy license', 'wellness license'],
                'liquor': ['liquor license', 'alcohol license', 'bar license', 'pub license'],
                'food': ['food license', 'restaurant license', 'catering license'],
                'vehicle': ['vehicle license', 'auto license', 'car license', 'motor vehicle license']
            };
            
            // Check if search term matches any license type variations
            const typeLower = type.toLowerCase();
            const statusLower = status.toLowerCase();
            const notesLower = notes.toLowerCase();
            
            // Direct matches
            const directMatch = typeLower.includes(query) || 
                              statusLower.includes(query) || 
                              notesLower.includes(query);
            
            // Check license type variations
            let variationMatch = false;
            for (const [category, variations] of Object.entries(licenseTypeVariations)) {
                if (category.includes(query) || variations.some(v => v.includes(query))) {
                    variationMatch = true;
                    break;
                }
            }
            
            return directMatch || variationMatch;
        });
        if (filteredLicenses.length > 0) {
            renderLinkedLicenses(filteredLicenses, civilianId);
            document.getElementById('manage-licenses-thumbnail').style.display = 'grid';
            document.getElementById('manage-no-licenses-message').style.display = 'none';
        } else {
            document.getElementById('manage-licenses-thumbnail').style.display = 'none';
            document.getElementById('manage-no-licenses-message').style.display = 'block';
            document.getElementById('manage-no-licenses-message').innerHTML = `<p style="text-align:center; color:#a0aec0; font-style:italic; font-size:1rem;">No licenses found with "${query}"</p>`;
        }
    });
}

// Attach event listeners for pagination and search when the tab is activated
function setupManageLicensesTab() {
    const prevBtn = document.getElementById('manage-prev-license-page-btn');
    const nextBtn = document.getElementById('manage-next-license-page-btn');
    if (prevBtn) prevBtn.onclick = getPrevLicensePage;
    if (nextBtn) nextBtn.onclick = getNextLicensePage;
    setupLicenseSearch();
}

// --- License Modal Functions ---

// Open license details modal
function openLicenseDetailsModal(license) {
    const licenseData = license.license ? license.license : license;
    
    // Ensure any existing modals are properly closed first
    closeCivDetailsModal();
    closeVehDetailsModal();
    closeFirearmDetailsModal();
    closeNewLicenseModal();
    
    const modal = document.getElementById('licenseDetailsModal');
    if (!modal) {
        return;
    }
    
    // Set license ID
    document.getElementById('licenseIdHidden').value = license._id || '';
    
    // Populate form fields
    document.getElementById('licenseType').value = licenseData.type || '';
    document.getElementById('licenseStatus').value = licenseData.status || '';
    document.getElementById('licenseExpiry').value = licenseData.expirationDate ? licenseData.expirationDate.split('T')[0] : '';
    document.getElementById('licenseNotes').value = licenseData.notes || '';
    
    // Populate display fields
    document.getElementById('licenseTypeDisplay').textContent = licenseData.type || 'N/A';
    document.getElementById('licenseStatusDisplay').textContent = licenseData.status || 'N/A';
    document.getElementById('licenseExpiryDisplay').textContent = licenseData.expirationDate || 'N/A';
    document.getElementById('licenseNotesDisplay').textContent = licenseData.notes || 'None';
    
    // Show modal
    modal.style.cssText = 'display: flex !important; position: fixed !important; z-index: 2000 !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(30,32,44,0.65) !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important;';
    
    // Reset all tabs to inactive state
    const allTabs = modal.querySelectorAll('.heroui-tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.color = '#a0aec0';
    });
    
    // Set Edit tab as active
    const editTab = modal.querySelector('.heroui-tab[data-tab="edit"]');
    if (editTab) {
        editTab.classList.add('active');
        editTab.style.color = '#fff';
    }
    
    // Hide all tab content
    const allTabContent = modal.querySelectorAll('.heroui-tab-content');
    allTabContent.forEach(content => {
        content.style.display = 'none';
    });
    
    // Ensure Edit tab content is visible
    const tabContent = modal.querySelector('#licenseTabContent-edit');
    if (tabContent) {
        tabContent.style.display = 'block';
    }
    
    // Ensure modal is visible and properly positioned
    setTimeout(() => {
        if (modal.style.display === 'flex') {
            modal.scrollTop = 0;
        }
    }, 100);
}

// Close license details modal
function closeLicenseDetailsModal() {
    const modal = document.getElementById('licenseDetailsModal');
    if (modal) {
        modal.style.cssText = 'display: none !important;';
        // Remove modal backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove any body classes that might have been added
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

// Open new license modal
function openNewLicenseModal() {
    // Ensure any existing modals are properly closed first
    closeLicenseDetailsModal();
    closeCivDetailsModal();
    closeVehDetailsModal();
    closeFirearmDetailsModal();
    
    const modal = document.getElementById('newLicenseModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset form fields
        document.getElementById('newLicenseType').value = '';
        document.getElementById('newLicenseStatus').value = 'Pending';
        document.getElementById('newLicenseExpiry').value = '';
        document.getElementById('newLicenseNotes').value = '';
    }
}

// Close new license modal
function closeNewLicenseModal() {
    const modal = document.getElementById('newLicenseModal');
    if (modal) {
        modal.style.display = 'none';
        // Remove modal backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove any body classes that might have been added
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Reset form fields
        document.getElementById('newLicenseType').value = '';
        document.getElementById('newLicenseStatus').value = 'Pending';
        document.getElementById('newLicenseExpiry').value = '';
        document.getElementById('newLicenseNotes').value = '';
    }
}

// Create new license
function createLicenseModern() {
    // Get the civilian ID from the civilian modal (the selected civilian)
    // If we're in the civilian modal, use the selected civilian ID
    // If we're in the main licenses tab, leave it empty for now
    const civilianId = document.getElementById('civIdHidden').value;
    
    const formData = {
        type: document.getElementById('newLicenseType').value.trim(),
        status: document.getElementById('newLicenseStatus').value,
        expirationDate: document.getElementById('newLicenseExpiry').value,
        notes: document.getElementById('newLicenseNotes').value.trim() || "",
        civilianID: civilianId || ""
    };
    
    // Validate required fields
    if (!formData.type || !formData.status || !formData.expirationDate) {
        showToast('Please fill in all required fields.');
        return;
    }
    
    // Make API call
    $.ajax({
        url: `${API_URL}/api/v1/license`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(response) {
            showToast('License created successfully!');
            closeNewLicenseModal();
            $('#createLicenseForm')[0].reset();
            // Reset to first page and refresh
            linkedLicensePage = 1;
            setTimeout(function() {
                getLinkedLicenses(1);
            }, 500);
        },
        error: function(xhr) {
            const errorMessage = xhr.responseJSON?.message || 'Failed to create license';
            showToast('Error: ' + errorMessage);
        }
    });
}

// Update license
function updateLicenseModern() {
    const licenseId = document.getElementById('licenseIdHidden').value;
    
    const formData = {
        type: document.getElementById('licenseType').value.trim(),
        status: document.getElementById('licenseStatus').value,
        expirationDate: document.getElementById('licenseExpiry').value,
        notes: document.getElementById('licenseNotes').value.trim() || ""
    };
    
    // Validate required fields
    if (!formData.type || !formData.status || !formData.expirationDate) {
        showToast('Please fill in all required fields.');
        return;
    }
    
    // Send update request
    $.ajax({
        url: `${API_URL}/api/v1/license/${licenseId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(formData),
        success: function(response) {
            showToast('License updated successfully!');
            closeLicenseDetailsModal();
            
            // Refresh licenses
            setTimeout(function() {
                getLinkedLicenses(linkedLicensePage);
            }, 500);
        },
        error: function(xhr) {
            showToast('Error updating license: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

// Delete license
function deleteLicenseModern() {
    const licenseId = document.getElementById('licenseIdHidden').value;
    
    if (!confirm('Are you sure you want to delete this license? This action cannot be undone.')) {
        return;
    }
    
    $.ajax({
        url: `${API_URL}/api/v1/license/${licenseId}`,
        method: 'DELETE',
        success: function(response) {
            showToast('License deleted successfully!');
            closeLicenseDetailsModal();
            
            // Refresh licenses
            setTimeout(function() {
                getLinkedLicenses(linkedLicensePage);
            }, 500);
        },
        error: function(xhr) {
            showToast('Error deleting license: ' + (xhr.responseJSON?.message || 'Unknown error'));
        }
    });
}

// Setup height/weight toggle buttons
function setupHeightWeightToggles() {
    // Height toggle functionality
    $(document).on('click', '.height-toggle-btn', function() {
        const value = $(this).data('value');
        const container = $(this).closest('div');
        
        // Update button states
        container.find('.height-toggle-btn').removeClass('active').css({
            'background': 'transparent',
            'color': '#a0aec0'
        });
        $(this).addClass('active').css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'color': '#fff'
        });
        
        // Toggle input visibility
        if (value === 'imperial') {
            $('.civ-height-imperial').show();
            $('.civ-height-metric').hide();
        } else {
            $('.civ-height-imperial').hide();
            $('.civ-height-metric').show();
        }
    });
    
    // Weight toggle functionality
    $(document).on('click', '.weight-toggle-btn', function() {
        const value = $(this).data('value');
        const container = $(this).closest('div');
        
        // Update button states
        container.find('.weight-toggle-btn').removeClass('active').css({
            'background': 'transparent',
            'color': '#a0aec0'
        });
        $(this).addClass('active').css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'color': '#fff'
        });
        
        // Toggle input visibility
        if (value === 'imperial') {
            $('.civ-weight-imperial').show();
            $('.civ-weight-metric').hide();
        } else {
            $('.civ-weight-imperial').hide();
            $('.civ-weight-metric').show();
        }
    });
}

// Setup custom checkboxes
function setupCustomCheckboxes() {
    $(document).on('click', '.heroui-checkbox-label', function(e) {
        e.preventDefault();
        const checkbox = $(this).find('.heroui-checkbox');
        const isChecked = checkbox.data('checked') === true;
        
        // Toggle state
        checkbox.data('checked', !isChecked);
        
        // Update visual state
        if (!isChecked) {
            // Check the checkbox
            checkbox.css({
                'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
                'border-color': '#667eea'
            });
            checkbox.find('i').show();
        } else {
            // Uncheck the checkbox
            checkbox.css({
                'background': '#1e2028',
                'border-color': '#35385a'
            });
            checkbox.find('i').hide();
        }
    });
}

// Helper function to set custom checkbox state
function setCustomCheckboxState(selector, isChecked) {
    const checkbox = $(selector);
    checkbox.data('checked', isChecked);
    
    if (isChecked) {
        checkbox.css({
            'background': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            'border-color': '#667eea'
        });
        checkbox.find('i').show();
    } else {
        checkbox.css({
            'background': '#1e2028',
            'border-color': '#35385a'
        });
        checkbox.find('i').hide();
    }
}

// Wire up license modal functionality
$(document).ready(function() {
    // Close modal buttons
    document.getElementById('licenseDetailsModalClose').onclick = closeLicenseDetailsModal;
    document.getElementById('newLicenseModalClose').onclick = closeNewLicenseModal;
    
    // Tab switching for license details modal
    $(document).on('click', '#licenseDetailsModal .heroui-tab', function() {
        const tab = $(this).data('tab');
        const modal = document.getElementById('licenseDetailsModal');
        
        // Update tab states
        modal.querySelectorAll('.heroui-tab').forEach(t => {
            t.classList.remove('active');
            t.style.color = '#a0aec0';
        });
        this.classList.add('active');
        this.style.color = '#fff';
        
        // Update content visibility
        modal.querySelectorAll('.heroui-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        modal.querySelector(`#licenseTabContent-${tab}`).style.display = 'block';
    });
});

// --- Modern Criminal History Tab ---
let cachedArrestReports = [];
let cachedArrestReportsCount = 0;

function renderCriminalHistoryTab(civData) {
  // 1. Metrics
  const criminalHistory = civData.criminalHistory || [];
  const citations = criminalHistory.filter(e => e.type === 'Citation');
  const warnings = criminalHistory.filter(e => e.type === 'Warning');
  const arrestReports = cachedArrestReports || [];
  const metricsHtml = `
    <div class="heroui-metrics-row" style="display:flex;gap:1.5rem;margin-bottom:1.5rem;">
      <div class="heroui-metric-card" style="flex:1;background:#23263a;border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;align-items:center;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);">
        <div style="font-size:2rem;font-weight:700;color:#667eea;">${citations.length}</div>
        <div style="color:#a0aec0;font-size:1.1rem;">Citations</div>
      </div>
      <div class="heroui-metric-card" style="flex:1;background:#23263a;border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;align-items:center;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);">
        <div style="font-size:2rem;font-weight:700;color:#fbbf24;">${warnings.length}</div>
        <div style="color:#a0aec0;font-size:1.1rem;">Warnings</div>
      </div>
      <div class="heroui-metric-card" style="flex:1;background:#23263a;border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;align-items:center;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);">
        <div style="font-size:2rem;font-weight:700;color:#ef4444;">${cachedArrestReportsCount}</div>
        <div style="color:#a0aec0;font-size:1.1rem;">Arrest Reports</div>
      </div>
    </div>`;

  // 2. Toggles (Custom HeroUI Pro styles)
  const activeStyle = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  const inactiveStyle = 'background:#23263a;color:#fff;border:1.5px solid #35385a;box-shadow:none;font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  const togglesHtml = `
    <div class="heroui-toggle-row" style="display:flex;gap:1rem;margin-bottom:1.25rem;">
      <button class="criminal-toggle-btn" id="criminalToggleCitations" style="${activeStyle}" data-type="Citation">Citations</button>
      <button class="criminal-toggle-btn" id="criminalToggleWarnings" style="${inactiveStyle}" data-type="Warning">Warnings</button>
      <button class="criminal-toggle-btn" id="criminalToggleArrests" style="${inactiveStyle}" data-type="Arrest">Arrest Reports</button>
    </div>`;

  // 3. Content area
  const contentHtml = `<div id="criminalHistoryContentArea"></div>`;

  $('#civRecordsTabCriminal').html(metricsHtml + togglesHtml + contentHtml);

  renderCriminalHistoryEntries('Citation', civData);
}

function updateCriminalHistoryMetrics(civData) {
  const criminalHistory = civData.criminalHistory || [];
  const citations = criminalHistory.filter(e => e.type === 'Citation');
  const warnings = criminalHistory.filter(e => e.type === 'Warning');
  const metricCards = $('.heroui-metrics-row .heroui-metric-card');
  if (metricCards.length >= 3) {
    metricCards.eq(0).find('div:first').text(citations.length);
    metricCards.eq(1).find('div:first').text(warnings.length);
    metricCards.eq(2).find('div:first').text(cachedArrestReportsCount);
  }
}

function getCriminalStatusBadge(entry) {
  if (entry.status === 'dismissed') {
    return `<span style="display:inline-block;background:#065f46;color:#6ee7b7;font-size:0.8rem;font-weight:600;padding:0.2rem 0.6rem;border-radius:6px;margin-left:0.5rem;">Dismissed</span>`;
  }
  if (entry.status === 'upheld') {
    return `<span style="display:inline-block;background:#7f1d1d;color:#fca5a5;font-size:0.8rem;font-weight:600;padding:0.2rem 0.6rem;border-radius:6px;margin-left:0.5rem;">Upheld</span>`;
  }
  if (entry.status === 'contested') {
    return `<span style="display:inline-block;background:#78350f;color:#fbbf24;font-size:0.8rem;font-weight:600;padding:0.2rem 0.6rem;border-radius:6px;margin-left:0.5rem;">Contested</span>`;
  }
  return '';
}

function getContestCheckbox(entry, type) {
  if (entry.status === 'dismissed' || entry.status === 'contested' || entry.status === 'upheld') return '';
  const itemType = type === 'Arrest' ? 'arrest' : type.toLowerCase();
  return `<input type="checkbox" class="contest-item-checkbox" data-item-id="${entry._id}" data-item-type="${itemType}" style="width:18px;height:18px;cursor:pointer;accent-color:#667eea;margin-right:0.75rem;flex-shrink:0;" />`;
}

function updateContestButtonVisibility() {
  const checked = $('.contest-item-checkbox:checked').length;
  if (checked > 0) {
    if ($('#contestSelectedBtn').length === 0) {
      $('#criminalHistoryContentArea').before(`
        <div id="contestSelectedBtnContainer" style="margin-bottom:1rem;display:flex;justify-content:flex-end;">
          <button id="contestSelectedBtn" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.95rem;display:flex;align-items:center;gap:0.5rem;">
            <i class="fa fa-gavel"></i> Contest Selected (<span id="contestCount">${checked}</span>)
          </button>
        </div>
      `);
    } else {
      $('#contestCount').text(checked);
    }
  } else {
    $('#contestSelectedBtnContainer').remove();
  }
}

function renderCriminalHistoryEntries(type, civData) {
  let html = '';
  if (type === 'Citation' || type === 'Warning') {
    const entries = (civData.criminalHistory || []).filter(e => e.type === type);
    if (entries.length === 0) {
      html = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No ${type.toLowerCase()}s found.</div>`;
    } else {
      html = entries.map(entry => {
        const isResolved = entry.status === 'dismissed' || entry.status === 'upheld';
        const isDismissed = entry.status === 'dismissed';
        const isUpheld = entry.status === 'upheld';
        const cardOpacity = isDismissed ? 'opacity:0.6;' : '';
        const textDecoration = isDismissed ? 'text-decoration:line-through;' : '';
        return `
        <div class="heroui-criminal-card" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);display:flex;align-items:center;${cardOpacity}">
          ${getContestCheckbox(entry, type)}
          <div style="flex:1;">
            <div style="font-weight:600;font-size:1.1rem;${textDecoration}">${entry.type}${getCriminalStatusBadge(entry)}</div>
            <div style="font-size:0.95rem;color:#a0aec0;">${new Date(entry.createdAt).toLocaleDateString()}</div>
            <ul style="margin:0.5rem 0 0.5rem 1.25rem;padding:0;list-style:disc;">${(entry.fines||[]).map(fine => `<li><strong>${fine.fineType}</strong> (${fine.category}): $${fine.fineAmount}</li>`).join('')}</ul>
            <div style="font-size:0.95rem;color:#a0aec0;">${entry.notes ? `<strong>Notes:</strong> ${entry.notes}` : ''}</div>
            ${entry.redacted ? '<div style="color:#ef4444;font-weight:600;">Redacted</div>' : ''}
            ${isDismissed && entry.dismissedBy ? `<div style="font-size:0.85rem;color:#6ee7b7;margin-top:0.25rem;">Dismissed by ${entry.dismissedBy}</div>` : ''}
            ${isUpheld && entry.dismissedBy ? `<div style="font-size:0.85rem;color:#fca5a5;margin-top:0.25rem;">Upheld by Judge ${entry.dismissedBy}</div>` : ''}
          </div>
          <button class="heroui-trash-btn" data-type="criminal" data-id="${entry._id}" title="Delete" style="background:none;border:none;color:#ef4444;font-size:1.5rem;cursor:pointer;"><i class="fa fa-trash"></i></button>
        </div>`;
      }).join('');
    }
  } else if (type === 'Arrest') {
    const entries = cachedArrestReports || [];
    if (entries.length === 0) {
      html = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No arrest reports found.</div>`;
    } else {
      html = entries.map(entry => {
        const isDismissed = entry.status === 'dismissed';
        const isUpheld = entry.status === 'upheld';
        const cardOpacity = isDismissed ? 'opacity:0.6;' : '';
        const textDecoration = isDismissed ? 'text-decoration:line-through;' : '';
        return `
        <div class="heroui-criminal-card" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);display:flex;align-items:center;${cardOpacity}">
          ${getContestCheckbox(entry, 'Arrest')}
          <div style="flex:1;">
            <div style="font-weight:600;font-size:1.1rem;${textDecoration}">Arrest Report${getCriminalStatusBadge(entry)}</div>
            <div style="font-size:0.95rem;color:#a0aec0;">${new Date(entry.arrestDate).toLocaleDateString()}</div>
            <div style="font-size:0.95rem;color:#a0aec0;"><strong>Charges:</strong> ${entry.charges || 'N/A'}</div>
            <div style="font-size:0.95rem;color:#a0aec0;"><strong>Location:</strong> ${entry.arrestLocation || 'N/A'}</div>
            ${isDismissed && entry.dismissedBy ? `<div style="font-size:0.85rem;color:#6ee7b7;margin-top:0.25rem;">Dismissed by ${entry.dismissedBy}</div>` : ''}
            ${isUpheld && entry.dismissedBy ? `<div style="font-size:0.85rem;color:#fca5a5;margin-top:0.25rem;">Upheld by Judge ${entry.dismissedBy}</div>` : ''}
          </div>
          <button class="heroui-trash-btn" data-type="arrest" data-id="${entry._id}" title="Delete" style="background:none;border:none;color:#ef4444;font-size:1.5rem;cursor:pointer;"><i class="fa fa-trash"></i></button>
        </div>`;
      }).join('');
    }
  }
  $('#criminalHistoryContentArea').html(html);
  updateContestButtonVisibility();
}

// Contest checkbox change handler
$(document).on('change', '.contest-item-checkbox', function() {
  updateContestButtonVisibility();
});

// Contest selected button click handler — opens contest modal
$(document).on('click', '#contestSelectedBtn', function() {
  const selectedItems = [];
  $('.contest-item-checkbox:checked').each(function() {
    const $card = $(this).closest('.heroui-criminal-card');
    const itemId = $(this).data('item-id');
    const itemType = $(this).data('item-type');

    // Build a descriptive summary with actual charge details
    let summary = '';
    if (itemType === 'arrest') {
      const chargesEl = $card.find('div:contains("Charges:")');
      const charges = chargesEl.length ? chargesEl.text().replace('Charges:', '').trim() : '';
      summary = charges || 'Arrest Report';
    } else {
      // Citation/Warning — extract fine types from the list items
      const fines = [];
      $card.find('li').each(function() {
        const text = $(this).find('strong').text().trim();
        if (text) fines.push(text);
      });
      summary = fines.length > 0 ? fines.join(', ') : (itemType === 'citation' ? 'Citation' : 'Warning');
    }

    selectedItems.push({ itemID: itemId, itemType: itemType, summary: summary });
  });
  openContestModal(selectedItems);
});

function openContestModal(selectedItems) {
  window._contestSelectedItems = selectedItems;
  let itemsHtml = selectedItems.map((item, i) => `
    <div style="background:#1e2035;border-radius:8px;padding:0.75rem 1rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.75rem;">
      <span style="display:inline-block;background:${item.itemType === 'arrest' ? '#7f1d1d' : item.itemType === 'citation' ? '#312e81' : '#78350f'};color:#fff;font-size:0.75rem;padding:0.15rem 0.5rem;border-radius:4px;text-transform:capitalize;">${item.itemType}</span>
      <span style="color:#e2e8f0;font-size:0.95rem;">${item.summary}</span>
    </div>
  `).join('');

  const modalHtml = `
    <div id="contestModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#1a1c2e;border-radius:16px;padding:2rem;max-width:550px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
          <h3 style="margin:0;color:#f7fafc;font-size:1.25rem;"><i class="fa fa-gavel" style="margin-right:0.5rem;color:#f59e0b;"></i>Contest Records</h3>
          <button id="closeContestModal" style="background:none;border:none;color:#a0aec0;font-size:1.5rem;cursor:pointer;">&times;</button>
        </div>
        <div style="margin-bottom:1.25rem;">
          <label style="color:#a0aec0;font-size:0.9rem;display:block;margin-bottom:0.5rem;">Records to Contest (${selectedItems.length})</label>
          ${itemsHtml}
        </div>
        <div style="margin-bottom:1.25rem;">
          <label style="color:#a0aec0;font-size:0.9rem;display:block;margin-bottom:0.5rem;">Your Statement</label>
          <textarea id="contestStatement" rows="4" placeholder="Explain why you are contesting these records..." style="width:100%;background:#23263a;border:1px solid #35385a;border-radius:8px;padding:0.75rem;color:#f7fafc;font-size:0.95rem;resize:vertical;"></textarea>
        </div>
        <div style="display:flex;gap:1rem;justify-content:flex-end;">
          <button id="cancelContestBtn" style="background:#23263a;color:#a0aec0;border:1px solid #35385a;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
          <button id="submitContestBtn" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:600;">Submit Contest</button>
        </div>
      </div>
    </div>`;
  $('body').append(modalHtml);
}

$(document).on('click', '#closeContestModal, #cancelContestBtn', function() {
  $('#contestModal').remove();
});

$(document).on('click', '#submitContestBtn', function() {
  const statement = $('#contestStatement').val().trim();
  if (!statement) {
    alert('Please provide a statement explaining why you are contesting.');
    return;
  }
  const selectedItems = window._contestSelectedItems || [];
  const civId = $('#civIdHidden').val();
  const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
  const civData = civ?.civilian || civ || {};
  const communityId = dbUser?.user?.lastAccessedCommunity?.communityID || '';

  const courtCasePayload = {
    civilianID: civId,
    civilianName: (civData.name || '').trim() || ((civData.firstName || '') + ' ' + (civData.lastName || '')).trim(),
    userID: dbUser?._id || dbUser?.user?._id || '',
    contestedItems: selectedItems,
    statement: statement,
    communityID: communityId,
    departmentID: '', // Will be assigned by judge
  };

  $('#submitContestBtn').prop('disabled', true).text('Submitting...');

  $.ajax({
    url: `${API_URL}/api/v2/court-cases`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(courtCasePayload),
    success: function(resp) {
      $('#contestModal').remove();
      alert('Your contest has been submitted successfully. A judge will review your case.');
      // Refresh the records view
      const civId = $('#civIdHidden').val();
      const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
      const civData = civ?.civilian || civ || {};
      // Re-fetch civilian data to get updated statuses
      $.ajax({
        url: `${API_URL}/api/v1/civilian/${civId}`,
        method: 'GET',
        success: function(updatedCiv) {
          const updatedCivData = updatedCiv?.civilian || updatedCiv || {};
          renderCriminalHistoryTab(updatedCivData);
        }
      });
    },
    error: function(xhr) {
      alert('Failed to submit contest: ' + (xhr.responseJSON?.message || 'Unknown error'));
      $('#submitContestBtn').prop('disabled', false).text('Submit Contest');
    }
  });
});

// Toggle logic (Custom HeroUI Pro styles)
$(document).on('click', '.criminal-toggle-btn', function() {
  const activeStyle = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  const inactiveStyle = 'background:#23263a;color:#fff;border:1.5px solid #35385a;box-shadow:none;font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  $('.criminal-toggle-btn').attr('style', inactiveStyle);
  $(this).attr('style', activeStyle);
  const type = $(this).data('type');
  const civId = $('#civIdHidden').val();
  const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
  const civData = civ?.civilian || civ || {};
  if (type === 'Arrest') {
    fetchArrestReportsForCiv(civId, function() {
      renderCriminalHistoryEntries('Arrest', civData);
    });
  } else {
    renderCriminalHistoryEntries(type, civData);
  }
});

function fetchArrestReportsForCiv(civId, cb) {
  $.ajax({
    url: `${API_URL}/api/v1/arrest-report/arrestee/${civId}`,
    method: 'GET',
    success: function(data) {
      cachedArrestReports = (data.data || []).map(r => r.arrestReport ? { _id: r._id, ...r.arrestReport } : r);
      cachedArrestReportsCount = data.totalCount || cachedArrestReports.length;
      if (typeof cb === 'function') cb();
    },
    error: function() {
      cachedArrestReports = [];
      cachedArrestReportsCount = 0;
      if (typeof cb === 'function') cb();
    }
  });
}

// --- Medical Tab Functions ---
let cachedMedications = [];
let cachedMedicationsCount = 0;
let cachedMedicalReports = [];
let cachedMedicalReportsCount = 0;

function renderCivMedicalTabs() {
  const civId = $('#civIdHidden').val();
  const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
  const civData = civ?.civilian || civ || {};

  // Fetch medications and medical reports
  fetchMedicationsForCiv(civId, function() {
    fetchMedicalReportsForCiv(civId, function() {
      renderMedicalTabContent(civData);
    });
  });
}

function fetchMedicationsForCiv(civId, cb) {
  $.ajax({
    url: `${API_URL}/api/v1/medications?civilian_id=${civId}&active_community_id=${dbUser?.user?.lastAccessedCommunity?.communityID}`,
    method: 'GET',
    success: function(data) {
      cachedMedications = (data.medications || []).map(m => m.medication || m);
      cachedMedicationsCount = data.pagination?.totalRecords || cachedMedications.length;
      if (typeof cb === 'function') cb();
    },
    error: function() {
      cachedMedications = [];
      cachedMedicationsCount = 0;
      if (typeof cb === 'function') cb();
    }
  });
}

function fetchMedicalReportsForCiv(civId, cb) {
  $.ajax({
    url: `${API_URL}/api/v1/medical-reports?civilian_id=${civId}&active_community_id=${dbUser?.user?.lastAccessedCommunity?.communityID}`,
    method: 'GET',
    success: function(data) {
      cachedMedicalReports = (data.medicalReports || []).map(r => r.report || r);
      cachedMedicalReportsCount = data.pagination?.totalRecords || cachedMedicalReports.length;
      if (typeof cb === 'function') cb();
    },
    error: function() {
      cachedMedicalReports = [];
      cachedMedicalReportsCount = 0;
      if (typeof cb === 'function') cb();
    }
  });
}

function renderMedicalTabContent(civData) {
  // 1. Header with Add buttons
  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
      
      <div style="display:flex;gap:1rem;">
        <button class="heroui-add-btn" onclick="openAddMedicationModal()" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;">
          <i class="fa fa-plus"></i> Add Medication
        </button>
        <button class="heroui-add-btn" onclick="openAddMedicalReportModal()" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;">
          <i class="fa fa-plus"></i> Add Medical Report
        </button>
      </div>
    </div>`;

  // 2. Metrics section
  const metricsHtml = `
    <div class="heroui-metrics-row" style="display:flex;gap:1rem;margin-bottom:1.5rem;">
      <div class="heroui-metric-card" style="flex:1;background:#23263a;border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;align-items:center;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);">
        <div style="font-size:2rem;font-weight:700;color:#10b981;">${cachedMedicationsCount}</div>
        <div style="color:#a0aec0;font-size:1.1rem;">Medications</div>
      </div>
      <div class="heroui-metric-card" style="flex:1;background:#23263a;border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;align-items:center;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);">
        <div style="font-size:2rem;font-weight:700;color:#f59e0b;">${cachedMedicalReportsCount}</div>
        <div style="color:#a0aec0;font-size:1.1rem;">Medical Reports</div>
      </div>
    </div>`;

  // 2. Toggles
  const activeStyle = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  const inactiveStyle = 'background:#23263a;color:#fff;border:1.5px solid #35385a;box-shadow:none;font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  const togglesHtml = `
    <div class="heroui-toggle-row" style="display:flex;gap:1rem;margin-bottom:1.25rem;">
      <button class="medical-toggle-btn" id="medicalToggleMedications" style="${activeStyle}" data-type="Medication">Medications</button>
      <button class="medical-toggle-btn" id="medicalToggleReports" style="${inactiveStyle}" data-type="MedicalReport">Medical Reports</button>
    </div>`;

  // 3. Content area
  const contentHtml = `<div id="medicalContentArea"></div>`;

  $('#civMedicalTabContent').html(headerHtml + metricsHtml + togglesHtml + contentHtml);

  renderMedicalEntries('Medication');
}

function renderMedicalEntries(type) {
  let html = '';
  if (type === 'Medication') {
    if (cachedMedications.length === 0) {
      html = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No medications found.</div>`;
    } else {
      html = cachedMedications.map(medication => `
        <div class="heroui-medical-card" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:1.1rem;color:#10b981;">${medication.name || 'Unknown Medication'}</div>
            <div style="font-size:0.95rem;color:#a0aec0;margin-top:0.25rem;">
              <strong>Dosage:</strong> ${medication.dosage || 'N/A'} | 
              <strong>Frequency:</strong> ${medication.frequency || 'N/A'}
            </div>
            <div style="font-size:0.95rem;color:#a0aec0;margin-top:0.25rem;">
              <strong>Start Date:</strong> ${medication.startDate ? new Date(medication.startDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;margin-left:1rem;">
            <button class="heroui-edit-btn" data-type="medication" data-id="${medication._id}" title="Edit" style="background:none;border:none;color:#667eea;font-size:1.2rem;cursor:pointer;"><i class="fa fa-edit"></i></button>
            <button class="heroui-trash-btn" data-type="medication" data-id="${medication._id}" title="Delete" style="background:none;border:none;color:#ef4444;font-size:1.2rem;cursor:pointer;"><i class="fa fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    }
  } else if (type === 'MedicalReport') {
    if (cachedMedicalReports.length === 0) {
      html = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No medical reports found.</div>`;
    } else {
      html = cachedMedicalReports.map(report => `
        <div class="heroui-medical-card" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:1.1rem;color:#f59e0b;">Medical Report</div>
            <div style="font-size:0.95rem;color:#a0aec0;margin-top:0.25rem;">
              <strong>Date:</strong> ${report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A'} | 
              <strong>Time:</strong> ${report.reportTime || 'N/A'}
            </div>
            <div style="font-size:0.95rem;color:#a0aec0;margin-top:0.25rem;">
              <strong>Hospitalized:</strong> ${report.hospitalized || 'N/A'} | 
              <strong>Deceased:</strong> ${report.deceased ? 'Yes' : 'No'}
            </div>
            <div style="font-size:0.95rem;color:#a0aec0;margin-top:0.5rem;">
              <strong>Details:</strong> ${report.details || 'No details provided'}
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;margin-left:1rem;">
            <button class="heroui-edit-btn" data-type="medicalReport" data-id="${report._id}" title="Edit" style="background:none;border:none;color:#667eea;font-size:1.2rem;cursor:pointer;"><i class="fa fa-edit"></i></button>
            <button class="heroui-trash-btn" data-type="medicalReport" data-id="${report._id}" title="Delete" style="background:none;border:none;color:#ef4444;font-size:1.2rem;cursor:pointer;"><i class="fa fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    }
  }
  $('#medicalContentArea').html(html);
}

// Medical toggle logic
$(document).on('click', '.medical-toggle-btn', function() {
  const activeStyle = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  const inactiveStyle = 'background:#23263a;color:#fff;border:1.5px solid #35385a;box-shadow:none;font-weight:600;font-size:1.1rem;padding:0.75rem 1rem;border-radius:8px 8px 0 0;flex:1;transition:all 0.2s;outline:none;';
  $('.medical-toggle-btn').attr('style', inactiveStyle);
  $(this).attr('style', activeStyle);
  const type = $(this).data('type');
  renderMedicalEntries(type);
});

// Delete logic
$(document).on('click', '.heroui-trash-btn', function() {
  const $btn = $(this);
  const type = $btn.data('type');
  const id = $btn.data('id');
  const civId = $('#civIdHidden').val();
  if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
  
  if (type === 'medication') {
    $.ajax({
      url: `${API_URL}/api/v1/medications/${id}`,
      method: 'DELETE',
      success: function() {
        showToast('Medication deleted successfully');
        renderCivMedicalTabs(); // Refresh the medical tab
      },
      error: function() {
        showToast('Error deleting medication', 'error');
      }
    });
  } else if (type === 'medicalReport') {
    $.ajax({
      url: `${API_URL}/api/v1/medical-reports/${id}`,
      method: 'DELETE',
      success: function() {
        showToast('Medical report deleted successfully');
        renderCivMedicalTabs(); // Refresh the medical tab
      },
      error: function() {
        showToast('Error deleting medical report', 'error');
      }
    });
  } else if (type === 'criminal') {
    $.ajax({
      url: `${API_URL}/api/v1/civilian/${civId}/criminal-history/${id}`,
      method: 'DELETE',
      success: function() {
        const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
        const civData = civ?.civilian || civ || {};
        civData.criminalHistory = (civData.criminalHistory || []).filter(e => e._id !== id);
        // Remove card from DOM and update metrics without resetting the active tab
        $btn.closest('.heroui-criminal-card').remove();
        updateCriminalHistoryMetrics(civData);
      },
      error: function() {
        showToast('Failed to delete record.');
      }
    });
  } else if (type === 'arrest') {
    $.ajax({
      url: `${API_URL}/api/v1/arrest-report/${id}`,
      method: 'DELETE',
      success: function() {
        cachedArrestReports = cachedArrestReports.filter(e => e._id !== id);
        cachedArrestReportsCount--;
        const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
        const civData = civ?.civilian || civ || {};
        // Remove card from DOM and update metrics without resetting the active tab
        $btn.closest('.heroui-criminal-card').remove();
        updateCriminalHistoryMetrics(civData);
      },
      error: function() {
        showToast('Failed to delete arrest report.');
      }
    });
  }
});

// Edit logic for medical items
$(document).on('click', '.heroui-edit-btn', function() {
  const type = $(this).data('type');
  const id = $(this).data('id');
  
  if (type === 'medication') {
    const medication = cachedMedications.find(m => m._id === id);
    if (medication) {
      openEditMedicationModal(medication);
    }
  } else if (type === 'medicalReport') {
    const report = cachedMedicalReports.find(r => r._id === id);
    if (report) {
      openEditMedicalReportModal(report);
    }
  }
});

function openEditMedicationModal(medication) {
  // Create modal HTML
  const modalHtml = `
    <div id="editMedicationModal" class="heroui-modal" style="display:flex; position:fixed; z-index:2000; left:0; top:0; width:100vw; height:100vh; background:rgba(30,32,44,0.65); align-items:center; justify-content:center;">
      <div class="heroui-modal-content" style="background:#23263a; border-radius:16px; max-width:500px; width:98%; margin:auto; box-shadow:0 8px 32px rgba(0,0,0,0.25); padding:2rem; position:relative;">
        <div style="text-align:right;margin-bottom:1.5rem;">
          <button class="heroui-modal-close" onclick="closeEditMedicationModal()" style="font-size:2rem;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
        </div>
        <h3 style="color:#f7fafc;margin-bottom:1.5rem;">Edit Medication</h3>
        <form id="editMedicationForm">
          <input type="hidden" id="editMedicationId" value="${medication._id}">
          <div style="margin-bottom:1rem;">
            <label for="editMedicationName" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Medication Name*</label>
            <input id="editMedicationName" type="text" class="heroui-input" value="${medication.name || ''}" required style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="editMedicationDosage" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Dosage</label>
            <input id="editMedicationDosage" type="text" class="heroui-input" value="${medication.dosage || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="editMedicationFrequency" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Frequency</label>
            <input id="editMedicationFrequency" type="text" class="heroui-input" value="${medication.frequency || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:1.5rem;">
            <label for="editMedicationStartDate" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Start Date</label>
            <input id="editMedicationStartDate" type="date" class="heroui-input" value="${medication.startDate || ''}" style="width:100%;">
          </div>
          <div style="display:flex;gap:1rem;justify-content:flex-end;">
            <button type="button" onclick="closeEditMedicationModal()" style="background:#4a5568;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Cancel</button>
            <button type="submit" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Update Medication</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to body
  $('body').append(modalHtml);
  
  // Handle form submission
  $('#editMedicationForm').on('submit', function(e) {
    e.preventDefault();
    updateMedication();
  });
}

function closeEditMedicationModal() {
  $('#editMedicationModal').remove();
}

function updateMedication() {
  const id = $('#editMedicationId').val();
  const formData = {
    medication: {
      name: $('#editMedicationName').val().trim(),
      dosage: $('#editMedicationDosage').val().trim(),
      frequency: $('#editMedicationFrequency').val().trim(),
      startDate: $('#editMedicationStartDate').val(),
      civilianID: $('#civIdHidden').val(),
      activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID,
      userID: dbUser._id,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      dateOfBirth: dbUser.dateOfBirth
    }
  };
  
  $.ajax({
    url: `${API_URL}/api/v1/medications/${id}`,
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(formData),
    success: function() {
      showToast('Medication updated successfully');
      closeEditMedicationModal();
      renderCivMedicalTabs(); // Refresh the medical tab
    },
    error: function() {
      showToast('Error updating medication', 'error');
    }
  });
}

function openEditMedicalReportModal(report) {
  // Create modal HTML
  const modalHtml = `
    <div id="editMedicalReportModal" class="heroui-modal" style="display:flex; position:fixed; z-index:2000; left:0; top:0; width:100vw; height:100vh; background:rgba(30,32,44,0.65); align-items:center; justify-content:center;">
      <div class="heroui-modal-content" style="background:#23263a; border-radius:16px; max-width:500px; width:98%; margin:auto; box-shadow:0 8px 32px rgba(0,0,0,0.25); padding:2rem; position:relative;">
        <div style="text-align:right;margin-bottom:1.5rem;">
          <button class="heroui-modal-close" onclick="closeEditMedicalReportModal()" style="font-size:2rem;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
        </div>
        <h3 style="color:#f7fafc;margin-bottom:1.5rem;">Edit Medical Report</h3>
        <form id="editMedicalReportForm">
          <input type="hidden" id="editMedicalReportId" value="${report._id}">
          <div style="margin-bottom:1rem;">
            <label for="editMedicalReportDate" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Report Date*</label>
            <input id="editMedicalReportDate" type="date" class="heroui-input" value="${report.reportDate || ''}" required style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="editMedicalReportTime" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Report Time</label>
            <input id="editMedicalReportTime" type="time" class="heroui-input" value="${report.reportTime || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="editMedicalReportHospitalized" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Hospitalized</label>
            <select id="editMedicalReportHospitalized" class="heroui-input" style="width:100%;">
              <option value="Yes" ${report.hospitalized === 'Yes' ? 'selected' : ''}>Yes</option>
              <option value="No" ${report.hospitalized === 'No' ? 'selected' : ''}>No</option>
              <option value="Unknown" ${report.hospitalized === 'Unknown' ? 'selected' : ''}>Unknown</option>
            </select>
          </div>
          <div style="margin-bottom:1rem;">
            <label for="editMedicalReportDeceased" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Deceased</label>
            <select id="editMedicalReportDeceased" class="heroui-input" style="width:100%;">
              <option value="false" ${!report.deceased ? 'selected' : ''}>No</option>
              <option value="true" ${report.deceased ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div style="margin-bottom:1.5rem;">
            <label for="editMedicalReportDetails" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Details</label>
            <textarea id="editMedicalReportDetails" class="heroui-input" rows="4" style="width:100%;resize:vertical;">${report.details || ''}</textarea>
          </div>
          <div style="display:flex;gap:1rem;justify-content:flex-end;">
            <button type="button" onclick="closeEditMedicalReportModal()" style="background:#4a5568;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Cancel</button>
            <button type="submit" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Update Report</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to body
  $('body').append(modalHtml);
  
  // Handle form submission
  $('#editMedicalReportForm').on('submit', function(e) {
    e.preventDefault();
    updateMedicalReport();
  });
}

function closeEditMedicalReportModal() {
  $('#editMedicalReportModal').remove();
}

function updateMedicalReport() {
  const id = $('#editMedicalReportId').val();
  const formData = {
    report: {
      date: $('#editMedicalReportDate').val(),
      details: $('#editMedicalReportDetails').val().trim(),
      civilianID: $('#civIdHidden').val(),
      reportingEmsID: dbUser._id,
      hospitalized: $('#editMedicalReportHospitalized').val() === 'Yes',
      deceased: $('#editMedicalReportDeceased').val() === 'true',
      activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID,
      userID: dbUser._id,
      name: dbUser.firstName + ' ' + dbUser.lastName,
      dateOfBirth: dbUser.dateOfBirth
    }
  };
  
  $.ajax({
    url: `${API_URL}/api/v1/medical-reports/${id}`,
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(formData),
    success: function() {
      showToast('Medical report updated successfully');
      closeEditMedicalReportModal();
      renderCivMedicalTabs(); // Refresh the medical tab
    },
    error: function() {
      showToast('Error updating medical report', 'error');
    }
  });
}

// Add new medication modal
function openAddMedicationModal() {
  // Create modal HTML
  const modalHtml = `
    <div id="addMedicationModal" class="heroui-modal" style="display:flex; position:fixed; z-index:2000; left:0; top:0; width:100vw; height:100vh; background:rgba(30,32,44,0.65); align-items:center; justify-content:center;">
      <div class="heroui-modal-content" style="background:#23263a; border-radius:16px; max-width:500px; width:98%; margin:auto; box-shadow:0 8px 32px rgba(0,0,0,0.25); padding:2rem; position:relative;">
        <div style="text-align:right;margin-bottom:1.5rem;">
          <button class="heroui-modal-close" onclick="closeAddMedicationModal()" style="font-size:2rem;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
        </div>
        <h3 style="color:#f7fafc;margin-bottom:1.5rem;">Add New Medication</h3>
        <form id="addMedicationForm">
          <div style="margin-bottom:1rem;">
            <label for="addMedicationName" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Medication Name*</label>
            <input id="addMedicationName" type="text" class="heroui-input" required style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="addMedicationDosage" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Dosage</label>
            <input id="addMedicationDosage" type="text" class="heroui-input" style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="addMedicationFrequency" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Frequency</label>
            <input id="addMedicationFrequency" type="text" class="heroui-input" style="width:100%;">
          </div>
          <div style="margin-bottom:1.5rem;">
            <label for="addMedicationStartDate" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Start Date</label>
            <input id="addMedicationStartDate" type="date" class="heroui-input" style="width:100%;">
          </div>
          <div style="display:flex;gap:1rem;justify-content:flex-end;">
            <button type="button" onclick="closeAddMedicationModal()" style="background:#4a5568;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Cancel</button>
            <button type="submit" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Add Medication</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to body
  $('body').append(modalHtml);
  
  // Handle form submission
  $('#addMedicationForm').on('submit', function(e) {
    e.preventDefault();
    addMedication();
  });
}

function closeAddMedicationModal() {
  $('#addMedicationModal').remove();
}

function addMedication() {
  const formData = {
    medication: {
      name: $('#addMedicationName').val().trim(),
      dosage: $('#addMedicationDosage').val().trim(),
      frequency: $('#addMedicationFrequency').val().trim(),
      startDate: $('#addMedicationStartDate').val(),
      civilianID: $('#civIdHidden').val(),
      activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID,
      userID: dbUser._id,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      dateOfBirth: dbUser.dateOfBirth
    }
  };
  
  $.ajax({
    url: `${API_URL}/api/v1/medications`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(formData),
    success: function() {
      showToast('Medication added successfully');
      closeAddMedicationModal();
      renderCivMedicalTabs(); // Refresh the medical tab
    },
    error: function() {
      showToast('Error adding medication', 'error');
    }
  });
}

// Add new medical report modal
function openAddMedicalReportModal() {
  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Create modal HTML
  const modalHtml = `
    <div id="addMedicalReportModal" class="heroui-modal" style="display:flex; position:fixed; z-index:2000; left:0; top:0; width:100vw; height:100vh; background:rgba(30,32,44,0.65); align-items:center; justify-content:center;">
      <div class="heroui-modal-content" style="background:#23263a; border-radius:16px; max-width:500px; width:98%; margin:auto; box-shadow:0 8px 32px rgba(0,0,0,0.25); padding:2rem; position:relative;">
        <div style="text-align:right;margin-bottom:1.5rem;">
          <button class="heroui-modal-close" onclick="closeAddMedicalReportModal()" style="font-size:2rem;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
        </div>
        <h3 style="color:#f7fafc;margin-bottom:1.5rem;">Add New Medical Report</h3>
        <form id="addMedicalReportForm">
          <div style="margin-bottom:1rem;">
            <label for="addMedicalReportDate" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Report Date*</label>
            <input id="addMedicalReportDate" type="date" class="heroui-input" value="${currentDate}" required style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="addMedicalReportTime" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Report Time</label>
            <input id="addMedicalReportTime" type="time" class="heroui-input" value="${currentTime}" style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label for="addMedicalReportHospitalized" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Hospitalized</label>
            <select id="addMedicalReportHospitalized" class="heroui-input" style="width:100%;">
              <option value="Yes">Yes</option>
              <option value="No" selected>No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div style="margin-bottom:1rem;">
            <label for="addMedicalReportDeceased" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Deceased</label>
            <select id="addMedicalReportDeceased" class="heroui-input" style="width:100%;">
              <option value="false" selected>No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <div style="margin-bottom:1.5rem;">
            <label for="addMedicalReportDetails" style="color:#e0e7ff;font-weight:500;display:block;margin-bottom:0.5rem;">Details</label>
            <textarea id="addMedicalReportDetails" class="heroui-input" rows="4" style="width:100%;resize:vertical;"></textarea>
          </div>
          <div style="display:flex;gap:1rem;justify-content:flex-end;">
            <button type="button" onclick="closeAddMedicalReportModal()" style="background:#4a5568;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Cancel</button>
            <button type="submit" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Add Report</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to body
  $('body').append(modalHtml);
  
  // Handle form submission
  $('#addMedicalReportForm').on('submit', function(e) {
    e.preventDefault();
    addMedicalReport();
  });
}

function closeAddMedicalReportModal() {
  $('#addMedicalReportModal').remove();
}

function addMedicalReport() {
  const formData = {
    report: {
      date: $('#addMedicalReportDate').val(),
      details: $('#addMedicalReportDetails').val().trim(),
      civilianID: $('#civIdHidden').val(),
      reportingEmsID: dbUser._id,
      hospitalized: $('#addMedicalReportHospitalized').val() === 'Yes',
      deceased: $('#addMedicalReportDeceased').val() === 'true',
      activeCommunityID: dbUser?.user?.lastAccessedCommunity?.communityID,
      userID: dbUser._id,
      name: dbUser.firstName + ' ' + dbUser.lastName,
      dateOfBirth: dbUser.dateOfBirth
    }
  };
  
  $.ajax({
    url: `${API_URL}/api/v1/medical-reports`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(formData),
    success: function() {
      showToast('Medical report added successfully');
      closeAddMedicalReportModal();
      renderCivMedicalTabs(); // Refresh the medical tab
    },
    error: function() {
      showToast('Error adding medical report', 'error');
    }
  });
}

// When Records tab is shown, render the new tab
$(document).on('click', '.heroui-tab[data-tab="records"]', function() {
  setTimeout(function() {
    const civId = $('#civIdHidden').val();
    const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
    const civData = civ?.civilian || civ || {};
    // Fetch arrest reports for metrics
    fetchArrestReportsForCiv(civId, function() {
      renderCriminalHistoryTab(civData);
    });
  }, 50);
});

// --- Subscription Badge Functionality ---

function setupSubscriptionBadge() {
    const subscriptionBadge = document.getElementById('subscription-badge');
    const subscriptionText = document.getElementById('subscription-text');
    const subscriptionIcon = subscriptionBadge.querySelector('i');
    
    if (!subscriptionBadge || !subscriptionText || !subscriptionIcon) {
        // Silently handle missing elements
        return;
    }
    
    // Check if user has an active subscription
    const isSubscriptionActive = dbUser?.user?.subscription?.active === true;
    
    if (!isSubscriptionActive) {
        // No active subscription, show free badge
        subscriptionBadge.classList.remove('premium-plus', 'premium', 'basic');
        subscriptionBadge.classList.add('free');
        subscriptionText.textContent = 'Free';
        subscriptionIcon.className = 'fa fa-user';
        subscriptionBadge.style.display = 'inline-flex';
        return;
    }
    
    // Get subscription plan from dbUser
    const subscriptionPlan = dbUser?.user?.subscription?.plan || 'free';
    
    // Remove all existing classes
    subscriptionBadge.classList.remove('premium-plus', 'premium', 'basic', 'free');
    
    // Set badge content and styling based on subscription plan
    switch (subscriptionPlan.toLowerCase()) {
        case 'premium_plus':
            subscriptionBadge.classList.add('premium-plus');
            subscriptionText.innerHTML = 'Premium<span class="subscription-plus">+</span>';
            subscriptionIcon.className = 'fa fa-crown';
            break;
        case 'premium':
            subscriptionBadge.classList.add('premium');
            subscriptionText.textContent = 'Premium';
            subscriptionIcon.className = 'fa fa-star';
            break;
        case 'basic':
            subscriptionBadge.classList.add('basic');
            subscriptionText.textContent = 'Basic';
            subscriptionIcon.className = 'fa fa-check-circle';
            break;
        case 'free':
        default:
            subscriptionBadge.classList.add('free');
            subscriptionText.textContent = 'Free';
            subscriptionIcon.className = 'fa fa-user';
            break;
    }
    
    // Show the badge
    subscriptionBadge.style.display = 'inline-flex';
}

// Helper function to convert select values to string "true"/"false"
function selectToBoolString(val) {
    // Accepts "1" (yes/true), "2" (no/false), "true", "false", true, false
    if (val === "1" || val === "true" || val === true) return "true";
    if (val === "2" || val === "false" || val === false) return "false";
    return "true"; // default to true for registration/insurance
}

// Special handling for stolen status - convert to string "true"/"false" system
function selectToStolenString(val) {
    if (val === "2" || val === "true" || val === true) return "true"; // Stolen = "true"
    if (val === "1" || val === "false" || val === false) return "false"; // Not stolen = "false"
    return "false"; // default to not stolen
}