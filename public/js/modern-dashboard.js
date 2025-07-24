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
    // Load initial data
    loadCivilians();
    loadVehicles();
    loadFirearms();
    loadLicenses();
    
    // Setup subscription badge
    setupSubscriptionBadge();
    
    // Load departments
    fetchAndRenderModernDepartments();
    
    // Setup search functionality
    setupSearch();
    
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
    
    // Prevent form submission and handle edit button click
    $('#editFirearmForm').submit(function(e) {
        e.preventDefault();
        const firearmId = document.getElementById('firearmIdHidden').value;
        if (firearmId) {
            updateFirearmModern(firearmId);
        }
    });
    
    $('#firearmDetailsEditBtn').click(function() {
        const firearmId = document.getElementById('firearmIdHidden').value;
        if (firearmId) {
            updateFirearmModern(firearmId);
        } else {
            console.error('No firearm ID found');
            showToast('Error: No firearm ID found');
        }
    });
    
    $('#firearmDetailsDeleteBtn').click(function() {
        const firearmId = document.getElementById('firearmIdHidden').value;
        if (firearmId) {
            deleteFirearmModern(firearmId);
        }
    });
    
    // Setup civilian modal button handlers
    $('#civDetailsEditBtn').click(function() {
        const civId = document.getElementById('civIdHidden').value;
        if (civId) {
            updateCivModern(civId);
        }
    });
    
    $('#civDetailsDeleteBtn').click(function() {
        const civId = document.getElementById('civIdHidden').value;
        if (civId && confirm('Are you sure you want to delete this civilian? This action cannot be undone.')) {
            $.ajax({
                url: `${API_URL}/api/v1/civilian/${civId}`,
                method: 'DELETE',
                success: function() {
                    showToast('Civilian deleted successfully!');
                    closeCivDetailsModal();
                    loadCivilians();
                },
                error: function(xhr) {
                    showToast('Failed to delete civilian: ' + (xhr.responseJSON?.message || 'Unknown error'));
                }
            });
        }
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
        
        const formData = {
            serialNumber: $('#newFirearmSerial').val(),
            name: $('#newFirearmName').val(),
            weaponType: $('#newFirearmType').val(),
            caliber: $('#newFirearmCaliber').val(),
            color: $('#newFirearmColor').val(),
            isStolen: $('#newFirearmIsStolen').val(),
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
    $('#accountUsername').on('keyup', function(e) {
        if(e.target.value != dbUser.user.username && e.target.value != '') {
            $('#updateUsernameBtns').show();
        } else {
            $('#updateUsernameBtns').hide();
        }
    });
    
    $('#accountCallSign').on('keyup', function(e) {
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
            console.error('❌ Error searching civilians:', xhr);
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
            console.error('❌ Error searching vehicles:', xhr);
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
            console.error('❌ Error searching firearms:', xhr);
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
            console.error('❌ Error searching licenses:', xhr);
            renderLicenses([]);
        }
    });
}

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
            console.error('❌ Error loading civilians:', xhr);
            console.error('❌ Status:', xhr.status);
            console.error('❌ Response:', xhr.responseText);
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
            <div class="card civ-card" data-civ-index="${index}">
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
        const imageHtml = vehData.image ? `<img src="${vehData.image}" alt="Vehicle Image" style="width:100%;max-width:220px;border-radius:8px;margin-bottom:0.75rem;object-fit:cover;">` : '';
        const card = `
            <div class="card veh-card" data-veh-index="${index}">
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fa fa-car"></i>
                    </div>
                    <div>
                        <h3 class="card-title" style="font-size:1.15rem;font-weight:700;color:#f7fafc;margin-bottom:0.25rem;">${vehData.plate}</h3>
                        <p class="card-subtitle">${type}</p>
                    </div>
                </div>
                <div class="card-content">
                    ${imageHtml}
                    <p><strong>Make:</strong> ${vehData.make || 'N/A'}</p>
                    <p><strong>Model:</strong> ${vehData.model || 'N/A'}</p>
                    <p><strong>Year:</strong> ${vehData.year || 'N/A'}</p>
                    ${(vehData.isStolen === 'true' || vehData.isStolen === '2') ? '<p style="color:#ef4444; font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> STOLEN</p>' : ''}
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
        
        const card = `
            <div class="card firearm-card" data-firearm-index="${index}">
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fa fa-crosshairs"></i>
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
        console.error('Civilian details modal not found');
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
    } else {
        console.error('civTabContent-edit element not found');
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

// Open the new civilian modal
function openNewCivModal() {
    $('#newCivModal').modal('show');
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
            
            // Reset button
            $('#submitNewCiv').prop('disabled', false).html('<i class="fa fa-plus"></i> Create Civilian');
        },
        error: function(xhr) {
            console.error('❌ Error creating civilian:', xhr);
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
    if (vehData.image && vehData.image.startsWith('https://')) {
        vehImageImg.src = vehData.image;
        vehImageImg.style.display = 'block';
        vehImageIcon.style.display = 'none';
    } else {
        vehImageImg.src = '';
        vehImageImg.style.display = 'none';
        vehImageIcon.style.display = 'block';
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
    
    const data = {
        plate: $('#vehPlate').val() ? $('#vehPlate').val().trim().toUpperCase() : '',
        licensePlateState: $('#vehPlateState').val() ? $('#vehPlateState').val().trim().toUpperCase() : '',
        vin: $('#vehVin').val() ? $('#vehVin').val().trim().toUpperCase() : '',
        type: $('#vehType').val(),
        make: $('#vehMake').val() ? $('#vehMake').val().trim() : '',
        model: $('#vehModel').val() ? $('#vehModel').val().trim() : '',
        year: $('#vehYear').val(),
        color: $('#vehColor').val() ? $('#vehColor').val().trim() : '',
        // registeredOwner removed
        validRegistration: selectToBoolString($('#vehValidRegistration').val()),
        validInsurance: selectToBoolString($('#vehValidInsurance').val()),
        isStolen: selectToStolenString($('#vehIsStolen').val()),
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
    document.getElementById('createVehicleForm').reset();
    $('#newVehicleModal').modal('show');
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
        
        const data = {
            plate: $('#newVehPlate').val() ? $('#newVehPlate').val().trim().toUpperCase() : '',
            licensePlateState: $('#newVehPlateState').val() ? $('#newVehPlateState').val().trim().toUpperCase() : '',
            vin: $('#newVehVin').val() ? $('#newVehVin').val().trim().toUpperCase() : '',
            type: $('#newVehType').val(),
            make: $('#newVehMake').val() ? $('#newVehMake').val().trim() : '',
            model: $('#newVehModel').val() ? $('#newVehModel').val().trim() : '',
            year: $('#newVehYear').val(),
            color: $('#newVehColor').val() ? $('#newVehColor').val().trim() : '',
            validRegistration: selectToBoolString($('#newVehValidRegistration').val()),
            validInsurance: selectToBoolString($('#newVehValidInsurance').val()),
            isStolen: selectToStolenString($('#newVehIsStolen').val()),
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
                loadVehicles();
            },
            error: function(xhr) {
                console.error('[AddVehicle] Error creating vehicle:', xhr);
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
            
            console.error('Error fetching vehicles:', xhr.responseText);
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
        console.error(`Error fetching civilian name for ID ${civId}:`, xhr.responseText);
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
        
        console.error('Error rendering linked vehicles:', error);
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
    if (firearmData.image && firearmData.image.startsWith('https://')) {
        firearmImg.src = firearmData.image;
        firearmImg.style.display = 'block';
        firearmIcon.style.display = 'none';
    } else {
        firearmImg.src = '';
        firearmImg.style.display = 'none';
        firearmIcon.style.display = 'block';
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
    }
}

function updateFirearmModern(firearmId) {
    
    // Get form data
    const formData = {
        serialNumber: document.getElementById('firearmSerial').value,
        name: document.getElementById('firearmName').value,
        weaponType: document.getElementById('firearmType').value,
        caliber: document.getElementById('firearmCaliber').value,
        isStolen: document.getElementById('firearmIsStolen').value
    };
    

    
    // Validate required fields
    if (!formData.serialNumber || !formData.name || !formData.weaponType) {
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
            console.error('Firearm update error:', xhr);
            console.error('Status:', xhr.status);
            console.error('Response:', xhr.responseText);
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
    $('#accountEmail').val(dbUser.user.email);
    $('#accountUsername').val(dbUser.user.username);
    $('#accountCallSign').val(dbUser.user.callSign);
}

function initializeAccountSettings() {
    $('#panic-button-check-sound').prop("checked", dbUser.user.panicButtonSound);
    $('#alert-volume-slider').val(dbUser.user.alertVolumeLevel || 50);
    $('#volume-display').text(dbUser.user.alertVolumeLevel || 50);
}

function cancelUsername() {
    $('#accountUsername').val(dbUser.user.username);
    $('#updateUsernameBtns').hide();
}

function cancelCallSign() {
    $('#accountCallSign').val(dbUser.user.callSign);
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
    
    // First, fetch dispatch departments
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
            
            // Create call data
            const callData = {
                title: `911: ${location}`,
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
                    console.error('Error submitting 911 call:', xhr.responseText);
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
            console.error('Error fetching departments:', xhr.responseText);
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

function renderCriminalHistoryEntries(type, civData) {
  let html = '';
  if (type === 'Citation' || type === 'Warning') {
    const entries = (civData.criminalHistory || []).filter(e => e.type === type);
    if (entries.length === 0) {
      html = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No ${type.toLowerCase()}s found.</div>`;
    } else {
      html = entries.map(entry => `
        <div class="heroui-criminal-card" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600;font-size:1.1rem;">${entry.type}</div>
            <div style="font-size:0.95rem;color:#a0aec0;">${new Date(entry.createdAt).toLocaleDateString()}</div>
            <ul style="margin:0.5rem 0 0.5rem 1.25rem;padding:0;list-style:disc;">${(entry.fines||[]).map(fine => `<li><strong>${fine.fineType}</strong> (${fine.category}): $${fine.fineAmount}</li>`).join('')}</ul>
            <div style="font-size:0.95rem;color:#a0aec0;">${entry.notes ? `<strong>Notes:</strong> ${entry.notes}` : ''}</div>
            ${entry.redacted ? '<div style="color:#ef4444;font-weight:600;">Redacted</div>' : ''}
          </div>
          <button class="heroui-trash-btn" data-type="criminal" data-id="${entry._id}" title="Delete" style="background:none;border:none;color:#ef4444;font-size:1.5rem;cursor:pointer;"><i class="fa fa-trash"></i></button>
        </div>
      `).join('');
    }
  } else if (type === 'Arrest') {
    const entries = cachedArrestReports || [];
    if (entries.length === 0) {
      html = `<div style="color:#a0aec0;text-align:center;padding:2rem 0;">No arrest reports found.</div>`;
    } else {
      html = entries.map(entry => `
        <div class="heroui-criminal-card" style="background:#23263a;border-radius:10px;padding:1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px 0 rgba(30,32,44,0.10);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600;font-size:1.1rem;">Arrest Report</div>
            <div style="font-size:0.95rem;color:#a0aec0;">${new Date(entry.arrestDate).toLocaleDateString()}</div>
            <div style="font-size:0.95rem;color:#a0aec0;"><strong>Charges:</strong> ${entry.charges || 'N/A'}</div>
            <div style="font-size:0.95rem;color:#a0aec0;"><strong>Location:</strong> ${entry.arrestLocation || 'N/A'}</div>
          </div>
          <button class="heroui-trash-btn" data-type="arrest" data-id="${entry._id}" title="Delete" style="background:none;border:none;color:#ef4444;font-size:1.5rem;cursor:pointer;"><i class="fa fa-trash"></i></button>
        </div>
      `).join('');
    }
  }
  $('#criminalHistoryContentArea').html(html);
}

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
      cachedArrestReports = (data.data || []).map(r => r.arrestReport || r);
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

// Delete logic
$(document).on('click', '.heroui-trash-btn', function() {
  const type = $(this).data('type');
  const id = $(this).data('id');
  const civId = $('#civIdHidden').val();
  if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
  if (type === 'criminal') {
    $.ajax({
      url: `${API_URL}/api/v1/civilian/${civId}/criminal-history/${id}`,
      method: 'DELETE',
      success: function() {
        // Remove from UI
        const civ = lastRenderedCivilians.find(c => (c._id === civId || (c.civilian && c.civilian._id === civId)));
        const civData = civ?.civilian || civ || {};
        civData.criminalHistory = (civData.criminalHistory || []).filter(e => e._id !== id);
        renderCriminalHistoryTab(civData);
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
        renderCriminalHistoryTab(civData);
      },
      error: function() {
        showToast('Failed to delete arrest report.');
      }
    });
  }
});

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
        console.error('Subscription badge elements not found');
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