'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

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
  data?: any;
}

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

function NotificationsContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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

          setNotifications(uniqueNotifications);
          setTotalCount(data.total || 0);
          setUnseenCount(data.unseenCount || 0);
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

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead && notification.notificationId) {
      try {
        await fetch(
          `/api/user/notifications/${notification.notificationId}/read?userId=${user?.id}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notification.notificationId ? { ...n, isRead: true } : n
          )
        );
        if (unseenCount > 0) {
          setUnseenCount((prev) => prev - 1);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle notification action if it has data
    if (notification.data) {
      // Navigate based on notification type
      if (notification.data.communityId) {
        const encodeCommunityId = (id: string): string => {
          const base64 = btoa(id);
          return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };
        router.push(`/community/${encodeCommunityId(notification.data.communityId)}`);
      } else if (notification.data.url) {
        window.location.href = notification.data.url;
      }
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

  if (isCheckingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

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
        {isLoading && notifications.length === 0 ? (
          <LoadingSpinner text="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <i className="fa fa-bell text-4xl text-gray-500 mb-4"></i>
            <h3 className="text-xl font-semibold text-white mb-2">No Notifications</h3>
            <p className="text-gray-400">You don't have any notifications yet.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.notificationId}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition-all hover:border-blue-500 ${
                    notification.isRead
                      ? 'border-gray-700'
                      : 'border-blue-500 bg-blue-900/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.isRead
                            ? 'bg-gray-700'
                            : 'bg-blue-600'
                        }`}
                      >
                        <i className="fa fa-bell text-white"></i>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">
                            {notification.message}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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


