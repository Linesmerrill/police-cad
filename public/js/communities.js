const { useState, useEffect } = React;

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

// Mock data for Discover and Browse sections
const mockRecommendedCommunities = [
  {
    _id: "rec1",
    name: "Urban Enforcers",
    imageLink: "/static/images/rec1-logo.png",
    description: "Dynamic urban roleplay with intense missions.",
    memberCount: 300,
    platform: "PC",
    code: "URBAN",
  },
  {
    _id: "rec2",
    name: "Xbox Tactical Ops",
    imageLink: "/static/images/rec2-logo.png",
    description: "Tactical police ops for Xbox players.",
    memberCount: 220,
    platform: "Xbox",
    code: "TACTICAL",
  },
  {
    _id: "rec3",
    name: "PSN Rescue Squad",
    imageLink: "/static/images/rec3-logo.png",
    description: "Rescue-focused RP for PlayStation users.",
    memberCount: 190,
    platform: "PlayStation",
    code: "RESCUE",
  },
];

const mockAllCommunities = [
  {
    _id: "all1",
    name: "Pacific Coast PD",
    imageLink: "/static/images/all1-logo.png",
    description: "Coastal police roleplay with open-world missions.",
    memberCount: 280,
    platform: "PC",
    code: "PACIFIC",
  },
  {
    _id: "all2",
    name: "Xbox City Watch",
    imageLink: "/static/images/all2-logo.png",
    description: "City-based law enforcement for Xbox.",
    memberCount: 160,
    platform: "Xbox",
    code: "CITYWATCH",
  },
  {
    _id: "all3",
    name: "PSN Fire Brigade",
    imageLink: "/static/images/all3-logo.png",
    description: "Firefighting RP on PlayStation.",
    memberCount: 130,
    platform: "PlayStation",
    code: "FIREBRIGADE",
  },
  {
    _id: "all4",
    name: "Cross-Platform EMS",
    imageLink: "/static/images/all4-logo.png",
    description: "EMS roleplay across all platforms.",
    memberCount: 200,
    platform: "PC",
    code: "CROSSPLATFORM",
  },
  {
    _id: "all5",
    name: "GTA V Veterans",
    imageLink: "/static/images/all5-logo.png",
    description: "Veteran GTA V roleplayers on Xbox.",
    memberCount: 250,
    platform: "Xbox",
    code: "GTAVETS",
  },
];

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
              href="/community-dashboard"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
            >
              Community Dashboard
            </a>
            <div className="relative">
              <button
                onClick={toggleNotifPopout}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md relative"
              >
                <ion-icon
                  name="notifications-outline"
                  class="text-2xl"
                ></ion-icon>
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

const Carousel = ({ communities, totalCount, onPrev, onNext, currentPage }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % communities.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [communities]);

  return (
    <div className="relative w-full h-[600px] bg-gray-800 overflow-hidden">
      {communities.map((community, index) => (
        <div
          key={community._id}
          className={`absolute top-0 left-0 w-full h-full flex items-center justify-center transition-all duration-500 ${
            index === current ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${(index - current) * 100}%)` }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${
                community.imageLink || "/static/images/default-logo.png"
              })`,
            }}
          ></div>
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative max-w-4xl mx-auto text-center z-10">
            <h2 className="text-4xl font-bold text-white mb-4">
              {community.name}
            </h2>
            <p className="text-gray-200 text-lg mb-2">
              {community.promotionalText}
            </p>
            <p className="text-gray-300 mb-4">
              {community.promotionalDescription}
            </p>
            <p className="text-gray-400 mb-4">
              {community.membersCount} Members
            </p>
            <div className="flex justify-center space-x-2 mb-6">
              {community.tags &&
                community.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block bg-gray-600 text-gray-200 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            {/* <a
              href={`/community/${community._id}`}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700"
            >
              Join Now
            </a> */}
          </div>
        </div>
      ))}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2 mb-12">
        {communities.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full ${
              index === current ? "bg-blue-600" : "bg-gray-400"
            }`}
            onClick={() => setCurrent(index)}
          ></button>
        ))}
      </div>
      {totalCount > 5 && (
        <>
          <button
            onClick={onPrev}
            disabled={currentPage === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-3 rounded-full disabled:opacity-50"
          >
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <button
            onClick={onNext}
            disabled={currentPage * 5 >= totalCount}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-3 rounded-full disabled:opacity-50"
          >
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </>
      )}
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
                  actionText={actionText}
                  onAction={onAction}
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
          actionText="Explore"
          onAction={(community) =>
            (window.location.href = `/community/${community._id}`)
          }
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
              item.imageLink && item.imageLink.includes("file:///") // Check for file:/// in imageLink
                ? "/static/images/default-logo.png"
                : item.imageLink || "/static/images/default-logo.png",
            membersCount: item.membersCount,
            code: item._id, // Use _id as code since not provided
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort by name
        setEliteCommunities(communities);
        setEliteTotalCount(response.data.totalCount || 0);
        console.log(
          "Elite communities:",
          communities,
          "Total count:",
          response.data.totalCount
        );
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
          console.log(
            "User communities:",
            mappedCommunities,
            "Total count:",
            response.data.totalCount
          );
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
          console.log(
            "Discover communities:",
            communities,
            "Total count:",
            response.data.totalCount
          );
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
        console.log(
          "Browse communities:",
          communities,
          "Total count:",
          response.data.totalCount
        );
      })
      .catch((error) => {
        console.error("Error fetching browse communities:", error);
        setAllCommunities([]);
        setAllCommunitiesTotalCount(0);
      });
  }, []);

  const fetchElitePage = (page) => {
    axios
      .get(`${API_URL}/api/v2/communities/elite?limit=5&page=${page}`)
      .then((response) => {
        const communities = response.data.data
          .map((item) => ({
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
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setEliteCommunities(communities);
        setElitePage(page);
        console.log("Fetched elite page:", page, "Communities:", communities);
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
        console.log(
          "Fetched user page:",
          page,
          "Communities:",
          mappedCommunities
        );
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
        console.log(
          "Fetched discover page:",
          page,
          "Communities:",
          communities
        );
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
        console.log(
          "Fetched browse page:",
          page,
          "Tag:",
          tag,
          "Communities:",
          communities,
          "Total count:",
          response.data.totalCount
        );
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
      <Navbar />
      <div className="pt-16">
        {eliteCommunities.length > 0 && (
          <Carousel
            communities={eliteCommunities}
            totalCount={eliteTotalCount}
            onPrev={handleElitePrevPage}
            onNext={handleEliteNextPage}
            currentPage={elitePage}
          />
        )}
        <CommunitySection
          title="Your Communities"
          communities={userCommunities}
          actionText="Jump In"
          onAction={(community) =>
            // (window.location.href = `/community/${community._id}`)
            (window.location.href = `/community-dashboard`)
          }
          cardsPerView={3}
          onPrevPage={handleUserPrevPage}
          onNextPage={handleUserNextPage}
          currentPage={userPage}
          totalCount={userTotalCount}
        />
        <CommunitySection
          title="Discover Communities"
          communities={recommendedCommunities}
          //   actionText="Learn More"
          actionText=""
          onAction={(community) =>
            // (window.location.href = `/community/${community._id}`)
            (window.location.href = `#`)
          }
          cardsPerView={3}
          onPrevPage={handleRecommendedPrevPage}
          onNextPage={handleRecommendedNextPage}
          currentPage={recommendedPage + 1}
          totalCount={recommendedTotalCount}
        />
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
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
