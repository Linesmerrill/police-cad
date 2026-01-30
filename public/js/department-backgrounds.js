// Department Background Image System
// This file provides consistent background image functionality for all department dashboards

// Department background image mapping
const departmentBackgrounds = {
  'civilian': '/static/images/civ-bkground.jpg',
  'police': '/static/images/police-corner-bg.jpg',
  'dispatch': '/static/images/dispatch-corner-bg2.jpg',
  'ems': '/static/images/ems-bkground.jpg',
  'fire': '/static/images/fire-ems-corner-bg.jpg'
};

// Function to set department background
function setDepartmentBackground(departmentType, customImageUrl = null) {
  let backgroundImage;
  
  // Use custom image if provided, otherwise use default
  if (customImageUrl && customImageUrl.trim() !== '') {
    backgroundImage = customImageUrl;
  } else {
    backgroundImage = departmentBackgrounds[departmentType] || departmentBackgrounds['civilian'];
  }
  
  // Update CSS custom property
  document.documentElement.style.setProperty('--department-bg-image', `url('${backgroundImage}')`);
  
  // Add department class to body for additional styling
  document.body.classList.remove('department-civilian', 'department-police', 'department-dispatch', 'department-ems', 'department-fire');
  document.body.classList.add(`department-${departmentType}`);
}

// Function to detect current department from URL
function detectCurrentDepartment() {
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('police-dashboard')) {
    return 'police';
  } else if (currentPath.includes('dispatch-dashboard')) {
    return 'dispatch';
  } else if (currentPath.includes('ems-dashboard')) {
    return 'ems';
  } else if (currentPath.includes('civ-dashboard')) {
    return 'civilian';
  }
  
  // Default to civilian
  return 'civilian';
}

// Function to detect current department from user role
function detectDepartmentFromRole(userRole) {
  if (!userRole) return 'civilian';
  
  const role = userRole.toLowerCase();
  
  if (role.includes('police') || role.includes('officer')) {
    return 'police';
  } else if (role.includes('dispatch') || role.includes('dispatcher')) {
    return 'dispatch';
  } else if (role.includes('ems') || role.includes('paramedic') || role.includes('fire')) {
    return 'ems';
  } else if (role.includes('civilian') || role.includes('citizen')) {
    return 'civilian';
  }
  
  return 'civilian';
}

// Function to fetch department data and get custom image
async function fetchDepartmentBackground(departmentType) {
  try {
    // Check if we have user data and community info
    if (typeof dbUser === 'undefined' || !dbUser.user || !dbUser.user.lastAccessedCommunity) {
      return null;
    }

    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    const API_URL = 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
    
    // Fetch departments for the community
    const response = await fetch(`${API_URL}/api/v1/community/${communityId}/departments`);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const departments = data.departments || [];
    
    // Find the department that matches the current dashboard type
    const currentDepartment = departments.find(dept => {
      const template = dept?.template?.name?.toLowerCase() || '';
      return template.includes(departmentType);
    });
    
    // Return the custom image if available
    if (currentDepartment && currentDepartment.image && currentDepartment.image.trim() !== '') {
      return currentDepartment.image;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching department background:', error);
    return null;
  }
}

// Function to initialize department background
async function initializeDepartmentBackground() {
  // Try to detect from URL first
  let department = detectCurrentDepartment();
  
  // If we're on a dashboard page, try to get custom image
  if (department !== 'civilian') {
    const customImage = await fetchDepartmentBackground(department);
    setDepartmentBackground(department, customImage);
    return;
  }
  
  // Otherwise, try to detect from user role if available
  if (typeof dbUser !== 'undefined' && dbUser.user && dbUser.user.role) {
    department = detectDepartmentFromRole(dbUser.user.role);
    const customImage = await fetchDepartmentBackground(department);
    setDepartmentBackground(department, customImage);
  } else {
    setDepartmentBackground(department);
  }
}

// Function to manually set department background (for programmatic use)
function setDepartmentBackgroundManually(departmentType, customImageUrl = null) {
  if (departmentBackgrounds[departmentType]) {
    setDepartmentBackground(departmentType, customImageUrl);
  } else {
    console.warn(`Unknown department type: ${departmentType}`);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeDepartmentBackground();
});

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setDepartmentBackground,
    detectCurrentDepartment,
    detectDepartmentFromRole,
    fetchDepartmentBackground,
    initializeDepartmentBackground,
    setDepartmentBackgroundManually
  };
} 