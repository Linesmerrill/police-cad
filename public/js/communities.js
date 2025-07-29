const { useState, useEffect } = React;
// Remove: import Autocomplete from "@heroui/autocomplete";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

const mockNotifications = [
  {
    id: "notif1",
    title: "New Community Invite",
    message: "You've been invited to join Lines Police CAD!",
    timestamp: "2025-05-23T14:30:00Z",
    isRead: false,
  },
  {
    id: "notif2",
    title: "Event Reminder",
    message: "Yacht Party starts in 1 hour.",
    timestamp: "2025-05-23T13:00:00Z",
    isRead: true,
  },
  {
    id: "notif3",
    title: "Status Update",
    message: "Your status was updated to 10-8 by Dispatch.",
    timestamp: "2025-05-23T12:15:00Z",
    isRead: false,
  },
];

const Navbar = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    // {
    //   id: "notif1",
    //   title: "New Community Invite",
    //   message: "You've been invited to join Lines Police CAD!",
    //   timestamp: "2025-05-23T14:30:00Z",
    //   isRead: false,
    // },
    // {
    //   id: "notif2",
    //   title: "Event Reminder",
    //   message: "Yacht Party starts in 1 hour.",
    //   timestamp: "2025-05-23T13:00:00Z",
    //   isRead: true,
    // },
    // {
    //   id: "notif3",
    //   title: "Status Update",
    //   message: "Your status was updated to 10-8 by Dispatch.",
    //   timestamp: "2025-05-23T12:15:00Z",
    //   isRead: false,
    // },
  ]);
  const [notifPage, setNotifPage] = useState(1);
  const notifsPerPage = 5;

  const toggleNotifPopout = () => setIsNotifOpen(!isNotifOpen);

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const paginatedNotifs = notifications.slice(
    (notifPage - 1) * notifsPerPage,
    notifPage * notifsPerPage
  );

  return (
    <nav className="bg-gray-900 shadow-lg fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <img
                src="/static/images/favicon-32x32.png"
                alt="LPC Logo"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-white">
                Lines Police CAD
              </span>
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="/communities"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
            >
              Communities
            </a>
            <div className="relative">
              <button
                onClick={toggleNotifPopout}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md relative"
              >
                {/* <ion-icon
                  name="notifications-outline"
                  class="text-2xl"
                ></ion-icon> */}
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">
                      Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-gray-400 text-center">
                      No notifications
                    </p>
                  ) : (
                    <>
                      {paginatedNotifs.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-700 hover:bg-gray-700 ${
                            notification.isRead ? "opacity-75" : ""
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-300">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(
                                  notification.timestamp
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  Mark as Read
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteNotification(notification.id)
                                }
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-4 flex justify-between items-center border-t border-gray-700">
                        <button
                          onClick={() =>
                            setNotifPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={notifPage === 1}
                          className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-400">
                          Page {notifPage} of{" "}
                          {Math.ceil(notifications.length / notifsPerPage)}
                        </span>
                        <button
                          onClick={() => setNotifPage((prev) => prev + 1)}
                          disabled={
                            notifPage * notifsPerPage >= notifications.length
                          }
                          className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* <a
              href="/profile"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
            >
              <ion-icon
                name="person-circle-outline"
                class="text-2xl"
              ></ion-icon>
            </a> */}
          </div>
        </div>
      </div>
    </nav>
  );
};

function encodeCommunityId(communityId) {
  const base64 = btoa(communityId);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const Carousel = ({ communities, totalCount, onPrev, onNext, currentPage }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % communities.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [communities]);

  if (!communities.length) return null;

  const community = communities[current];

  return (
    <div className="w-full flex justify-center items-center py-8 z-0 mt-24">
      <div className="relative max-w-xl w-full mx-auto z-0 min-h-[420px] md:min-h-[480px] flex items-center justify-center">
        {/* Removed background gradient for mobile and desktop */}
        {/* Card content with swipe animation */}
        <div className="relative bg-gray-800 rounded-3xl shadow-2xl pt-20 pb-10 px-8 flex flex-col items-center text-center border border-gray-700 z-10 w-[400px] md:w-[500px] min-h-[520px] md:min-h-[600px] justify-center"
          style={{
            boxShadow: '0 12px 48px 0 rgba(124, 58, 237, 0.25), 0 2px 12px 0 rgba(0,0,0,0.18)',
            minHeight: '520px',
            maxHeight: '600px',
            height: '600px',
          }}>
          {/* Floating image */}
          <img
            src={community.imageLink || "/static/images/default-logo.png"}
            alt={community.name}
            className="w-44 h-44 object-contain rounded-2xl shadow-lg bg-gray-900 border border-gray-700 absolute left-1/2 -top-16 -translate-x-1/2"
            style={{ background: '#181e2a' }}
          />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 mt-8 break-words max-w-full leading-tight">{community.name}</h2>
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {community.tags && community.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-blue-700 text-blue-100 text-xs px-2 py-1 rounded-full uppercase tracking-wide font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-blue-300 text-base font-semibold mb-2">{community.promotionalText}</p>
          <p className="text-gray-300 mb-4 text-sm md:text-base">{community.promotionalDescription}</p>
          <p className="text-gray-400 mb-4">{community.membersCount} Members</p>
          <button
            onClick={() => window.location.href = `/community/${encodeCommunityId(community._id)}`}
            className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-blue-700 transition mb-2"
          >
            View Community
          </button>
          {/* Navigation Arrows */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
            <button
              onClick={() => {
                setDirection(-1);
                setCurrent((current - 1 + communities.length) % communities.length);
              }}
              className="bg-gray-700 text-white p-2 rounded-full shadow hover:bg-gray-600 focus:outline-none"
              aria-label="Previous"
            >
              <ion-icon name="chevron-back-outline" class="text-2xl"></ion-icon>
            </button>
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
            <button
              onClick={() => {
                setDirection(1);
                setCurrent((current + 1) % communities.length);
              }}
              className="bg-gray-700 text-white p-2 rounded-full shadow hover:bg-gray-600 focus:outline-none"
              aria-label="Next"
            >
              <ion-icon name="chevron-forward-outline" class="text-2xl"></ion-icon>
            </button>
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {communities.map((_, idx) => (
              <span
                key={idx}
                className={`w-3 h-3 rounded-full ${idx === current ? "bg-blue-600" : "bg-gray-500"} inline-block`}
              ></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommunityCard = ({ community, isActive, actionText, onAction }) => (
  <div className="card bg-gray-800 rounded-lg shadow-lg flex flex-col h-61 w-80 mx-2">
    <img
      src={community?.imageLink || "/static/images/default-logo.png"}
      alt={community?.name}
      className="w-5/6 h-1/3 mx-auto rounded-t-lg object-cover"
    />
    <div className="p-4 flex flex-col flex-grow justify-between">
      <div>
        <h3 className="text-xl font-semibold text-white truncate text-center">
          {community?.name}
        </h3>
        <p className="text-gray-400 mt-2 text-center">
          {community?.membersCount} Members
        </p>
        {isActive && (
          <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded-full mt-2 mx-auto">
            Active
          </span>
        )}
      </div>
      <button
        onClick={() => onAction(community)}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
      >
        {actionText}
      </button>
    </div>
  </div>
);

const CommunitySection = ({
  title,
  communities,
  actionText,
  onAction,
  cardsPerView = 3,
  onPrevPage,
  onNextPage,
  currentPage,
  totalCount,
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const maxIndex = Math.max(0, communities.length - cardsPerView);

  // Set a default actionText if not provided
  const buttonLabel = actionText && actionText.trim() !== '' ? actionText : 'View';

  const scrollNext = () =>
    setStartIndex((prev) => Math.min(prev + cardsPerView, maxIndex));
  const scrollPrev = () =>
    setStartIndex((prev) => Math.max(prev - cardsPerView, 0));

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white mb-6">{title}</h2>
        <div className="relative">
          <div className="flex overflow-x-auto scroll-container">
            {communities
              .slice(startIndex, startIndex + cardsPerView)
              .map((community) => (
                <CommunityCard
                  key={community._id}
                  community={community}
                  isActive={community.isActive}
                  actionText={buttonLabel}
                  onAction={(community) => (window.location.href = `/community/${encodeCommunityId(community._id)}`)}
                />
              ))}
          </div>
          {startIndex > 0 && (
            <button
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-2 rounded-full"
            >
              <ion-icon name="chevron-back-outline"></ion-icon>
            </button>
          )}
          {startIndex < maxIndex && (
            <button
              onClick={scrollNext}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-2 rounded-full"
            >
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </button>
          )}
        </div>
        {totalCount > cardsPerView && (
          <div className="flex justify-center mt-4 space-x-4">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="bg-gray-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-300">
              Page {currentPage} of {Math.ceil(totalCount / cardsPerView)}
            </span>
            <button
              onClick={onNextPage}
              disabled={currentPage * cardsPerView >= totalCount}
              className="bg-gray-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const BrowseCommunities = ({
  communities,
  totalCount,
  currentTag,
  setCurrentTag,
  onPrevPage,
  onNextPage,
  currentPage,
  fetchAllCommunitiesPage,
}) => {
  const [filteredCommunities, setFilteredCommunities] = useState(communities);
  const tags = ["all", "PC", "Xbox", "PlayStation"];

  useEffect(() => {
    setFilteredCommunities(communities);
  }, [communities]);

  const handleTagChange = (tag) => {
    setCurrentTag(tag);
    fetchAllCommunitiesPage(tag, 0);
  };

  const cardsPerView =
    window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2;

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white mb-6">
          Browse Communities
        </h2>
        <div className="flex space-x-4 mb-6">
          {tags.map((t) => (
            <button
              key={t}
              className={`px-4 py-2 rounded-full ${
                currentTag === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
              onClick={() => handleTagChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <CommunitySection
          title=""
          communities={filteredCommunities}
          //   actionText="Explore"
          actionText=""
          onAction={(community) => (window.location.href = `/community/${encodeCommunityId(community._id)}`)}
          cardsPerView={cardsPerView}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
          currentPage={currentPage + 1}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
};

// CommunitySearchBar: HeroUI Free style search bar for communities
const CommunitySearchBar = ({ onCreateCommunity }) => {
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [noResults, setNoResults] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const debounceTimeout = React.useRef();
  const inputRef = React.useRef();

  const fetchCommunities = (query) => {
    if (!query) {
      setOptions([]);
      setNoResults(false);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/api/v1/search/communities?q=${encodeURIComponent(query)}&limit=6&page=1`)
      .then((res) => res.json())
      .then((data) => {
        const communities = (data.data || []).map((item) => {
          const c = item.community || item;
          const subscription = c.subscription || {};
          const isVerified =
            ["elite", "premium", "standard"].includes(subscription.plan) && subscription.active === true;
          return {
            id: item._id,
            name: c.name,
            image: c.imageLink || "/static/images/default-logo.png",
            description: c.promotionalText || c.promotionalDescription || c.description || "",
            _id: item._id,
            isVerified,
          };
        });
        setOptions(communities);
        setNoResults(communities.length === 0);
        setShowDropdown(true);
        setLoading(false);
      })
      .catch(() => {
        setOptions([]);
        setNoResults(true);
        setShowDropdown(true);
        setLoading(false);
      });
  };

  // Debounce input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchCommunities(value);
    }, 300);
  };

  // Handle selection
  const handleSelection = (selected) => {
    setShowDropdown(false);
    setInputValue("");
    setOptions([]);
    if (selected && selected._id) {
      window.location.href = `/community/${encodeCommunityId(selected._id)}`;
    }
  };

  // Hide dropdown on outside click
  React.useEffect(() => {
    const handleClick = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Add authentication check function
  const handleCreateCommunity = () => {
    if (!dbUser || !dbUser._id) {
      // User not logged in, redirect to login with return URL
      window.location.href = '/login-civ?redirect=' + encodeURIComponent('/communities');
      return;
    }
    // User is logged in, open the modal
    onCreateCommunity();
  };

  return (
    <div className="w-full flex justify-center py-8 bg-gray-900 z-10">
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-4 mx-auto" ref={inputRef}>
        <div className="flex-grow flex justify-center relative min-w-0">
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg shadow pr-12"
            placeholder="Search for a community..."
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue && setShowDropdown(true)}
          />
          {loading && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </span>
          )}
          {showDropdown && (
            <div
              className="absolute left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-30 max-h-80 overflow-y-auto"
              style={{ top: '100%' }}
            >
              {loading ? (
                <div className="p-4 text-gray-400 text-center">Searching...</div>
              ) : noResults ? (
                <div className="p-4 text-gray-400 text-center">No communities found</div>
              ) : (
                options.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleSelection(item)}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded object-cover border border-gray-700 bg-gray-800"
                    />
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1">
                        {item.name}
                        {item.isVerified && (
                          <svg viewBox="0 0 24 24" className="w-5 h-5 inline-block ml-1" style={{ verticalAlign: 'middle' }}>
                            <circle cx="12" cy="12" r="10" fill="#eab308" />
                            <path d="M8 12.5l3 3 5-5" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button
          id="create-community-btn"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow transition whitespace-nowrap min-w-[160px] w-auto sm:ml-4"
          style={{ marginRight: 0 }}
          onClick={handleCreateCommunity}
        >
          <i className="fa fa-plus"></i> Create a New Community
        </button>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="bg-gray-900 text-gray-300 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="flex flex-col items-center md:items-start">
          <img
            src="https://www.linespolice-cad.com/static/images/lpc_logo_new_2023_landscape_transparent.png"
            alt="LPC Logo"
            className="w-full max-w-xs mb-4"
          />
          <p className="text-center md:text-left">
            World's Leading Free-to-use role-play facilitator
          </p>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <h2 className="text-lg font-semibold text-white mb-4">Information</h2>
          <a
            href="https://github.com/Linesmerrill/police-cad/releases"
            className="hover:text-white mb-2"
          >
            Release Log
          </a>
          <a
            href="https://linesmerrill.github.io/MerrillLines/"
            className="hover:text-white mb-2"
          >
            Developers
          </a>
          <a
            href="https://www.patreon.com/linespolicecad"
            target="_blank"
            className="hover:text-white mb-2"
          >
            Patreon
          </a>
          <a
            href="https://github.com/linesmerrill/police-cad"
            target="_blank"
            className="hover:text-white"
          >
            GitHub
          </a>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <h2 className="text-lg font-semibold text-white mb-4">About</h2>
          <a href="/faq" className="hover:text-white mb-2">
            FAQ
          </a>
          <a href="/contact-us" className="hover:text-white mb-2">
            Contact Us
          </a>
          <a href="/terms-and-conditions" className="hover:text-white mb-2">
            Terms and Conditions
          </a>
          <a href="/privacy-policy" className="hover:text-white">
            Privacy Policy
          </a>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <h2 className="text-lg font-semibold text-white mb-4">Follow</h2>
          <a
            href="https://discord.gg/3ECFhqe"
            target="_blank"
            className="hover:text-white mb-2"
          >
            Discord
          </a>
          <a
            href="https://twitter.com/LinesPoliceCAD"
            target="_blank"
            className="hover:text-white mb-2"
          >
            Twitter
          </a>
          <a
            href="https://www.facebook.com/linespoliceserver/"
            target="_blank"
            className="hover:text-white"
          >
            Facebook
          </a>
        </div>
      </div>
      <div className="mt-12 text-center">
        <p className="text-gray-400">
          ©2023 by{" "}
          <a
            href="https://sites.google.com/view/tlps-dev/home"
            target="_blank"
            className="hover:text-white"
          >
            TLPS
          </a>{" "}
          All Rights Reserved
        </p>
      </div>
    </div>
  </footer>
);

const modalEventName = "open-create-community-modal";

// Toast component for notifications
const Toast = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto dismiss after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-500 text-white';
      case 'error':
        return 'bg-red-600 border-red-500 text-white';
      default:
        return 'bg-blue-600 border-blue-500 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'fa-check-circle';
      case 'error':
        return 'fa-exclamation-circle';
      default:
        return 'fa-info-circle';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[2300] animate-slide-in">
      <div className={`flex items-center p-4 rounded-lg shadow-lg border ${getToastStyles()} min-w-[300px] max-w-[400px]`}>
        <i className={`fa ${getIcon()} text-lg mr-3`}></i>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 text-white/80 hover:text-white transition-colors"
        >
          <i className="fa fa-times"></i>
        </button>
      </div>
    </div>
  );
};

const CreateCommunityModal = ({ isOpen, onClose, toast, setToast }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "public",
    tags: [],
    imageLink: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ownedCommunityCount, setOwnedCommunityCount] = useState(0);
  const [userPlan, setUserPlan] = useState("free");

  // Fetch user's owned communities count and subscription plan
  useEffect(() => {
    if (isOpen && dbUser?._id) {
      fetchUserData();
    }
  }, [isOpen, dbUser?._id]);

  const fetchUserData = async () => {
    try {
      // Fetch user's owned communities using the correct endpoint
      const response = await fetch(`${API_URL}/api/v1/communities/${dbUser._id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          `Failed to fetch owned communities. \n\nMessage: ${JSON.stringify(
            data
          )}. \nCode: ${response.status}`
        );
      }

      const data = await response.json();
      const ownedCommunities = data || [];
      setOwnedCommunityCount(ownedCommunities.length);

      // Get user's subscription plan
      const plan = dbUser?.user?.subscription?.plan || "free";
      setUserPlan(plan);
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Set default values on error
      setOwnedCommunityCount(0);
      setUserPlan("free");
    }
  };

  // Plan limits and features mapping
  const PLAN_LIMITS = {
    base: 5,
    premium: 10,
    premium_plus: Infinity
  };
  const PLAN_FEATURES = {
    base: "Create up to 5 communities",
    premium: "Create up to 10 communities",
    premium_plus: "Unlimited communities"
  };

  const getCommunityLimit = (plan) => PLAN_LIMITS[plan] ?? 1;
  const getPlanFeature = (plan) => PLAN_FEATURES[plan] ?? "Create up to 1 community";

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // For now, we'll use a placeholder. In production, you'd upload to a service
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, imageLink: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Community name is required");
      return;
    }

    if (!formData.description.trim()) {
      setError("Community description is required");
      return;
    }

    const communityLimit = getCommunityLimit(userPlan);
    
    if (communityLimit !== Infinity && ownedCommunityCount >= communityLimit) {
      setError(`Your current subscription (${userPlan}) allows you to create up to ${communityLimit} communit${communityLimit === 1 ? "y" : "ies"}. Upgrade your subscription to create more.`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const communityData = {
        ownerID: dbUser._id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        imageLink: formData.imageLink || "/static/images/default-logo.png",
        visibility: formData.visibility,
        tags: formData.tags,
        promotionalText: "",
        promotionalDescription: ""
      };

      const response = await fetch(`${API_URL}/api/v1/community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ community: communityData }),
      });

      if (!response.ok) {
        throw new Error("Failed to create community");
      }

      const result = await response.json();
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        visibility: "public",
        tags: [],
        imageLink: ""
      });
      
      // Show success toast
      setToast({
        message: `Community "${formData.name}" created successfully!`,
        type: "success",
        isVisible: true
      });
      
      // Close modal
      onClose();
      
      // Refresh communities after a short delay to show the toast
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error("Error creating community:", error);
      setError("Failed to create community. Please try again.");
      
      // Show error toast
      setToast({
        message: "Failed to create community. Please try again.",
        type: "error",
        isVisible: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const communityLimit = getCommunityLimit(userPlan);
  const canCreateMore = ownedCommunityCount < communityLimit;

  return (
    <div
      className="fixed z-[2200] left-0 top-0 w-screen h-screen bg-[rgba(30,32,44,0.65)] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ zIndex: 2200 }}
    >
      <div
        className="bg-[#23263a] rounded-2xl max-w-md w-full mx-auto shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 2210 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <button
            onClick={onClose}
            className="text-white text-2xl hover:text-gray-300"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <h2 className="text-xl font-bold text-white">Create A Community</h2>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Community Banner */}
          <div className="relative">
            <div className="w-full h-48 bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center overflow-hidden">
              {formData.imageLink ? (
                <img 
                  src={formData.imageLink} 
                  alt="Community Banner" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <i className="fa fa-image text-4xl mb-2"></i>
                  <p>Community Banner</p>
                </div>
              )}
            </div>
            <label className="absolute bottom-3 right-3 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
              <i className="fa fa-camera"></i>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Community Name */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Community Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter community name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              placeholder="Describe your community"
            />
          </div>

          {/* Community Privacy */}
          <div>
            <div className="flex items-center mb-3">
              <label className="block text-white text-sm font-medium">
                Community Privacy
              </label>
              <div className="relative ml-2 group">
                <i className="fa fa-info-circle text-gray-400 text-sm cursor-help"></i>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 border border-gray-700">
                  <div className="mb-1"><strong>Public:</strong> Anyone can search and find your community</div>
                  <div><strong>Private:</strong> People can only join via an invite link</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => handleInputChange("visibility", "public")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.visibility === "public"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => handleInputChange("visibility", "private")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.visibility === "private"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {/* Platform Tags */}
          <div>
            <div className="flex items-center mb-3">
              <label className="block text-white text-sm font-medium">
                Platform Tags
              </label>
              <div className="relative ml-2 group">
                <i className="fa fa-info-circle text-gray-400 text-sm cursor-help"></i>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 border border-gray-700 max-w-xs">
                  You can optionally select one or many tags - these help people find platform specific communities
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-xs mb-3">optional</p>
            <div className="flex flex-wrap gap-2">
              {["Xbox", "PlayStation", "PC"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.tags.includes(tag)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Subscription Info */}
          {!canCreateMore && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm mb-3">
                {error || `You've reached your community limit (${communityLimit === Infinity ? "unlimited" : communityLimit}). Upgrade your subscription to create more.`}
              </p>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Open iOS App Store
                      window.open('https://apps.apple.com/us/app/lpc-app/id6503307483', '_blank');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center flex-1"
                  >
                    <i className="fa fa-apple mr-2"></i>
                    App Store
                  </button>
                  <button
                    onClick={() => {
                      // Open Google Play Store
                      window.open('https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp', '_blank');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center flex-1"
                  >
                    <i className="fa fa-google mr-2"></i>
                    Google Play
                  </button>
                </div>
                <p className="text-gray-400 text-xs text-center mt-2">
                  Download the mobile app to upgrade
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && canCreateMore && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Community Count Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-300 text-sm">
              You have created {ownedCommunityCount} of {communityLimit === Infinity ? "unlimited" : communityLimit} allowed communit{communityLimit === 1 ? "y" : "ies"} 
              ({userPlan} plan)
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {getPlanFeature(userPlan)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !canCreateMore}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              isLoading || !canCreateMore
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <i className="fa fa-spinner fa-spin mr-2"></i>
                Creating...
              </span>
            ) : (
              "Create Community"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [eliteCommunities, setEliteCommunities] = useState([]);
  const [userCommunities, setUserCommunities] = useState([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [elitePage, setElitePage] = useState(0);
  const [eliteTotalCount, setEliteTotalCount] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [recommendedTotalCount, setRecommendedTotalCount] = useState(0);
  const [recommendedPage, setRecommendedPage] = useState(0);
  const [allCommunitiesTotalCount, setAllCommunitiesTotalCount] = useState(0);
  const [allCommunitiesPage, setAllCommunitiesPage] = useState(0);
  const [currentTag, setCurrentTag] = useState("all");
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success", isVisible: false });

  useEffect(() => {
    // Fetch elite communities
    axios
      .get(`${API_URL}/api/v2/communities/elite?limit=5&page=0`)
      .then((response) => {
        const communities = response.data.data
          .map((item) => ({
            _id: item._id,
            name: item.name,
            promotionalText: item.promotionalText,
            promotionalDescription: item.promotionalDescription,
            tags: item.tags || [],
            imageLink:
              item.imageLink && item.imageLink.includes("file:///")
                ? "/static/images/default-logo.png"
                : item.imageLink || "/static/images/default-logo.png",
            membersCount: item.membersCount,
            code: item._id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setEliteCommunities(communities);
        setEliteTotalCount(response.data.totalCount || 0);
      })
      .catch((error) => {
        console.error("Error fetching elite communities:", error);
        setEliteCommunities([]);
        setEliteTotalCount(0);
      });

    // Fetch user communities
    if (dbUser && dbUser._id) {
      axios
        .get(
          `${API_URL}/api/v2/user/${dbUser._id}/communities?filter=status:approved&limit=3&page=1`
        )
        .then((response) => {
          const communities = response.data.data || [];
          setUserTotalCount(response.data.totalCount || 0);
          const mappedCommunities = communities.map((item) => ({
            _id: item._id,
            name: item.name,
            membersCount: item.membersCount,
            isActive:
              item._id === dbUser.user.lastAccessedCommunity?.communityID,
            code: item._id,
            imageLink:
              item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
                ? "/static/images/default-logo.png"
                : item.imageLink || "/static/images/default-logo.png",
          }));
          setUserCommunities(mappedCommunities);
        })
        .catch((error) => {
          console.error("Error fetching user communities:", error);
          setUserCommunities([]);
          setUserTotalCount(0);
        });
    }

    // Fetch recommended communities
    if (dbUser && dbUser._id) {
      axios
        .get(
          `${API_URL}/api/v2/user/${dbUser._id}/prioritized-communities?limit=3&page=0`
        )
        .then((response) => {
          const communities = response.data.data.map((item) => ({
            _id: item._id,
            name: item.name,
            promotionalText: item.promotionalText,
            promotionalDescription: item.promotionalDescription,
            tags: item.tags || [],
            imageLink:
              item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
                ? "/static/images/default-logo.png"
                : item.imageLink || "/static/images/default-logo.png",
            membersCount: item.membersCount,
            code: item._id,
          }));
          setRecommendedCommunities(communities);
          setRecommendedTotalCount(response.data.totalCount || 0);
        })
        .catch((error) => {
          console.error("Error fetching discover communities:", error);
          setRecommendedCommunities([]);
          setRecommendedTotalCount(0);
        });
    } else {
      setRecommendedCommunities([]);
      setRecommendedTotalCount(0);
    }

    axios
      .get(`${API_URL}/api/v2/communities/tag/all?limit=4&page=0`)
      .then((response) => {
        const communities = response.data.data.map((item) => ({
          _id: item._id,
          name: item.name,
          promotionalText: item.promotionalText,
          promotionalDescription: item.promotionalDescription,
          tags: item.tags || [],
          imageLink:
            item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
              ? "/static/images/default-logo.png"
              : item.imageLink || "/static/images/default-logo.png",
          membersCount: item.membersCount,
          code: item._id,
        }));
        setAllCommunities(communities);
        setAllCommunitiesTotalCount(response.data.totalCount || 0);
      })
      .catch((error) => {
        console.error("Error fetching browse communities:", error);
        setAllCommunities([]);
        setAllCommunitiesTotalCount(0);
      });

    // Listen for global event to open modal (for EJS link)
    const handler = () => setShowCreateCommunityModal(true);
    window.addEventListener(modalEventName, handler);
    return () => window.removeEventListener(modalEventName, handler);
  }, []);

  const fetchElitePage = (page) => {
    axios
      .get(`${API_URL}/api/v2/communities/elite?limit=5&page=${page}`)
      .then((response) => {
        const communities = response.data.data
          .map((item) => ({
            _id: item._id,
            name: item.community?.name,
            promotionalText: item.community?.promotionalText,
            promotionalDescription: item.community?.promotionalDescription,
            tags: item.community?.tags || [],
            imageLink:
              item.community?.imageLink && item.community?.imageLink.includes("file:///")
                ? "/static/images/default-logo.png"
                : item.community?.imageLink || "/static/images/default-logo.png",
            membersCount: item.community?.membersCount,
            code: item._id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setEliteCommunities(communities);
        setElitePage(page);
      })
      .catch((error) => {
        console.error("Error fetching elite communities page:", error);
        setEliteCommunities([]);
      });
  };

  const fetchUserPage = (page) => {
    axios
      .get(
        `${API_URL}/api/v2/user/${dbUser._id}/communities?filter=status:approved&limit=3&page=${page}`
      )
      .then((response) => {
        const communities = response.data.data || [];
        setUserTotalCount(response.data.totalCount || 0);
        const mappedCommunities = communities.map((item) => ({
          _id: item._id,
          name: item.name,
          membersCount: item.membersCount,
          isActive: item._id === dbUser.user.lastAccessedCommunity?.communityID,
          code: item._id,
          imageLink:
            item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
              ? "/static/images/default-logo.png"
              : item.imageLink || "/static/images/default-logo.png",
        }));
        setUserCommunities(mappedCommunities);
        setUserPage(page);
      })
      .catch((error) => {
        console.error("Error fetching user communities:", error);
        setUserCommunities([]);
        setUserTotalCount(0);
      });
  };

  const fetchRecommendedPage = (page) => {
    axios
      .get(
        `${API_URL}/api/v2/user/${dbUser._id}/prioritized-communities?limit=3&page=${page}`
      )
      .then((response) => {
        const communities = response.data.data.map((item) => ({
          _id: item._id,
          name: item.name,
          promotionalText: item.promotionalText,
          promotionalDescription: item.promotionalDescription,
          tags: item.tags || [],
          imageLink:
            item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
              ? "/static/images/default-logo.png"
              : item.imageLink || "/static/images/default-logo.png",
          membersCount: item.membersCount,
          code: item._id,
        }));
        setRecommendedCommunities(communities);
        setRecommendedPage(page);
      })
      .catch((error) => {
        console.error("Error fetching discover communities page:", error);
        setRecommendedCommunities([]);
      });
  };

  const fetchAllCommunitiesPage = (tag, page) => {
    axios
      .get(`${API_URL}/api/v2/communities/tag/${tag}?limit=4&page=${page}`)
      .then((response) => {
        const communities = response.data.data.map((item) => ({
          _id: item._id,
          name: item.name,
          promotionalText: item.promotionalText,
          promotionalDescription: item.promotionalDescription,
          tags: item.tags || [],
          imageLink:
            item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
              ? "/static/images/default-logo.png"
              : item.imageLink || "/static/images/default-logo.png",
          membersCount: item.membersCount,
          code: item._id,
        }));
        setAllCommunities(communities);
        setAllCommunitiesTotalCount(response.data.totalCount || 0);
        setAllCommunitiesPage(page);
      })
      .catch((error) => {
        console.error("Error fetching browse communities page:", error);
        setAllCommunities([]);
        setAllCommunitiesTotalCount(0);
      });
  };

  const handleRecommendedPrevPage = () => {
    if (recommendedPage > 0) {
      fetchRecommendedPage(recommendedPage - 1);
    }
  };

  const handleRecommendedNextPage = () => {
    if (recommendedPage * 3 + 3 < recommendedTotalCount) {
      fetchRecommendedPage(recommendedPage + 1);
    }
  };

  const handleAllCommunitiesPrevPage = () => {
    if (allCommunitiesPage > 0) {
      fetchAllCommunitiesPage(currentTag, allCommunitiesPage - 1);
    }
  };

  const handleAllCommunitiesNextPage = () => {
    if (allCommunitiesPage * 4 + 4 < allCommunitiesTotalCount) {
      fetchAllCommunitiesPage(currentTag, allCommunitiesPage + 1);
    }
  };

  const handleElitePrevPage = () => {
    if (elitePage > 0) {
      fetchElitePage(elitePage - 1);
    }
  };

  const handleEliteNextPage = () => {
    if (elitePage * 5 < eliteTotalCount) {
      fetchElitePage(elitePage + 1);
    }
  };

  const handleUserPrevPage = () => {
    if (userPage > 1) {
      fetchUserPage(userPage - 1);
    }
  };

  const handleUserNextPage = () => {
    if (userPage * 3 < userTotalCount) {
      fetchUserPage(userPage + 1);
    }
  };

  return (
    <div className="min-h-screen">
      <CreateCommunityModal isOpen={showCreateCommunityModal} onClose={() => setShowCreateCommunityModal(false)} toast={toast} setToast={setToast} />
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
      <div className="">
        {/* HeroUI Pro Search Bar */}
        <CommunitySearchBar onCreateCommunity={() => setShowCreateCommunityModal(true)} />
        {eliteCommunities.length > 0 && (
          <Carousel
            communities={eliteCommunities}
            totalCount={eliteTotalCount}
            onPrev={handleElitePrevPage}
            onNext={handleEliteNextPage}
            currentPage={elitePage}
          />
        )}
        {dbUser && dbUser._id && (
          <CommunitySection
            title="Your Communities"
            communities={userCommunities}
            actionText="Jump In"
            onAction={(community) => (window.location.href = `/communities`)}
            cardsPerView={3}
            onPrevPage={handleUserPrevPage}
            onNextPage={handleUserNextPage}
            currentPage={userPage}
            totalCount={userTotalCount}
          />
        )}
        {dbUser && dbUser._id && (
          <CommunitySection
            title="Discover Communities"
            communities={recommendedCommunities}
            actionText=""
            onAction={(community) => (window.location.href = `#`)}
            cardsPerView={3}
            onPrevPage={handleRecommendedPrevPage}
            onNextPage={handleRecommendedNextPage}
            currentPage={recommendedPage + 1}
            totalCount={recommendedTotalCount}
          />
        )}
        <BrowseCommunities
          communities={allCommunities}
          totalCount={allCommunitiesTotalCount}
          currentTag={currentTag}
          setCurrentTag={setCurrentTag}
          onPrevPage={handleAllCommunitiesPrevPage}
          onNextPage={handleAllCommunitiesNextPage}
          currentPage={allCommunitiesPage}
          fetchAllCommunitiesPage={fetchAllCommunitiesPage}
        />
        <Footer />
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
