'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface User {
  id: string;
  username?: string;
  email?: string;
}

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  seen?: boolean;
  status?: string;
  senderUsername?: string;
  senderProfilePic?: string;
  sentFromID?: string;
  data?: any;
  data1?: string; // communityId
  data2?: string; // community name
  data3?: string; // departmentId
  data4?: string; // department name
}

type NotificationFilter = 'all' | 'community' | 'department' | 'friend';

function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <i className="fa fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
        <p className="text-gray-400">{text}</p>
      </div>
    </div>
  );
}

const FilterTabs = ({
  filters,
  activeFilter,
  onFilterChange,
  countsLoaded = false,
}: {
  filters: Array<{ id: string; label: string; count?: number }>;
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  countsLoaded?: boolean;
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-t-lg transition-all font-medium ${
            activeFilter === filter.id
              ? 'bg-gray-800 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {filter.label}
          {countsLoaded && filter.count !== undefined && (
            <span className="ml-2 text-sm opacity-75">({filter.count})</span>
          )}
        </button>
      ))}
    </div>
  );
};

function NotificationsContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [filterCounts, setFilterCounts] = useState({
    all: 0,
    community: 0,
    department: 0,
    friend: 0,
  });
  const [countsLoaded, setCountsLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const notificationsPerPage = 20;

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.id) {
            setUser(data.user);
          } else {
            router.push('/login?redirect=/notifications');
          }
        } else {
          router.push('/login?redirect=/notifications');
        }
      } catch (error) {
        router.push('/login?redirect=/notifications');
      } finally {
        setIsCheckingUser(false);
      }
    };
    checkUser();
  }, [router]);

  // Fetch notifications
  useEffect(() => {
    if (!user?.id || isCheckingUser) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/user/notifications?userId=${user.id}&limit=1000&page=1`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const fetchedNotifications = data.notifications || [];
          
          // Deduplicate notifications
          const uniqueNotifications: Notification[] = [];
          const seenIds = new Set<string>();
          fetchedNotifications.forEach((n: Notification) => {
            if (n.notificationId && !seenIds.has(n.notificationId)) {
              seenIds.add(n.notificationId);
              uniqueNotifications.push(n);
            }
          });

          // Sort by date (newest first)
          uniqueNotifications.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setAllNotifications(uniqueNotifications);
          setTotalCount(data.total || 0);
          setUnseenCount(data.unseenCount || 0);
          
          // Calculate filter counts
          const counts = {
            all: uniqueNotifications.length,
            community: uniqueNotifications.filter(n => n.type === 'join_request' && !n.data3).length,
            department: uniqueNotifications.filter(n => n.type === 'join_request' && n.data3).length,
            friend: uniqueNotifications.filter(n => n.type === 'friend_request').length,
          };
          setFilterCounts(counts);
          setCountsLoaded(true);
        } else {
          console.error('Failed to fetch notifications');
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id, isCheckingUser]);

  // Filter notifications based on active filter
  const filteredNotifications = allNotifications.filter((notification) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'community') return notification.type === 'join_request' && !notification.data3;
    if (activeFilter === 'department') return notification.type === 'join_request' && notification.data3;
    if (activeFilter === 'friend') return notification.type === 'friend_request';
    return true;
  });

  const handleNotificationAction = async (notification: Notification, action: 'approved' | 'declined') => {
    if (!user?.id || !notification.notificationId) return;

    setActionLoading((prev) => ({ ...prev, [notification.notificationId]: true }));

    try {
      const response = await fetch('/api/user/notifications/action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          notificationId: notification.notificationId,
          action,
          notificationType: notification.type,
          sentFromID: notification.sentFromID,
          data1: notification.data1,
          data2: notification.data2,
          data3: notification.data3,
          data4: notification.data4,
        }),
      });

      if (response.ok) {
        // Remove notification from list
        setAllNotifications((prev) =>
          prev.filter((n) => n.notificationId !== notification.notificationId)
        );
        // Update counts
        setFilterCounts((prev) => ({
          ...prev,
          all: prev.all - 1,
          [activeFilter]: Math.max(0, prev[activeFilter as keyof typeof prev] - 1),
        }));
        if (unseenCount > 0) {
          setUnseenCount((prev) => prev - 1);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      alert('Failed to process request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.notificationId]: false }));
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    if (!user?.id || !notification.notificationId) return;

    setActionLoading((prev) => ({ ...prev, [notification.notificationId]: true }));

    try {
      const response = await fetch(
        `/api/user/notifications/${notification.notificationId}?userId=${user.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        // Remove notification from list
        setAllNotifications((prev) =>
          prev.filter((n) => n.notificationId !== notification.notificationId)
        );
        // Update counts
        setFilterCounts((prev) => ({
          ...prev,
          all: prev.all - 1,
          [activeFilter]: Math.max(0, prev[activeFilter as keyof typeof prev] - 1),
        }));
        if (!notification.isRead && !notification.seen) {
          setUnseenCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.notificationId]: false }));
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!user?.id || !notification.notificationId || notification.isRead || notification.seen) return;

    try {
      await fetch(
        `/api/user/notifications/${notification.notificationId}/read?userId=${user.id}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      // Update local state
      setAllNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notification.notificationId ? { ...n, isRead: true, seen: true } : n
        )
      );
      if (unseenCount > 0) {
        setUnseenCount((prev) => prev - 1);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
  };

  const getNotificationMessage = (notification: Notification): string => {
    if (notification.type === 'friend_request') {
      return `${notification.senderUsername || 'Someone'} ${notification.message}`;
    } else if (notification.type === 'join_request' && !notification.data3) {
      return `${notification.senderUsername || 'Someone'} ${notification.message} ${notification.data2 || 'a community'}`;
    } else if (notification.type === 'join_request' && notification.data3) {
      return `${notification.senderUsername || 'Someone'} ${notification.message} ${notification.data2 || 'a community'}'s department ${notification.data4 || ''}`;
    } else if (notification.type === 'notification') {
      return `${notification.message} ${notification.data2 || ''}`;
    }
    return notification.message;
  };

  const getNotificationIcon = (notification: Notification): string => {
    if (notification.type === 'friend_request') return 'fa-user-plus';
    if (notification.type === 'join_request') return 'fa-users';
    return 'fa-bell';
  };

  if (isCheckingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  const filters = [
    { id: 'all', label: 'All', count: filterCounts.all },
    { id: 'community', label: 'Community', count: filterCounts.community },
    { id: 'department', label: 'Department', count: filterCounts.department },
    { id: 'friend', label: 'Friend', count: filterCounts.friend },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      {/* Header Bar with Back Button */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <i className="fa fa-arrow-left"></i>
            <span className="font-medium">Back to Communities</span>
          </Link>
          <div className="flex items-center gap-3">
            <i className="fa fa-bell text-3xl text-blue-500"></i>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
              {unseenCount > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {unseenCount} unread notification{unseenCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && allNotifications.length === 0 ? (
          <LoadingSpinner text="Loading notifications..." />
        ) : (
          <>
            <FilterTabs
              filters={filters}
              activeFilter={activeFilter}
              onFilterChange={(filterId) => setActiveFilter(filterId as NotificationFilter)}
              countsLoaded={countsLoaded}
            />

            {filteredNotifications.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                <i className="fa fa-bell text-4xl text-gray-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-white mb-2">No Notifications</h3>
                <p className="text-gray-400">
                  {activeFilter === 'all'
                    ? "You don't have any notifications yet."
                    : `You don't have any ${activeFilter} notifications.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const isUnread = !notification.isRead && !notification.seen;
                  const isLoading = actionLoading[notification.notificationId] || false;
                  const showActions =
                    (notification.type === 'friend_request' || notification.type === 'join_request') &&
                    !notification.status;

                  return (
                    <div
                      key={notification.notificationId}
                      className={`bg-gray-800 rounded-lg p-4 border transition-all ${
                        isUnread
                          ? 'border-blue-500 bg-blue-900/10'
                          : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src={
                              notification.senderProfilePic ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                notification.senderUsername || 'Unknown'
                              )}&background=808080&color=fff&size=256`
                            }
                            alt={notification.senderUsername || 'Unknown'}
                            className="w-12 h-12 rounded-full border-2 border-gray-700"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm mb-1 leading-relaxed">
                                {getNotificationMessage(notification)}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            {isUnread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>

                          {showActions && (
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationAction(notification, 'approved');
                                }}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isLoading ? (
                                  <>
                                    <i className="fa fa-spinner fa-spin"></i>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <i className="fa fa-check"></i>
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationAction(notification, 'declined');
                                }}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isLoading ? (
                                  <>
                                    <i className="fa fa-spinner fa-spin"></i>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <i className="fa fa-times"></i>
                                    Deny
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {notification.status && (
                            <p className="text-gray-400 text-sm mt-2">
                              {notification.status === 'approved' ? '✓ Accepted' : '✗ Declined'} request
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification);
                          }}
                          disabled={isLoading}
                          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-2 disabled:opacity-50"
                          title="Remove notification"
                        >
                          <i className="fa fa-times"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading notifications page..." />}>
      <NotificationsContent />
    </Suspense>
  );
}
