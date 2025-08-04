const { useState, useEffect } = React;
// Remove: import Autocomplete from "@heroui/autocomplete";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

// Loading Spinner Component
const LoadingSpinner = ({ size = "md", text = "Loading..." }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-700 border-t-blue-500`}></div>
      <p className="text-gray-400 mt-4 text-lg">{text}</p>
    </div>
  );
};

// Loading Skeleton for Community Cards
const CommunityCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col h-full animate-pulse">
    <div className="h-48 bg-gray-700"></div>
    <div className="p-6 flex flex-col flex-grow">
      <div className="h-6 bg-gray-700 rounded mb-2"></div>
      <div className="h-4 bg-gray-700 rounded mb-3 w-3/4"></div>
      <div className="flex gap-2 mb-3">
        <div className="h-6 bg-gray-700 rounded-full w-16"></div>
        <div className="h-6 bg-gray-700 rounded-full w-20"></div>
      </div>
      <div className="h-4 bg-gray-700 rounded mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      <div className="mt-auto pt-4">
        <div className="h-12 bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  </div>
);

// Loading Skeleton for Carousel
const CarouselSkeleton = () => (
  <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 mt-24">
    <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%239C92AC\\" fill-opacity=\\"0.05\\"%3E%3Ccircle cx=\\"30\\" cy=\\"30\\" r=\\"2\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="h-12 bg-gray-700 rounded mb-4 mx-auto w-96 animate-pulse"></div>
        <div className="h-6 bg-gray-700 rounded mx-auto w-80 animate-pulse"></div>
      </div>
      
      <div className="w-full flex justify-center items-center py-8 z-0">
        <div className="relative max-w-4xl w-full mx-auto z-0 flex items-center justify-center">
          <div className="relative bg-gray-800 rounded-3xl shadow-2xl pt-16 pb-10 px-8 flex flex-col items-center text-center border border-gray-700 z-10 w-[400px] md:w-[500px] min-h-[520px] md:min-h-[600px] justify-center animate-pulse">
            <div className="w-56 h-56 md:w-64 md:h-64 bg-gray-700 rounded-2xl mb-6"></div>
            <div className="h-8 bg-gray-700 rounded mb-2 w-3/4"></div>
            <div className="flex gap-2 mb-3">
              <div className="h-6 bg-gray-700 rounded-full w-16"></div>
              <div className="h-6 bg-gray-700 rounded-full w-20"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded mb-2 w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="h-12 bg-gray-700 rounded-full w-48 mt-4"></div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-700 p-2 rounded-lg w-12 h-12"></div>
              <div>
                <div className="h-8 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// HeroUI Pro Components
const HeroSection = ({ children, className = "" }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 ${className}`}>
    <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%239C92AC\\" fill-opacity=\\"0.05\\"%3E%3Ccircle cx=\\"30\\" cy=\\"30\\" r=\\"2\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </div>
);

const SectionDivider = ({ title, subtitle, icon, className = "" }) => (
  <div className={`relative py-12 ${className}`}>
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-700"></div>
    </div>
    <div className="relative flex justify-center">
      <div className="bg-gray-900 px-6 py-3 rounded-full border border-gray-700 shadow-lg">
        <div className="flex items-center space-x-3">
          {icon && <i className={`${icon} text-blue-400 text-xl`}></i>}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdBanner = ({ type = "horizontal", className = "" }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  if (!isVisible) return null;
  
  const handleUpgradeClick = () => {
    setShowComingSoon(true);
  };
  
  const ComingSoonModal = () => {
    if (!showComingSoon) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-4 border border-gray-700 shadow-xl">
          <div className="text-center">
            <div className="bg-yellow-600 p-3 rounded-full w-fit mx-auto mb-4">
              <i className="fa fa-tools text-white text-2xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Coming Soon!</h3>
            <p className="text-gray-300 mb-6">
              We're currently working on the premium upgrade features. You can access these features in our mobile app right now!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowComingSoon(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
              >
                Got it
              </button>
              <button
                onClick={() => {
                  setShowComingSoon(false);
                  // You can add mobile app download link here
                  window.open('https://apps.apple.com', '_blank');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
              >
                <i className="fa fa-mobile-alt mr-2"></i>
                Get Mobile App
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (type === "vertical") {
    return (
      <>
        <div className={`bg-gradient-to-b from-blue-900 to-purple-900 rounded-lg p-4 border border-blue-700 shadow-lg ${className}`}>
          <div className="text-center">
            <i className="fa fa-star text-yellow-400 text-2xl mb-2"></i>
            <h4 className="text-white font-semibold text-sm mb-1">Premium Feature</h4>
            <p className="text-blue-200 text-xs mb-3">Upgrade to Pro for advanced features</p>
            <button 
              onClick={handleUpgradeClick}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full transition-colors"
            >
              Learn More
            </button>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xs"
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
        <ComingSoonModal />
      </>
    );
  }
  
  return (
    <>
      <div className={`bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 rounded-lg p-6 border border-blue-700 shadow-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <i className="fa fa-rocket text-yellow-400 text-2xl"></i>
            <div>
              <h4 className="text-white font-semibold">Boost Your Community</h4>
              <p className="text-blue-200 text-sm">Get featured placement and premium features</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleUpgradeClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Upgrade Now
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              <i className="fa fa-times"></i>
            </button>
          </div>
        </div>
      </div>
      <ComingSoonModal />
    </>
  );
};

const StatsCard = ({ icon, value, label, color = "blue" }) => (
  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg">
    <div className="flex items-center space-x-3">
      <div className={`bg-${color}-600 p-2 rounded-lg`}>
        <i className={`${icon} text-white text-lg`}></i>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-gray-400 text-sm">{label}</div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, description, color = "blue" }) => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
    <div className={`bg-${color}-600 p-3 rounded-lg w-fit mb-4`}>
      <i className={`${icon} text-white text-xl`}></i>
    </div>
    <h4 className="text-white font-semibold text-lg mb-2">{title}</h4>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

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
  // Use the same encoding as the server-side encodeId function
  // For simple ASCII strings like MongoDB ObjectIds, btoa should work fine
  const base64 = btoa(communityId);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const Carousel = ({ communities, totalCount, onPrev, onNext, currentPage, isLoading = false }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev

  useEffect(() => {
    if (!isLoading && communities.length > 0) {
      const interval = setInterval(() => {
        setDirection(1);
        setCurrent((prev) => (prev + 1) % communities.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [communities, isLoading]);

  if (isLoading) {
    return <CarouselSkeleton />;
  }

  if (!communities.length) return null;

  const community = communities[current];

  return (
    <HeroSection className="mt-24">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Elite Communities
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Discover the most prestigious and active communities on our platform
        </p>
      </div>
      
      <div className="w-full flex justify-center items-center py-8 z-0">
        <div className="relative max-w-4xl w-full mx-auto z-0 flex items-center justify-center">
          {/* Enhanced Card with more content */}
          <div className="relative bg-gray-800 rounded-3xl shadow-2xl pt-16 pb-10 px-8 flex flex-col items-center text-center border border-gray-700 z-10 w-[400px] md:w-[500px] min-h-[520px] md:min-h-[600px] justify-center"
            style={{
              boxShadow: '0 12px 48px 0 rgba(124, 58, 237, 0.25), 0 2px 12px 0 rgba(0,0,0,0.18)',
              minHeight: '520px',
              maxHeight: '600px',
              height: '600px',
            }}>
            {/* Elite Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full font-bold text-sm shadow-lg">
              <i className="fa fa-crown mr-1"></i>
              ELITE
            </div>
            
            {/* Image positioned above community name */}
            <img
              src={community.imageLink || "/static/images/default-logo.png"}
              alt={community.name}
              className="w-56 h-56 md:w-64 md:h-64 object-contain rounded-2xl shadow-lg bg-gray-900 border border-gray-700 mb-6"
              style={{ background: '#181e2a' }}
            />
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 break-words max-w-full leading-tight">{community.name}</h2>
            
            {/* Enhanced Tags */}
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {community.tags && community.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full uppercase tracking-wide font-semibold shadow-md"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {/* Promotional Text with Icon */}
            {community.promotionalText && (
              <div className="flex items-center justify-center mb-2">
                <i className="fa fa-star text-yellow-400 mr-2"></i>
                <p className="text-blue-300 text-base font-semibold">{community.promotionalText}</p>
              </div>
            )}
            
            {/* Description */}
            <p className="text-gray-300 mb-4 text-sm md:text-base leading-relaxed">{community.promotionalDescription}</p>
            
            {/* Enhanced Stats */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="flex items-center text-gray-400">
                <i className="fa fa-users mr-1"></i>
                <span className="text-sm">{community.membersCount} Members</span>
              </div>
              <div className="flex items-center text-green-400">
                <i className="fa fa-circle mr-1 text-xs"></i>
                <span className="text-sm">Active</span>
              </div>
            </div>
            
            {/* Enhanced CTA Button */}
            <button
              onClick={() => window.location.href = `/community/${encodeCommunityId(community._id)}`}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 mb-4"
            >
              <i className="fa fa-arrow-right mr-2"></i>
              Explore Community
            </button>
            
            {/* Navigation Arrows */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <button
                onClick={() => {
                  setDirection(-1);
                  setCurrent((current - 1 + communities.length) % communities.length);
                }}
                className="bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-600 focus:outline-none transition-colors"
                aria-label="Previous"
              >
                <ion-icon name="chevron-back-outline" class="text-2xl"></ion-icon>
              </button>
            </div>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <button
                onClick={() => {
                  setDirection(1);
                  setCurrent((current + 1) % communities.length);
                }}
                className="bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-600 focus:outline-none transition-colors"
                aria-label="Next"
              >
                <ion-icon name="chevron-forward-outline" class="text-2xl"></ion-icon>
              </button>
            </div>
            
            {/* Enhanced Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {communities.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${idx === current ? "bg-blue-600 scale-125" : "bg-gray-500"} inline-block`}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <StatsCard 
          icon="fa fa-users" 
          value={totalCount} 
          label="Total Elite Communities" 
          color="blue" 
        />
        <StatsCard 
          icon="fa fa-star" 
          value="Premium" 
          label="Featured Status" 
          color="yellow" 
        />
        <StatsCard 
          icon="fa fa-shield-alt" 
          value="Verified" 
          label="Quality Assured" 
          color="green" 
        />
      </div>
    </HeroSection>
  );
};

const CommunityCard = ({ community, isActive, actionText, onAction }) => (
  <div className="card bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 overflow-hidden flex flex-col h-full">
    {/* Image Container */}
    <div className="relative h-48 overflow-hidden">
      <img
        src={community?.imageLink || "/static/images/default-logo.png"}
        alt={community?.name}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
      {/* Overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
      
      {/* Subscription Badge for communities with active promotions */}
      {(community?.subscription?.active === true && ["elite", "premium", "standard", "basic"].includes(community?.subscription?.plan)) || community?.promotionalText ? (
        <div className="absolute top-3 left-3">
          {(() => {
            const plan = community?.subscription?.plan;
            console.log('Community:', community?.name, 'Plan:', plan, 'Subscription:', community?.subscription, 'Promotional:', community?.promotionalText);
            
            if (plan === "elite") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-crown mr-1"></i>
                  ELITE
                </span>
              );
            } else if (plan === "premium") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-purple-400 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-star mr-1"></i>
                  PREMIUM
                </span>
              );
            } else if (plan === "standard") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-check-circle mr-1"></i>
                  STANDARD
                </span>
              );
            } else if (plan === "basic") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-green-400 to-teal-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-user mr-1"></i>
                  BASIC
                </span>
              );
            } else if (community?.promotionalText) {
              // Fallback for communities with promotional text but no subscription data
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-crown mr-1"></i>
                  ELITE
                </span>
              );
            }
            return null;
          })()}
        </div>
      ) : null}
      
      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
            <i className="fa fa-circle mr-1 text-xs"></i>
            Active
          </span>
        </div>
      )}
      
      {/* Member Count Badge */}
      <div className="absolute bottom-3 left-3">
        <span className="inline-flex items-center bg-gray-900 bg-opacity-80 text-white text-sm px-3 py-1 rounded-full font-medium">
          <i className="fa fa-users mr-1"></i>
          {community?.membersCount} Members
        </span>
      </div>
    </div>
    
    {/* Content - Flex grow to push button to bottom */}
    <div className="p-6 flex flex-col flex-grow">
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
          {community?.name}
        </h3>
        
        {/* Tags */}
        {community?.tags && community.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {community.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
            {community.tags.length > 2 && (
              <span className="inline-block bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full">
                +{community.tags.length - 2}
              </span>
            )}
          </div>
        )}
        
        {/* Promotional Text */}
        {community?.promotionalText && (
          <p className="text-blue-300 text-sm font-medium mb-2">
            <i className="fa fa-star mr-1 text-yellow-400"></i>
            {community.promotionalText}
          </p>
        )}
        
        {/* Description */}
        {community?.promotionalDescription && (
          <p className="text-gray-400 text-sm line-clamp-2">
            {community.promotionalDescription}
          </p>
        )}
      </div>
      
      {/* Action Button - Now at bottom */}
      <button
        onClick={() => onAction(community)}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mt-4"
      >
        <i className="fa fa-arrow-right mr-2"></i>
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
  isLoading = false,
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
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{title}</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>
        
        {/* Community Cards Grid */}
        <div className="relative">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: cardsPerView }).map((_, index) => (
                <CommunityCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          )}
          
          {/* Enhanced Navigation Arrows */}
          {!isLoading && startIndex > 0 && (
            <button
              onClick={scrollPrev}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
            >
              <ion-icon name="chevron-back-outline" class="text-xl"></ion-icon>
            </button>
          )}
          {!isLoading && startIndex < maxIndex && (
            <button
              onClick={scrollNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
            >
              <ion-icon name="chevron-forward-outline" class="text-xl"></ion-icon>
            </button>
          )}
        </div>
        
        {/* Enhanced Pagination */}
        {!isLoading && totalCount > cardsPerView && (
          <div className="flex justify-center items-center mt-8 space-x-4">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <ion-icon name="chevron-back-outline" class="text-sm"></ion-icon>
              <span>Previous</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-base font-medium">
                Page {currentPage} of {Math.ceil(totalCount / cardsPerView)}
              </span>
            </div>
            
            <button
              onClick={onNextPage}
              disabled={currentPage * cardsPerView >= totalCount}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>Next</span>
              <ion-icon name="chevron-forward-outline" class="text-sm"></ion-icon>
            </button>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && communities.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <i className="fa fa-users text-4xl text-gray-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-white mb-2">No Communities Found</h3>
              <p className="text-gray-400">Start exploring communities or create your own!</p>
            </div>
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
  isLoading = false,
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
          isLoading={isLoading}
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
      <div className="w-full max-w-4xl px-4 flex flex-col sm:flex-row items-center gap-4 mx-auto" ref={inputRef}>
        <div className="flex-grow flex justify-center relative min-w-0 w-full">
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
              className="absolute left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-30 max-h-80 overflow-y-auto w-full"
              style={{ top: '100%' }}
            >
              {loading ? (
                <div className="p-4 text-gray-400 text-center text-lg">Searching...</div>
              ) : noResults ? (
                <div className="p-4 text-gray-400 text-center text-lg">No communities found</div>
              ) : (
                options.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer w-full"
                    onClick={() => handleSelection(item)}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded object-cover border border-gray-700 bg-gray-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white flex items-center gap-1 text-lg">
                        {item.name}
                        {item.isVerified && (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block ml-1" style={{ verticalAlign: 'middle' }}>
                            <circle cx="12" cy="12" r="10" fill="#eab308" />
                            <path d="M8 12.5l3 3 5-5" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="text-base text-gray-400 truncate max-w-full sm:max-w-xs">{item.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button
          id="create-community-btn"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow transition whitespace-nowrap w-full sm:w-auto sm:ml-4"
          style={{ marginRight: 0 }}
          onClick={handleCreateCommunity}
        >
          <i className="fa fa-plus"></i> Create a New Community
        </button>
      </div>
    </div>
  );
};

// Page Navigation Component inspired by HeroUI Pro
const PageNavigation = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg mx-4 mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <i className="fa fa-compass text-blue-400 mr-2"></i>
            Quick Navigation
          </h3>
          <span className="text-base text-gray-400">Jump to section</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => scrollToSection('elite-communities')}
            className="flex flex-col items-center p-3 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
          >
            <i className="fa fa-crown text-2xl mb-1"></i>
            <span className="text-base font-medium">Elite Communities</span>
          </button>
          
          <button
            onClick={() => scrollToSection('your-communities')}
            className="flex flex-col items-center p-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
          >
            <i className="fa fa-users text-2xl mb-1"></i>
            <span className="text-base font-medium">Your Communities</span>
          </button>
          
          <button
            onClick={() => scrollToSection('discover-communities')}
            className="flex flex-col items-center p-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
          >
            <i className="fa fa-compass text-2xl mb-1"></i>
            <span className="text-base font-medium">Discover Communities</span>
          </button>
          
          <button
            onClick={() => scrollToSection('browse-communities')}
            className="flex flex-col items-center p-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
          >
            <i className="fa fa-globe text-2xl mb-1"></i>
            <span className="text-base font-medium">Browse Communities</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="bg-gray-900 border-t border-gray-800 mt-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Logo and Description */}
        <div className="lg:col-span-1">
          <div className="flex items-center space-x-3 mb-4">
            <img src="/static/images/favicon-32x32.png" alt="LPC Logo" className="h-10 w-10" />
            <span className="text-2xl font-bold text-white">Lines Police CAD</span>
          </div>
          <p className="text-gray-400 text-lg leading-relaxed mb-4">
            World's Leading Free-to-use role-play facilitator for law enforcement communities.
          </p>
          <div className="flex space-x-4">
            <a href="https://discord.gg/3ECFhqe" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              <i className="fab fa-discord text-2xl"></i>
            </a>
            <a href="https://x.com/LinesPoliceCAD" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              <i className="fa-brands fa-x-twitter text-2xl"></i>
            </a>
            <a href="https://www.facebook.com/linespoliceserver/" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              <i className="fab fa-facebook text-2xl"></i>
            </a>
            <a href="https://github.com/linesmerrill/police-cad" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              <i className="fab fa-github text-2xl"></i>
            </a>
          </div>
        </div>

        {/* Information */}
        <div>
          <h3 className="text-white font-semibold text-xl mb-4">Information</h3>
          <ul className="space-y-2">
            <li>
              <a href="https://github.com/Linesmerrill/police-cad/releases" target="_blank" 
                 className="text-gray-400 hover:text-white transition-colors text-lg">
                Release Log
              </a>
            </li>
            <li>
              <a href="https://linesmerrill.github.io/MerrillLines/" target="_blank" 
                 className="text-gray-400 hover:text-white transition-colors text-lg">
                Developers
              </a>
            </li>
            <li>
              <a href="https://www.patreon.com/linespolicecad" target="_blank" 
                 className="text-gray-400 hover:text-white transition-colors text-lg">
                Patreon
              </a>
            </li>
            <li>
              <a href="https://github.com/linesmerrill/police-cad" target="_blank" 
                 className="text-gray-400 hover:text-white transition-colors text-lg">
                GitHub
              </a>
            </li>
          </ul>
        </div>

        {/* About */}
        <div>
          <h3 className="text-white font-semibold text-xl mb-4">About</h3>
          <ul className="space-y-2">
            <li>
              <a href="/faq" className="text-gray-400 hover:text-white transition-colors text-lg">
                FAQ
              </a>
            </li>
            <li>
              <a href="/contact-us" className="text-gray-400 hover:text-white transition-colors text-lg">
                Contact Us
              </a>
            </li>
            <li>
              <a href="/terms-and-conditions" className="text-gray-400 hover:text-white transition-colors text-lg">
                Terms and Conditions
              </a>
            </li>
            <li>
              <a href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors text-lg">
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        {/* Community */}
        <div>
          <h3 className="text-white font-semibold text-xl mb-4">Community</h3>
          <ul className="space-y-2">
            <li>
              <a href="/communities" className="text-gray-400 hover:text-white transition-colors text-lg">
                Communities
              </a>
            </li>
            <li>
              <a href="/about-us" className="text-gray-400 hover:text-white transition-colors text-lg">
                About Us
              </a>
            </li>
            <li>
              <a href="/rules" className="text-gray-400 hover:text-white transition-colors text-lg">
                Rules
              </a>
            </li>
            <li>
              <a href="/release-log" className="text-gray-400 hover:text-white transition-colors text-lg">
                Release Log
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 mt-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-lg mb-4 md:mb-0">
            ©2024 by{" "}
            <a href="https://sites.google.com/view/tlps-dev/home" target="_blank" 
               className="text-blue-400 hover:text-blue-300 transition-colors">
              TLPS
            </a>{" "}
            All Rights Reserved
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" className="text-gray-400 hover:text-white transition-colors text-lg">
              Home
            </a>
            <span className="text-gray-600">•</span>
            <a href="/login-civ" className="text-gray-400 hover:text-white transition-colors text-lg">
              Login
            </a>
            <span className="text-gray-600">•</span>
            <a href="/signup-civ" className="text-gray-400 hover:text-white transition-colors text-lg">
              Sign Up
            </a>
          </div>
        </div>
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
        <i className={`fa ${getIcon()} text-xl mr-3`}></i>
        <div className="flex-1">
          <p className="font-medium text-base">{message}</p>
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

  // Helper function to format plan names
  const formatPlanName = (plan) => {
    switch (plan) {
      case 'premium_plus':
        return 'Premium Plus';
      case 'premium':
        return 'Premium';
      case 'base':
        return 'Base';
      default:
        return plan;
    }
  };

  // Helper function to get plan badge styling
  const getPlanBadgeStyle = (plan) => {
    switch (plan) {
      case 'premium_plus':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900 font-bold';
      case 'premium':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold';
      case 'base':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold';
    }
  };

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
        className="bg-[#23263a] rounded-2xl max-w-[95vw] sm:max-w-md md:max-w-2xl lg:max-w-3xl w-full mx-auto shadow-2xl max-h-[90vh] overflow-y-auto"
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
          <h2 className="text-2xl font-bold text-white">Create A Community</h2>
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
                  <p className="text-base">Community Banner</p>
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
            <label className="block text-white text-base font-medium mb-2">
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
            <label className="block text-white text-base font-medium mb-2">
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
              <label className="block text-white text-base font-medium">
                Community Privacy
              </label>
              <div className="relative ml-2 group">
                <i className="fa fa-info-circle text-gray-400 text-sm cursor-help"></i>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 border border-gray-700">
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
                className={`px-4 py-2 rounded-full text-base font-medium transition-colors ${
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
                className={`px-4 py-2 rounded-full text-base font-medium transition-colors ${
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
              <label className="block text-white text-base font-medium">
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
            <p className="text-gray-400 text-sm mb-3">optional</p>
            <div className="flex flex-wrap gap-2">
              {["Xbox", "PlayStation", "PC"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-4 py-2 rounded-full text-base font-medium transition-colors ${
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
              <p className="text-red-400 text-base mb-3">
                {error || `You've reached your community limit (${communityLimit === Infinity ? "unlimited" : communityLimit}). Upgrade your subscription to create more.`}
              </p>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Open iOS App Store
                      window.open('https://apps.apple.com/us/app/lpc-app/id6503307483', '_blank');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors flex items-center justify-center flex-1"
                  >
                    <i className="fa fa-apple mr-2"></i>
                    App Store
                  </button>
                  <button
                    onClick={() => {
                      // Open Google Play Store
                      window.open('https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp', '_blank');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors flex items-center justify-center flex-1"
                  >
                    <i className="fa fa-google mr-2"></i>
                    Google Play
                  </button>
                </div>
                <p className="text-gray-400 text-sm text-center mt-2">
                  Download the mobile app to upgrade
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && canCreateMore && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-base">{error}</p>
            </div>
          )}

          {/* Community Count Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="space-y-3">
              <p className="text-gray-300 text-base">
                You have created <span className="font-bold text-white">{ownedCommunityCount} of {communityLimit === Infinity ? "unlimited" : communityLimit}</span> allowed communit{communityLimit === 1 ? "y" : "ies"}
                <span className="ml-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${getPlanBadgeStyle(userPlan)}`}>
                    {formatPlanName(userPlan)} Plan
                  </span>
                </span>
              </p>
              <div className="flex items-center">
                <span className={`inline-block px-3 py-2 rounded-lg text-sm font-semibold ${getPlanBadgeStyle(userPlan)}`}>
                  {getPlanFeature(userPlan)}
                </span>
              </div>
            </div>
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

  // Loading states for each section
  const [isEliteLoading, setIsEliteLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(true);
  const [isAllCommunitiesLoading, setIsAllCommunitiesLoading] = useState(true);

  // Lazy load elite communities immediately (most important)
  useEffect(() => {
    const fetchEliteCommunities = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v2/communities/elite?limit=5&page=0`);
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
      } catch (error) {
        console.error("Error fetching elite communities:", error);
        setEliteCommunities([]);
        setEliteTotalCount(0);
      } finally {
        setIsEliteLoading(false);
      }
    };

    fetchEliteCommunities();
  }, []);

  // Lazy load user communities after a short delay
  useEffect(() => {
    if (!dbUser || !dbUser._id) {
      setIsUserLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/v2/user/${dbUser._id}/communities?filter=status:approved&limit=3&page=1`
        );
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
            item.imageLink && item.imageLink.includes("file:///")
              ? "/static/images/default-logo.png"
              : item.imageLink || "/static/images/default-logo.png",
        }));
        setUserCommunities(mappedCommunities);
      } catch (error) {
        console.error("Error fetching user communities:", error);
        setUserCommunities([]);
        setUserTotalCount(0);
      } finally {
        setIsUserLoading(false);
      }
    }, 500); // Small delay to prioritize elite communities

    return () => clearTimeout(timer);
  }, [dbUser]);

  // Lazy load recommended communities after user communities
  useEffect(() => {
    if (!dbUser || !dbUser._id) {
      setIsRecommendedLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/v2/user/${dbUser._id}/prioritized-communities?limit=3&page=0`
        );
        const communities = response.data.data.map((item) => ({
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
        }));
        setRecommendedCommunities(communities);
        setRecommendedTotalCount(response.data.totalCount || 0);
      } catch (error) {
        console.error("Error fetching discover communities:", error);
        setRecommendedCommunities([]);
        setRecommendedTotalCount(0);
      } finally {
        setIsRecommendedLoading(false);
      }
    }, 1000); // Delay to prioritize other sections

    return () => clearTimeout(timer);
  }, [dbUser]);

  // Lazy load all communities last (least priority)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v2/communities/tag/all?limit=4&page=0`);
        const communities = response.data.data.map((item) => ({
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
        }));
        setAllCommunities(communities);
        setAllCommunitiesTotalCount(response.data.totalCount || 0);
      } catch (error) {
        console.error("Error fetching browse communities:", error);
        setAllCommunities([]);
        setAllCommunitiesTotalCount(0);
      } finally {
        setIsAllCommunitiesLoading(false);
      }
    }, 1500); // Longer delay for lowest priority section

    return () => clearTimeout(timer);
  }, []);

  // Listen for global event to open modal (for EJS link)
  useEffect(() => {
    const handler = () => setShowCreateCommunityModal(true);
    window.addEventListener(modalEventName, handler);
    return () => window.removeEventListener(modalEventName, handler);
  }, []);

  const fetchElitePage = async (page) => {
    setIsEliteLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v2/communities/elite?limit=5&page=${page}`);
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
          subscription: item.community?.subscription || item.subscription,
          code: item._id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setEliteCommunities(communities);
      setElitePage(page);
    } catch (error) {
      console.error("Error fetching elite communities page:", error);
      setEliteCommunities([]);
    } finally {
      setIsEliteLoading(false);
    }
  };

  const fetchUserPage = async (page) => {
    setIsUserLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/v2/user/${dbUser._id}/communities?filter=status:approved&limit=3&page=${page}`
      );
      const communities = response.data.data || [];
      setUserTotalCount(response.data.totalCount || 0);
      const mappedCommunities = communities.map((item) => ({
        _id: item._id,
        name: item.name,
        membersCount: item.membersCount,
        isActive: item._id === dbUser.user.lastAccessedCommunity?.communityID,
        subscription: item.subscription,
        code: item._id,
        imageLink:
          item.imageLink && item.imageLink.includes("file:///")
            ? "/static/images/default-logo.png"
            : item.imageLink || "/static/images/default-logo.png",
      }));
      setUserCommunities(mappedCommunities);
      setUserPage(page);
    } catch (error) {
      console.error("Error fetching user communities:", error);
      setUserCommunities([]);
      setUserTotalCount(0);
    } finally {
      setIsUserLoading(false);
    }
  };

  const fetchRecommendedPage = async (page) => {
    setIsRecommendedLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/v2/user/${dbUser._id}/prioritized-communities?limit=3&page=${page}`
      );
      const communities = response.data.data.map((item) => ({
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
        subscription: item.subscription,
        code: item._id,
      }));
      setRecommendedCommunities(communities);
      setRecommendedPage(page);
    } catch (error) {
      console.error("Error fetching discover communities page:", error);
      setRecommendedCommunities([]);
    } finally {
      setIsRecommendedLoading(false);
    }
  };

  const fetchAllCommunitiesPage = async (tag, page) => {
    setIsAllCommunitiesLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v2/communities/tag/${tag}?limit=4&page=${page}`);
      const communities = response.data.data.map((item) => ({
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
        subscription: item.subscription,
        code: item._id,
      }));
      setAllCommunities(communities);
      setAllCommunitiesTotalCount(response.data.totalCount || 0);
      setAllCommunitiesPage(page);
    } catch (error) {
      console.error("Error fetching browse communities page:", error);
      setAllCommunities([]);
      setAllCommunitiesTotalCount(0);
    } finally {
      setIsAllCommunitiesLoading(false);
    }
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
      
      {/* Main Layout with Side Ads */}
      <div className="flex">
        {/* Left Side Ad */}
        <div className="hidden lg:block w-64 p-4 space-y-4">
          <AdBanner type="vertical" className="sticky top-24" />
          <AdBanner type="vertical" className="sticky top-96" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          {/* HeroUI Pro Search Bar */}
          <CommunitySearchBar onCreateCommunity={() => setShowCreateCommunityModal(true)} />
          
          {/* Page Navigation Component inspired by HeroUI Pro */}
          <PageNavigation />
          
          {/* Elite Communities Section */}
          <div id="elite-communities">
            <Carousel
              communities={eliteCommunities}
              totalCount={eliteTotalCount}
              onPrev={handleElitePrevPage}
              onNext={handleEliteNextPage}
              currentPage={elitePage}
              isLoading={isEliteLoading}
            />
          </div>
          
          {/* Horizontal Ad after Elite */}
          <div className="px-4 py-6">
            <AdBanner type="horizontal" />
          </div>
          
          {/* Section Divider */}
          <SectionDivider 
            title="Your Communities" 
            subtitle="Communities you're part of"
            icon="fa fa-users"
          />
          
          {/* Your Communities Section */}
          <div id="your-communities">
            {dbUser && dbUser._id ? (
              <div className="px-4 py-8">
                <CommunitySection
                  title="Your Communities"
                  communities={userCommunities}
                  actionText="Jump In"
                  onAction={(community) => (window.location.href = `/community/${encodeCommunityId(community._id)}`)}
                  cardsPerView={3}
                  onPrevPage={handleUserPrevPage}
                  onNextPage={handleUserNextPage}
                  currentPage={userPage}
                  totalCount={userTotalCount}
                  isLoading={isUserLoading}
                />
              </div>
            ) : (
              <div className="px-4 py-8">
                <div className="text-center py-12">
                  <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                    <i className="fa fa-sign-in-alt text-4xl text-gray-500 mb-4"></i>
                    <h3 className="text-xl font-semibold text-white mb-2">Sign In to See Your Communities</h3>
                    <p className="text-gray-400 mb-4">Join communities and they'll appear here</p>
                    <a href="/login-civ?redirect=/communities" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
                      <i className="fa fa-sign-in-alt mr-2"></i>
                      Sign In
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Section Divider */}
          <SectionDivider 
            title="Discover Communities" 
            subtitle="Recommended for you"
            icon="fa fa-compass"
          />
          
          {/* Discover Communities Section */}
          <div id="discover-communities">
            {dbUser && dbUser._id ? (
              <div className="px-4 py-8">
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
                  isLoading={isRecommendedLoading}
                />
              </div>
            ) : (
              <div className="px-4 py-8">
                <div className="text-center py-12">
                  <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                    <i className="fa fa-compass text-4xl text-gray-500 mb-4"></i>
                    <h3 className="text-xl font-semibold text-white mb-2">Sign In for Personalized Recommendations</h3>
                    <p className="text-gray-400 mb-4">Get community recommendations based on your interests</p>
                    <a href="/login-civ?redirect=/communities" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
                      <i className="fa fa-sign-in-alt mr-2"></i>
                      Sign In
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Horizontal Ad before Browse */}
          <div className="px-4 py-6">
            <AdBanner type="horizontal" />
          </div>
          
          {/* Section Divider */}
          <SectionDivider 
            title="Browse All Communities" 
            subtitle="Explore all available communities"
            icon="fa fa-globe"
          />
          
          {/* Browse Communities Section */}
          <div id="browse-communities" className="px-4 py-8">
            <BrowseCommunities
              communities={allCommunities}
              totalCount={allCommunitiesTotalCount}
              currentTag={currentTag}
              setCurrentTag={setCurrentTag}
              onPrevPage={handleAllCommunitiesPrevPage}
              onNextPage={handleAllCommunitiesNextPage}
              currentPage={allCommunitiesPage}
              fetchAllCommunitiesPage={fetchAllCommunitiesPage}
              isLoading={isAllCommunitiesLoading}
            />
          </div>
          
          {/* Features Section */}
          <HeroSection className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Why Choose Our Platform?
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Join thousands of users who trust our platform for their community needs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon="fa fa-shield-alt"
                title="Secure & Private"
                description="Your data is protected with enterprise-grade security and privacy controls."
                color="green"
              />
              <FeatureCard
                icon="fa fa-rocket"
                title="Fast & Reliable"
                description="Lightning-fast performance with 99.9% uptime guarantee."
                color="blue"
              />
              <FeatureCard
                icon="fa fa-headset"
                title="24/7 Support"
                description="Get help whenever you need it with our dedicated support team."
                color="purple"
              />
            </div>
          </HeroSection>
          
          <Footer />
        </div>
        
        {/* Right Side Ad */}
        <div className="hidden lg:block w-64 p-4 space-y-4">
          <AdBanner type="vertical" className="sticky top-24" />
          <AdBanner type="vertical" className="sticky top-96" />
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
