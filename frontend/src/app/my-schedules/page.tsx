// src/app/my-schedules/page.tsx

"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "../../contexts/AuthContext";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Interfaces
interface Schedule {
  _id: string;
  title: string;
  playlist_url: string;
  schedule_type: 'daily' | 'target';
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed';
  summary: {
    totalVideos: number;
    totalDays: number;
    totalDuration: string;
    averageDailyDuration: string;
  };
  settings: {
    daily_hours?: number;
    target_days?: number;
  };
  schedule_data?: {
    day: string;
    date: string;
    videos: {
      title: string;
      duration: string;
      link: string;
      thumbnail: string;
      completed: boolean;
    }[];
  }[];
}

interface FilterOptions {
  status: 'all' | 'active' | 'completed';
  type: 'all' | 'daily' | 'target';
}

interface SortOption {
  field: 'created_at' | 'title' | 'progress';
  direction: 'asc' | 'desc';
}

// Component
export default function MySchedules() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // States
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    type: 'all'
  });
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'created_at',
    direction: 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch schedules
  useEffect(() => {
    const checkAuthAndFetchSchedules = async () => {
      if (!isAuthenticated || !user) {
        router.push('/login');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`https://python-backend-9i5a.onrender.com/api/schedules/${user._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch schedules');
        }

        const data = await response.json();
        setSchedules(data.schedules);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetchSchedules();
  }, [isAuthenticated, user, router]);

  // Filter and sort schedules
  const getFilteredSchedules = () => {
    return schedules
      .filter(schedule => {
        const matchesSearch = schedule.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterOptions.status === 'all' || schedule.status === filterOptions.status;
        const matchesType = filterOptions.type === 'all' || schedule.schedule_type === filterOptions.type;
        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        if (sortOption.field === 'created_at') {
          return sortOption.direction === 'asc' 
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortOption.field === 'title') {
          return sortOption.direction === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        }
        if (sortOption.field === 'progress') {
          const getProgress = (schedule: Schedule) => {
            const completedVideos = schedule.schedule_data?.reduce(
              (acc, day) => acc + day.videos.filter(v => v.completed).length,
              0
            ) || 0;
            const totalVideos = schedule.summary.totalVideos;
            return completedVideos / totalVideos;
          };
          const progressA = getProgress(a);
          const progressB = getProgress(b);
          return sortOption.direction === 'asc'
            ? progressA - progressB
            : progressB - progressA;
        }
        return 0;
      });
  };
    // Continue in the same component...

  // Utility functions
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://python-backend-9i5a.onrender.com/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setSchedules(prev => prev.filter(schedule => schedule._id !== scheduleId));
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateProgress = (schedule: Schedule) => {
    if (!schedule.schedule_data) return 0;
    const completedVideos = schedule.schedule_data.reduce(
      (acc, day) => acc + day.videos.filter(v => v.completed).length,
      0
    );
    return (completedVideos / schedule.summary.totalVideos) * 100;
  };

  const refreshSchedules = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://python-backend-9i5a.onrender.com/api/schedules/${user?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to refresh schedules');
      
      const data = await response.json();
      setSchedules(data.schedules);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icons.Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-500">Loading your schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0B1026] text-gray-200' : 'bg-[#F8FAFF] text-gray-800'
    }`}>
      {/* Navigation */}
      <nav className="sticky top-0 z-10 backdrop-blur-lg bg-opacity-70 border-b border-gray-700/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">
                <span className="text-indigo-500">Learn</span>Fast
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-700/50 rounded-full"
                title="Dashboard"
              >
                <Icons.LayoutDashboard size={20} />
              </button>
              <button
                onClick={refreshSchedules}
                className={`p-2 hover:bg-gray-700/50 rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh"
                disabled={isRefreshing}
              >
                <Icons.RefreshCw size={20} />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-gray-700/50 rounded-full"
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
              </button>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Icons.User className="text-gray-400" size={20} />
                  <span className="font-medium">{user?.fullName}</span>
                </div>
                <button
                  onClick={() => { router.push('/login'); }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Icons.LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header and Controls */}
        <div className="mb-8 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">My Learning Schedules</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Icons.Plus size={20} />
              <span>Create New Schedule</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-900/50 text-gray-200' 
                    : 'bg-white text-gray-800'
                } border border-gray-700/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
              />
            </div>
                        {/* Filters and View Toggle */}
                        <div className="flex space-x-2">
              <select
                value={filterOptions.status}
                onChange={(e) => setFilterOptions(prev => ({ 
                  ...prev, 
                  status: e.target.value as 'all' | 'active' | 'completed' 
                }))}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-900/50' : 'bg-white'
                } border border-gray-700/20`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filterOptions.type}
                onChange={(e) => setFilterOptions(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'all' | 'daily' | 'target' 
                }))}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-900/50' : 'bg-white'
                } border border-gray-700/20`}
              >
                <option value="all">All Types</option>
                <option value="daily">Daily</option>
                <option value="target">Target</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <select
                value={`${sortOption.field}-${sortOption.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortOption({ 
                    field: field as 'created_at' | 'title' | 'progress', 
                    direction: direction as 'asc' | 'desc' 
                  });
                }}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-900/50' : 'bg-white'
                } border border-gray-700/20`}
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="progress-desc">Most Progress</option>
                <option value="progress-asc">Least Progress</option>
              </select>

              <div className="flex items-center bg-gray-800/30 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-indigo-500 text-white' : ''}`}
                  title="Grid View"
                >
                  <Icons.LayoutGrid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-500 text-white' : ''}`}
                  title="List View"
                >
                  <Icons.List size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500"
            >
              <Icons.AlertCircle className="inline-block mr-2" size={20} />
              {error}
            </motion.div>
          </div>
        )}

        {/* Schedules Display */}
        <AnimatePresence mode="wait">
          {getFilteredSchedules().length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <Icons.Calendar className="mx-auto mb-4 text-gray-400" size={48} />
              <h2 className="text-xl font-semibold mb-2">No Schedules Found</h2>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? "No schedules match your search criteria" 
                  : "Create your first learning schedule to get started"}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Schedule
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }
            >
              {getFilteredSchedules().map((schedule) => (
                <motion.div
                  key={schedule._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  className={`${
                    viewMode === 'grid'
                      ? 'rounded-xl p-6'
                      : 'flex items-center p-4 rounded-xl'
                  } ${
                    isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'
                  } group relative transition-all duration-300 hover:shadow-xl
                  border-2 border-transparent hover:border-indigo-500/50`}
                  onClick={() => router.push(`/schedule/${schedule._id}`)}
                >
                  {/* Thumbnail Section */}
                  <div className={`${
                    viewMode === 'grid' ? 'mb-4' : 'w-48 h-32 mr-6'
                  } rounded-lg overflow-hidden relative group-hover:shadow-lg`}>
                    {schedule.schedule_data && schedule.schedule_data[0]?.videos[0]?.thumbnail ? (
                      <img 
                        src={schedule.schedule_data[0].videos[0].thumbnail}
                        alt="Playlist thumbnail"
                        className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Icons.Video className="text-gray-600" size={32} />
                      </div>
                    )}
                    
                    {/* Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-indigo-500"
                          style={{ width: `${calculateProgress(schedule)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                                    {/* Schedule Content */}
                                    <div className={viewMode === 'grid' ? '' : 'flex-1'}>
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold truncate pr-8">
                          {schedule.title || 'Untitled Schedule'}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setScheduleToDelete(schedule._id);
                            setIsDeleteModalOpen(true);
                          }}
                          className={`absolute top-4 right-4 p-2 rounded-full opacity-0 group-hover:opacity-100 
                            transition-opacity duration-300 ${
                              isDarkMode 
                                ? 'bg-red-500/10 hover:bg-red-500/20' 
                                : 'bg-red-100 hover:bg-red-200'
                            } text-red-500`}
                          title="Delete Schedule"
                        >
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-2 mt-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Icons.Calendar className="mr-2" size={16} />
                          Created {formatDate(schedule.created_at)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Icons.Clock className="mr-2" size={16} />
                          {schedule.schedule_type === 'daily' 
                            ? `${schedule.settings.daily_hours} hours/day`
                            : `${schedule.settings.target_days} days target`
                          }
                        </div>
                      </div>
                    </div>

                    <div className={`${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    } ${viewMode === 'grid' ? 'border-t pt-4' : ''}`}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Videos</div>
                          <div className="font-semibold">{schedule.summary.totalVideos}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Days</div>
                          <div className="font-semibold">{schedule.summary.totalDays}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Total Duration</div>
                          <div className="font-semibold">{schedule.summary.totalDuration}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Daily Average</div>
                          <div className="font-semibold">{schedule.summary.averageDailyDuration}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className={`text-sm px-2 py-1 rounded-full inline-flex items-center ${
                        schedule.status === 'completed'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {schedule.status === 'completed' 
                          ? <Icons.CheckCircle2 className="mr-1" size={14} />
                          : <Icons.Clock className="mr-1" size={14} />
                        }
                        {schedule.status === 'completed' ? 'Completed' : 'In Progress'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.round(calculateProgress(schedule))}% Complete
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setScheduleToDelete(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              } rounded-xl w-full max-w-md p-6 shadow-2xl`}
            >
              <div className="flex items-center space-x-3 text-red-500 mb-4">
                <Icons.AlertTriangle size={24} />
                <h3 className="text-xl font-semibold">Delete Schedule</h3>
              </div>
              
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete this schedule? This action cannot be undone,
                and all progress will be lost.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setScheduleToDelete(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => scheduleToDelete && handleDeleteSchedule(scheduleToDelete)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete Schedule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {/* Add your toast notifications here */}
      </div>
    </div>
  );
}