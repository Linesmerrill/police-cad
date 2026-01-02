'use client';

import React, { Suspense, useEffect, useState } from 'react';
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
}: {
  filters: Array<{ id: string; label: string }>;
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
}) => {
  return (
    <div className="mb-6 border-b border-gray-700 pb-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-4 py-2 rounded-t-lg transition-all font-medium whitespace-nowrap flex-shrink-0 ${
              activeFilter === filter.id
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
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
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [entryPath, setEntryPath] = useState<string | null>(null);
  const notificationsPerPage = 10;

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

  // Store the entry pathname (without hash) when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEntryPath(window.location.pathname);
    }
  }, []);

  // Initialize filter from URL hash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1); // Remove the #
      if (hash && ['all', 'community', 'department', 'friend'].includes(hash)) {
        setActiveFilter(hash as NotificationFilter);
      }
    }
  }, []);

  // Update URL hash when filter changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newHash = `#${activeFilter}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }
  }, [activeFilter]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['all', 'community', 'department', 'friend'].includes(hash)) {
        setActiveFilter(hash as NotificationFilter);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!user?.id || isCheckingUser) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        // First, fetch a small sample to get counts
        const countResponse = await fetch(
          `/api/user/notifications?userId=${user.id}&limit=1&page=1`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (countResponse.ok) {
          const countData = await countResponse.json();
          setTotalCount(countData.total || 0);
          setUnseenCount(countData.unseenCount || 0);
        }

        // Then fetch the actual notifications for current page
        const response = await fetch(
          `/api/user/notifications?userId=${user.id}&limit=${notificationsPerPage}&page=${currentPage}`,
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

          if (currentPage === 1) {
            setAllNotifications(uniqueNotifications);
          } else {
            // Append new notifications when loading more
            setAllNotifications((prev) => {
              const combined = [...prev, ...uniqueNotifications];
              const deduped = combined.filter((n, index, self) =>
                index === self.findIndex((t) => t.notificationId === n.notificationId)
              );
              return deduped.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          }

          setHasMore(currentPage * notificationsPerPage < (data.total || 0));
          
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
  }, [user?.id, currentPage, isCheckingUser]);

  // Filter notifications based on active filter (matching mobile app logic)
  const filteredNotifications = allNotifications.filter((notification) => {
    if (activeFilter === 'all') return true;
    
    // Get data fields - check both top-level and nested data object
    const data3 = notification.data3 || notification.data?.data3 || '';
    const data4 = notification.data4 || notification.data?.data4 || '';
    
    if (activeFilter === 'community') {
      // Community join requests: type is join_request but no department (no data3 or data3 is empty)
      return notification.type === 'join_request' && (!data3 || data3 === '');
    }
    if (activeFilter === 'department') {
      // Department join requests: has department ID and name (data3 and data4 exist and are not empty)
      return !!(data3 && data3 !== '' && data4 && data4 !== '');
    }
    if (activeFilter === 'friend') {
      return notification.type === 'friend_request';
    }
    return true;
  });

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId as NotificationFilter);
    // Update URL hash
    if (typeof window !== 'undefined') {
      window.location.hash = `#${filterId}`;
    }
    // Don't clear notifications or reset page - just change the filter
    // The filteredNotifications will update automatically
  };

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
        if (unseenCount > 0) {
          setUnseenCount((prev) => prev - 1);
        }
      } else {
        let errorMessage = 'Failed to process request';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || 'Failed to process request';
          } else {
            const errorText = await response.text();
            errorMessage = errorText || `Request failed with status ${response.status}`;
          }
        } catch (e) {
          errorMessage = `Request failed with status ${response.status}`;
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Error handling notification action:', error);
      alert(error?.message || 'Failed to process request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.notificationId]: false }));
    }
  };

  const handleDeleteClick = (notification: Notification) => {
    setNotificationToDelete(notification);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !notificationToDelete?.notificationId) return;

    setDeleteModalOpen(false);
    setActionLoading((prev) => ({ ...prev, [notificationToDelete.notificationId]: true }));

    const notification = notificationToDelete;

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
        if (!notification.isRead && !notification.seen) {
          setUnseenCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        let errorMessage = 'Failed to delete notification';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || 'Failed to delete notification';
          } else {
            const errorText = await response.text();
            errorMessage = errorText || `Request failed with status ${response.status}`;
          }
        } catch (e) {
          errorMessage = `Request failed with status ${response.status}`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.notificationId]: false }));
      setNotificationToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setNotificationToDelete(null);
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!user?.id || !notification.notificationId || notification.isRead || notification.seen) return;

    try {
      await fetch(
        `/api/user/notifications/${notification.notificationId}/read?userId=${user.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ seen: true }),
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

  const getNotificationMessage = (notification: Notification): React.ReactNode => {
    if (notification.type === 'friend_request') {
      return (
        <>
          <span className="font-bold">{notification.senderUsername || 'Someone'}</span> {notification.message}
        </>
      );
    } else if (notification.type === 'join_request' && !notification.data3) {
      return (
        <>
          <span className="font-bold">{notification.senderUsername || 'Someone'}</span> {notification.message} <span className="font-bold">{notification.data2 || 'a community'}</span>
        </>
      );
    } else if (notification.type === 'join_request' && notification.data3) {
      return (
        <>
          <span className="font-bold">{notification.senderUsername || 'Someone'}</span> {notification.message} <span className="font-bold">{notification.data2 || 'a community'}</span>'s department <span className="font-bold">{notification.data4 || ''}</span>
        </>
      );
    } else if (notification.type === 'notification') {
      return (
        <>
          {notification.message} <span className="font-bold">{notification.data2 || ''}</span>
        </>
      );
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
    { id: 'all', label: 'All' },
    { id: 'community', label: 'Community' },
    { id: 'department', label: 'Department' },
    { id: 'friend', label: 'Friend' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      {/* Header Bar with Back Button */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => {
              // If we're still on the notifications page (just hash changed), go to communities
              // Otherwise, use browser back
              if (typeof window !== 'undefined' && entryPath && window.location.pathname === entryPath) {
                // Check if there's a valid previous page in history
                const referrer = document.referrer;
                if (referrer && !referrer.includes('/notifications')) {
                  router.back();
                } else {
                  router.push('/communities');
                }
              } else {
                router.back();
              }
            }}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <i className="fa fa-arrow-left"></i>
            <span className="font-medium">Back</span>
          </button>
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
              onFilterChange={handleFilterChange}
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

                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification);
                              }}
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(notification);
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

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <i className="fa fa-spinner fa-spin mr-2"></i>
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(30, 32, 44, 0.75)' }}
          onClick={handleDeleteCancel}
        >
          <div
            className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="text-center mb-4">
              <i className="fa fa-exclamation-triangle text-5xl text-yellow-500"></i>
            </div>

            {/* Title */}
            <h3 className="text-white text-xl font-semibold text-center mb-2">
              Delete Notification
            </h3>

            {/* Message */}
            <p className="text-gray-400 text-center mb-6">
              Are you sure you want to delete this notification? This action cannot be undone.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDeleteCancel}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading[notificationToDelete?.notificationId || '']}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading[notificationToDelete?.notificationId || ''] ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa fa-trash"></i>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
