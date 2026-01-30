const { useState } = React;

const Navbar = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
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
            <a
              href="/profile"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
            >
              <ion-icon
                name="person-circle-outline"
                class="text-2xl"
              ></ion-icon>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Profile = () => {
  const [userData, setUserData] = useState({
    email: dbUser?.user?.email || "",
    username: dbUser?.user?.username || "",
    callSign: dbUser?.user?.callSign || "",
    discordConnected: dbUser?.user?.discordConnected || false,
    profileImage: "/static/images/civ-unknown-user.png",
    panicButtonSound: dbUser?.user?.panicButtonSound || false,
    alertVolumeLevel: dbUser?.user?.alertVolumeLevel || 10,
  });

  const updateField = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = (field) => {
    // Mock save to API (replace with POST to /manageAccount)
    console.log(`Saving ${field}:`, userData[field]);
    // Show success message (mock)
    alert("Successfully updated!");
  };

  const disconnectDiscord = () => {
    // Mock disconnect (replace with POST to /manageAccount with action=disconnectDiscord)
    updateField("discordConnected", false);
    alert("Discord disconnected!");
  };

  const deleteAccount = () => {
    if (window.confirm("Are you sure? This is irreversible!")) {
      // Mock delete (replace with POST to /deleteAccount)
      console.log("Account deleted:", dbUser._id);
      window.location.href = "/logout";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="pt-20 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">User Profile</h1>
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <img
                src={userData.profileImage}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover mr-4"
              />
              <div>
                <h2 className="text-2xl font-semibold">{userData.username}</h2>
                <p className="text-gray-400">{userData.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Profile Image
                </label>
                <a
                  href="https://en.gravatar.com/support/activating-your-account/"
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300"
                >
                  Update via Gravatar{" "}
                  <ion-icon name="open-outline" class="text-sm"></ion-icon>
                </a>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={userData.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  maxLength="20"
                  className="w-full bg-gray-700 text-white rounded-md p-2"
                />
                <button
                  onClick={() => saveChanges("username")}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
                >
                  Update Username
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Call Sign
                </label>
                <input
                  type="text"
                  value={userData.callSign}
                  onChange={(e) => updateField("callSign", e.target.value)}
                  maxLength="10"
                  className="w-full bg-gray-700 text-white rounded-md p-2"
                />
                <button
                  onClick={() => saveChanges("callSign")}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
                >
                  Update Call Sign
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <button
                  onClick={() => (window.location.href = "/forgot-password")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
                >
                  Update Password
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Discord
                </label>
                <div className="flex items-center">
                  <img
                    src="/static/images/discord-icon.svg"
                    alt="Discord"
                    className="h-8 w-8 mr-2"
                  />
                  {userData.discordConnected ? (
                    <div>
                      <p className="text-green-500">Connected</p>
                      <button
                        onClick={disconnectDiscord}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Disconnect Discord
                      </button>
                    </div>
                  ) : (
                    <a
                      href="https://discord.com/api/oauth2/authorize?client_id=1005557484271976569&redirect_uri=REDIRECT_URI&response_type=code&scope=identify"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Connect Discord
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Panic Button Sound
                </label>
                <input
                  type="checkbox"
                  checked={userData.panicButtonSound}
                  onChange={(e) =>
                    updateField("panicButtonSound", e.target.checked)
                  }
                  className="h-5 w-5 text-blue-600"
                />
                <button
                  onClick={() => saveChanges("panicButtonSound")}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Alert Volume
                </label>
                <input
                  type="range"
                  value={userData.alertVolumeLevel}
                  onChange={(e) =>
                    updateField("alertVolumeLevel", Number(e.target.value))
                  }
                  min="0"
                  max="100"
                  className="w-full"
                />
                <button
                  onClick={() => saveChanges("alertVolumeLevel")}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-red-500 mb-2">
                  Delete Account
                </h3>
                <p className="text-gray-400 mb-4">
                  Warning: This is irreversible!
                </p>
                <button
                  onClick={deleteAccount}
                  className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<Profile />, document.getElementById("root"));
