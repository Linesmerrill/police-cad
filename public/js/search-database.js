// static/js/search-database.js
$(document).ready(function () {
  let searchType = "Civilian";
  let searchQuery = "";
  let searchResults = [];
  let suggestions = [];
  let recentSearches = [];
  let ownerCache = {};
  let currentPage = 1;
  let totalPages = 1;
  let totalResults = 0;
  const resultsPerPage = 5;
  const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

  // Initialize recent searches
  loadRecentSearches();

  // Load recent searches from localStorage
  function loadRecentSearches() {
    const stored = localStorage.getItem("recentSearches");
    recentSearches = stored ? JSON.parse(stored) : [];
    renderRecentSearches();
  }

  // Save recent searches to localStorage
  function saveRecentSearch(query, type) {
    const newSearch = { query, type, timestamp: Date.now() };
    recentSearches = [
      newSearch,
      ...recentSearches.filter((s) => s.query !== query || s.type !== type),
    ].slice(0, 5);
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
    renderRecentSearches();
  }

  // Clear recent searches
  function clearRecentSearches() {
    if (confirm("Are you sure you want to clear all recent searches?")) {
      recentSearches = [];
      localStorage.removeItem("recentSearches");
      renderRecentSearches();
    }
  }

  // Debounced suggestion fetch
  const updateSuggestions = _.debounce(function (query) {
    if (!query.trim()) {
      suggestions = [];
      renderSuggestions();
      return;
    }
    fetchSearchResults(query, true);
  }, 300);

  // Fetch search results or suggestions
  function fetchSearchResults(query, isSuggestion = false) {
    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    if (!communityId) {
      alert("No active community selected.");
      return;
    }

    // Show loading state for main searches (not suggestions)
    if (!isSuggestion) {
      $("#searchResults").html('<div class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p class="text-gray mt-2">Searching...</p></div>');
      $("#searchResultsPagination").empty();
    }

    let url;
    const params = new URLSearchParams({
      limit: resultsPerPage,
      page: isSuggestion ? 0 : currentPage - 1, // API uses 0-based pagination
    });

    if (searchType === "Civilian") {
      params.append("name", encodeURIComponent(query));
      params.append("active_community_id", communityId);
      url = `${API_URL}/api/v1/civilians/search?${params.toString()}`;
    } else if (searchType === "Vehicle") {
      params.append("plate", query);
      params.append("vin", query);
      params.append("make", query);
      params.append("model", query);
      params.append("active_community_id", communityId);
      url = `${API_URL}/api/v1/vehicles/search?${params.toString()}`;
    } else if (searchType === "Firearm") {
      params.append("name", query);
      params.append("serialNumber", query);
      params.append("communityId", communityId);
      url = `${API_URL}/api/v1/firearms/search?${params.toString()}`;
    }

    $.ajax({
      url,
      method: "GET",
      headers: { "Content-Type": "application/json" },
      success: function (response) {
        let results = [];
        let paginationData = {};
        
        // Handle different API response structures
        if (searchType === "Civilian") {
          results = response || [];
          // Check if response has pagination metadata
          if (response && typeof response === 'object' && !Array.isArray(response)) {
            results = response.data || response.results || [];
            paginationData = {
              totalPages: response.totalPages || response.total_pages || 1,
              totalResults: response.totalResults || response.total_results || response.total || results.length,
              currentPage: response.currentPage || response.current_page || currentPage
            };
          }
        } else if (searchType === "Vehicle") {
          results = response.vehicles || response.data || [];
          // Always try to extract pagination data from response
          paginationData = {
            totalPages: response.totalPages || Math.ceil((response.total || results.length) / resultsPerPage),
            totalResults: response.total || results.length,
            currentPage: response.page !== undefined ? response.page + 1 : currentPage // Convert 0-based to 1-based
          };
        } else if (searchType === "Firearm") {
          results = response.firearms || response.data || [];
          // Always try to extract pagination data from response
          paginationData = {
            totalPages: response.totalPages || Math.ceil((response.total || results.length) / resultsPerPage),
            totalResults: response.total || results.length,
            currentPage: response.page !== undefined ? response.page + 1 : currentPage // Convert 0-based to 1-based
          };
        }

        // Update pagination state
        if (paginationData.totalResults !== undefined) {
          totalResults = paginationData.totalResults;
          totalPages = paginationData.totalPages;
          currentPage = paginationData.currentPage;
        } else {
          // Fallback: estimate pagination based on results
          const hasMoreResults = results.length === resultsPerPage;
          totalPages = hasMoreResults ? currentPage + 1 : currentPage;
          totalResults = (totalPages - 1) * resultsPerPage + results.length;
        }

        // Ensure we have valid values
        totalPages = Math.max(1, totalPages);
        totalResults = Math.max(0, totalResults);
        currentPage = Math.max(1, Math.min(currentPage, totalPages));

        // Special case: if we have total results but no results on this page,
        // we might be on a page that doesn't exist, so adjust
        if (totalResults > 0 && results.length === 0 && currentPage > 1) {
          // Check if we're beyond the last page
          const actualTotalPages = Math.ceil(totalResults / resultsPerPage);
          if (currentPage > actualTotalPages) {
            currentPage = actualTotalPages;
            // Re-fetch the correct page
            fetchSearchResults(searchQuery, false);
            return;
          }
        }

        // Fetch owner names for Vehicle and Firearm
        fetchOwnerNames(results, function () {
          if (isSuggestion) {
            suggestions = results;
            renderSuggestions();
          } else {
            searchResults = results;
            renderResults();
          }
        });
      },
      error: function (xhr) {
        console.error("Search error:", xhr.responseText);
        const errorMessage = xhr.responseJSON?.message || "Unknown error";
        
        if (!isSuggestion) {
          $("#searchResults").html(`<div class="alert alert-danger">Failed to search: ${errorMessage}</div>`);
          $("#searchResultsPagination").empty();
        }
        
        // Don't show alert for suggestions, only for main searches
        if (!isSuggestion) {
          alert("Failed to search: " + errorMessage);
        }
      },
    });
  }

  // Fetch owner names
  function fetchOwnerNames(items, callback) {
    const newOwnerCache = { ...ownerCache };
    const ajaxRequests = items
      .map((item) => {
        let linkedCivID =
          searchType === "Vehicle"
            ? item.vehicle?.linkedCivilianID
            : item.firearm?.linkedCivilianID;
        if (linkedCivID && !newOwnerCache[linkedCivID]) {
          return $.ajax({
            url: `${API_URL}/api/v1/civilian/${linkedCivID}`,
            method: "GET",
            success: function (response) {
              const name =
                response.civilian?.name ||
                `${response.civilian?.firstName || ""} ${
                  response.civilian?.lastName || ""
                }`.trim();
              newOwnerCache[linkedCivID] = name || "Unknown";
            },
            error: function (xhr) {
              console.error(
                `Error fetching owner for ID ${linkedCivID}:`,
                xhr.responseText
              );
              newOwnerCache[linkedCivID] = "Unknown";
            },
          });
        }
        return null; // No request needed if no linkedCivID or already cached
      })
      .filter((request) => request !== null);

    if (ajaxRequests.length === 0) {
      ownerCache = newOwnerCache;
      callback();
      return;
    }

    $.when
      .apply($, ajaxRequests)
      .done(function () {
        ownerCache = newOwnerCache;
        callback();
      })
      .fail(function () {
        console.error("One or more owner name requests failed");
        ownerCache = newOwnerCache;
        callback();
      });
  }

  // Render suggestions
  function renderSuggestions() {
    const $suggestions = $("#searchSuggestions");
    $suggestions.empty();
    if (suggestions.length > 0) {
      suggestions.forEach((item) =>
        $suggestions.append(renderItem(item, true))
      );
      $suggestions.show();
    } else {
      $suggestions.hide();
    }
  }

  // Render search results
  function renderResults() {
    const $results = $("#searchResults");
    $results.empty();
    
    if (searchResults.length > 0) {
      searchResults.forEach((item) =>
        $results.append(renderItem(item, false))
      );
    } else {
      // Show different messages based on whether a search was performed
      if (searchQuery.trim()) {
        if (totalResults > 0) {
          // We have total results but no results on this page
          $results.html(`
            <div class="text-center">
              <i class="fa fa-search fa-2x text-gray mb-2"></i>
              <p class="text-gray">No ${searchType.toLowerCase()}s found on page ${currentPage}</p>
              <small class="text-muted">Try navigating to a different page</small>
            </div>
          `);
        } else {
          // No results at all
          $results.html(`
            <div class="text-center">
              <i class="fa fa-search fa-2x text-gray mb-2"></i>
              <p class="text-gray">No ${searchType.toLowerCase()}s found matching "${searchQuery}"</p>
              <small class="text-muted">Try adjusting your search terms or search type</small>
            </div>
          `);
        }
      } else {
        $results.html(`
          <div class="text-center">
            <i class="fa fa-info-circle fa-2x text-gray mb-2"></i>
            <p class="text-gray">Enter a search term to find ${searchType.toLowerCase()}s</p>
          </div>
        `);
      }
    }

    updatePagination();
  }

  // Render a single item (suggestion or result)
  function renderItem(item, isSuggestion) {
    let title = "",
      subtitle = "",
      owner = "",
      isStolen = false,
      id = item._id;
    let recentSearchQuery = searchQuery;

    if (searchType === "Civilian") {
      title = item.civilian?.name || "Unknown";
      const hasWarrants = item.civilian?.warrants?.length > 0;
      subtitle = `DOB: ${item.civilian?.birthday || "Unknown"} | Status: ${
        hasWarrants ? '<span style="color: #ef4444; font-weight: bold;">Active Warrant</span>' : "No Warrants"
      }`;
      recentSearchQuery = title;
    } else if (searchType === "Vehicle") {
      title = item.vehicle
        ? `${item.vehicle.make || ""} ${item.vehicle.model || ""} (${
            item.vehicle.type || "Unknown"
          })`.trim()
        : "Unknown Vehicle";
      subtitle = item.vehicle
        ? `VIN: ${item.vehicle.vin || "Unknown"} | Plate: ${
            item.vehicle.plate || "Unknown"
          }`
        : "Details Unavailable";
      owner = item.vehicle?.linkedCivilianID
        ? `Owner: ${ownerCache[item.vehicle.linkedCivilianID] || "Unknown"}`
        : "";
      isStolen = item.vehicle?.isStolen === 'true' || item.vehicle?.isStolen === '2';
      recentSearchQuery =
        item.vehicle?.make || item.vehicle?.plate || searchQuery;
    } else if (searchType === "Firearm") {
      title = item.firearm?.serialNumber || "Unknown";
      subtitle = item.firearm
        ? `${item.firearm.name || "Unknown"} | Caliber: ${
            item.firearm.caliber || "Unknown"
          }`
        : "Details Unavailable";
      owner = item.firearm?.linkedCivilianID
        ? `Owner: ${ownerCache[item.firearm.linkedCivilianID] || "Unknown"}`
        : "";
      isStolen =
        item.firearm?.isStolen === true || item.firearm?.isStolen === "true" || item.firearm?.isStolen === "2";
      recentSearchQuery =
        item.firearm?.name || item.firearm?.serialNumber || searchQuery;
    }

    return `
    <div class="search-item" data-id="${id}" data-query="${recentSearchQuery.replace(/'/g, "\\'")}">
      <div class="d-flex justify-content-between align-items-center">
        <span>${title}</span>
        ${isStolen ? '<span class="badge-stolen">Stolen</span>' : ""}
      </div>
      <p class="text-gray mb-0">${subtitle}</p>
      ${owner ? `<p class="text-gray mb-0">${owner}</p>` : ""}
    </div>
  `;
  }

  // Handle item selection
  function selectSearchItem(id, recentSearchQuery) {
    const item = [...suggestions, ...searchResults].find((i) => i._id === id);
    if (!item) return;

    suggestions = [];
    $("#searchSuggestions").hide();
    searchResults = [item];
    currentPage = 1;
    renderResults();
    saveRecentSearch(recentSearchQuery, searchType);

    // Open details modal
    showDetailsModal(item, searchType);
  }

  // Add click handler for search items
  $(document).on("click", ".search-item", function () {
    const id = $(this).data("id");
    const query = $(this).data("query");
    selectSearchItem(id, query);
  });

  // Render recent searches
  function renderRecentSearches() {
    const $container = $("#recentSearchesContainer");
    const $recent = $("#recentSearches");
    $recent.empty();
    if (recentSearches.length > 0) {
      recentSearches.forEach((search) => {
        $recent.append(`
          <div class="recent-search" data-query="${search.query}" data-type="${search.type}">
            <span class="text-white">${search.query}</span>
            <small class="text-gray">${search.type}</small>
          </div>
        `);
      });
      $container.show();
    } else {
      $container.hide();
    }
  }

  // Enhanced pagination with proper controls
  function updatePagination() {
    const $pagination = $("#searchResultsPagination");
    $pagination.empty();

    // Only show pagination if we have results or if we're on a page with no results but there are total results
    if (searchResults.length === 0 && totalResults === 0) {
      return;
    }

    // Show results count
    const startResult = (currentPage - 1) * resultsPerPage + 1;
    const endResult = Math.min(currentPage * resultsPerPage, totalResults);
    
    // Only show results count if we have total results
    if (totalResults > 0) {
      $pagination.append(`
        <div class="pagination-info mb-2">
          <small class="text-muted">
            Showing ${startResult}-${endResult} of ${totalResults} results
          </small>
        </div>
      `);
    }

    // Create pagination controls
    const $paginationList = $('<ul class="pagination justify-content-center"></ul>');
    
    // Previous button
    $paginationList.append(`
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" onclick="changeSearchPage(${currentPage - 1})" ${currentPage === 1 ? 'tabindex="-1"' : ''}>
          <i class="fa fa-chevron-left"></i> Previous
        </a>
      </li>
    `);

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page and ellipsis
    if (startPage > 1) {
      $paginationList.append(`
        <li class="page-item">
          <a class="page-link" href="#" onclick="changeSearchPage(1)">1</a>
        </li>
      `);
      if (startPage > 2) {
        $paginationList.append(`
          <li class="page-item disabled">
            <span class="page-link">...</span>
          </li>
        `);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      $paginationList.append(`
        <li class="page-item ${i === currentPage ? "active" : ""}">
          <a class="page-link" href="#" onclick="changeSearchPage(${i})">${i}</a>
        </li>
      `);
    }

    // Last page and ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        $paginationList.append(`
          <li class="page-item disabled">
            <span class="page-link">...</span>
          </li>
        `);
      }
      $paginationList.append(`
        <li class="page-item">
          <a class="page-link" href="#" onclick="changeSearchPage(${totalPages})">${totalPages}</a>
        </li>
      `);
    }

    // Next button
    $paginationList.append(`
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link" href="#" onclick="changeSearchPage(${currentPage + 1})" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>
          Next <i class="fa fa-chevron-right"></i>
        </a>
      </li>
    `);

    $pagination.append($paginationList);
  }

  // Change search results page
  function changeSearchPage(page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    // Make a new API call for the requested page
    fetchSearchResults(searchQuery, false);
  }

  // Make changeSearchPage globally available
  window.changeSearchPage = changeSearchPage;

  // Event handlers
  $("#searchTypeCivilian").on("click", function () {
    setSearchType("Civilian");
  });
  $("#searchTypeVehicle").on("click", function () {
    setSearchType("Vehicle");
  });
  $("#searchTypeFirearm").on("click", function () {
    setSearchType("Firearm");
  });

  $("#searchQuery")
    .on("input", function () {
      searchQuery = $(this).val();
      updateSuggestions(searchQuery);
    })
    .on("keypress", function (e) {
      if (e.which === 13) {
        currentPage = 1; // Reset to first page for new searches
        fetchSearchResults(searchQuery, false);
      }
    });

  $("#searchButton").on("click", function () {
    currentPage = 1; // Reset to first page for new searches
    fetchSearchResults(searchQuery, false);
  });

  $("#clearRecentSearches").on("click", clearRecentSearches);

  $(document).on("click", ".recent-search", function () {
    const query = $(this).data("query");
    const type = $(this).data("type");
    setSearchType(type);
    searchQuery = query;
    $("#searchQuery").val(query);
    currentPage = 1; // Reset to first page for recent searches
    fetchSearchResults(query, false);
  });

  // Add to $(document).ready in search-database.js
  $("#searchDatabaseModal").on("show.bs.modal", function () {
    $("body").removeClass("modal-open");
    $(".modal-backdrop").remove();
    $(".modal")
      .not("#searchDatabaseModal")
      .modal("hide")
      .removeData("bs.modal");
    // Initialize recent searches when modal opens
    loadRecentSearches();
  });

  // Set search type and reset state
  function setSearchType(type) {
    searchType = type;
    searchQuery = "";
    searchResults = [];
    suggestions = [];
    currentPage = 1;
    totalPages = 1;
    totalResults = 0;
    $("#searchQuery").val("");
    $("#searchSuggestions").hide();
    $("#searchResults").empty();
    $("#searchResultsPagination").empty();
    $(".search-type-btn").removeClass("active");
    $(`#searchType${type}`).addClass("active");
    $("#searchQuery").attr("placeholder", `Search ${type}s...`);
  }

  // Placeholder detail population functions
  function populateCivilianDetails(item) {
    // Implement based on #viewCiv modal fields
    $("#civ-first-name").val(item.civilian?.firstName || "");
    $("#civ-last-name").val(item.civilian?.lastName || "");
    $("#civ-dob").val(item.civilian?.birthday || "");
    // Add other fields as needed
  }

  function populateVehicleDetails(item) {
    // Implement based on #viewVeh modal fields
    $("#vinVeh").val(item.vehicle?.vin || "");
    $("#roVeh").val(ownerCache[item.vehicle?.linkedCivilianID] || "");
    $("#plateVeh").val(item.vehicle?.plate || "");
    $("#modelVeh").val(item.vehicle?.model || "");
    $("#colorView").val(item.vehicle?.color || "");
    // Convert to string "true"/"false" system for registration
    const isValidRegistration = item.vehicle?.validRegistration === "1" || item.vehicle?.validRegistration === "true";
    $("#validRegView").val(isValidRegistration ? "true" : "false");
    
    // Convert to string "true"/"false" system for insurance
    const isValidInsurance = item.vehicle?.validInsurance === "1" || item.vehicle?.validInsurance === "true";
    $("#validInsView").val(isValidInsurance ? "true" : "false");
    // Convert to string "true"/"false" system
    const isStolen = item.vehicle?.isStolen === "2" || item.vehicle?.isStolen === "true";
    $("#stolenView").val(isStolen ? "true" : "false");
    $("#vehicleID").val(item._id);
  }

  function populateFirearmDetails(item) {
    // Implement based on #viewFirearm modal fields
    // Example: $('#serialNum').val(item.firearm?.serialNumber || '');
  }

  function showSearchDatabaseModal(value) {
    // Map searchType to button IDs
    const buttonMap = {
      Civilian: "#searchTypeCivilian",
      Vehicle: "#searchTypeVehicle",
      Firearm: "#searchTypeFirearm",
    };

    // Set search type input
    $("#searchType").val(value);

    // Clean up modal state
    $("body").removeClass("modal-open");
    $(".modal-backdrop").remove();
    $(".modal")
      .not("#searchDatabaseModal")
      .modal("hide")
      .removeData("bs.modal");

    // Update button states
    const buttonId = buttonMap[value];
    if (buttonId) {
      $(".search-type-btn").removeClass("active");
      $(buttonId).addClass("active");
      // Trigger click to update UI (if needed)
      $(buttonId).trigger("click");
    } else {
      console.warn("No button mapped for searchType:", value);
    }

    // Show modal
    $("#searchDatabaseModal")
      .modal("show")
      .one("shown.bs.modal", function () {});
  }

  $(".search-type-btn").on("click", function () {
    const type = $(this).data("type");
    $(".search-type-btn").removeClass("active");
    $(this).addClass("active");
    $("#searchType").val(type);
  });

  window.showSearchDatabaseModal = showSearchDatabaseModal;
});
