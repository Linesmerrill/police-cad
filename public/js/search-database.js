// static/js/search-database.js
$(document).ready(function () {
  let searchType = "Civilian";
  let searchQuery = "";
  let searchResults = [];
  let suggestions = [];
  let recentSearches = [];
  let ownerCache = {};
  let currentPage = 1;
  const resultsPerPage = 4;
  const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

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

    let url;
    const params = new URLSearchParams({
      limit: resultsPerPage,
      page: isSuggestion ? 0 : currentPage - 1,
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
        let results = response || [];
        if (searchType === "Civilian") {
          results = response || [];
        } else if (searchType === "Vehicle") {
          results = response.vehicles || [];
        } else if (searchType === "Firearm") {
          results = response.firearms || [];
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
        alert(
          "Failed to search: " + (xhr.responseJSON?.message || "Unknown error")
        );
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
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const paginatedResults = searchResults.slice(start, end);

    const $results = $("#searchResults");
    $results.empty();
    if (searchResults.length > 0) {
      paginatedResults.forEach((item) =>
        $results.append(renderItem(item, false))
      );
    } else {
      $results.html('<p class="text-gray">No results found.</p>');
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
      subtitle = `DOB: ${item.civilian?.birthday || "Unknown"} | Status: ${
        item.civilian?.warrants?.length > 0 ? "Active Warrant" : "No Warrants"
      }`;
      recentSearchQuery = title;
    } else if (searchType === "Vehicle") {
      title = item.vehicle
        ? `${item.vehicle.make || ""} ${item.vehicle.model || ""} (${
            item.vehicle.year || "Unknown"
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
      isStolen =
        item.vehicle?.isStolen === true || item.vehicle?.isStolen === "true";
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
        item.firearm?.isStolen === true || item.firearm?.isStolen === "true";
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

  // Update pagination
  function updatePagination() {
    const totalPages = Math.ceil(searchResults.length / resultsPerPage);
    const $pagination = $("#searchResultsPagination");
    $pagination.empty();

    $pagination.append(`
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" onclick="changeSearchPage(${
          currentPage - 1
        })">Previous</a>
      </li>
    `);

    for (let i = 1; i <= totalPages; i++) {
      $pagination.append(`
        <li class="page-item ${i === currentPage ? "active" : ""}">
          <a class="page-link" href="#" onclick="changeSearchPage(${i})">${i}</a>
        </li>
      `);
    }

    $pagination.append(`
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link" href="#" onclick="changeSearchPage(${
          currentPage + 1
        })">Next</a>
      </li>
    `);
  }

  // Change search results page
  function changeSearchPage(page) {
    if (page < 1 || page > Math.ceil(searchResults.length / resultsPerPage))
      return;
    currentPage = page;
    fetchSearchResults(searchQuery, false);
  }

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
        fetchSearchResults(searchQuery, false);
      }
    });

  $("#searchButton").on("click", function () {
    fetchSearchResults(searchQuery, false);
  });

  $("#clearRecentSearches").on("click", clearRecentSearches);

  $(document).on("click", ".recent-search", function () {
    const query = $(this).data("query");
    const type = $(this).data("type");
    setSearchType(type);
    searchQuery = query;
    $("#searchQuery").val(query);
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
    console.log("Search modal opening, cleaned up other modals.");
  });

  // Set search type and reset state
  function setSearchType(type) {
    searchType = type;
    searchQuery = "";
    searchResults = [];
    suggestions = [];
    currentPage = 1;
    $("#searchQuery").val("");
    $("#searchSuggestions").hide();
    renderResults();
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
    $("#validRegView").val(item.vehicle?.isRegistered ? "1" : "2");
    $("#validInsView").val(item.vehicle?.isInsured ? "1" : "2");
    $("#stolenView").val(item.vehicle?.isStolen ? "2" : "1");
    $("#vehicleID").val(item._id);
  }

  function populateFirearmDetails(item) {
    // Implement based on #viewFirearm modal fields
    // Example: $('#serialNum').val(item.firearm?.serialNumber || '');
  }
});
