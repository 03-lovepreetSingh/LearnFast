// src/app/schedule/[id]/ViewScheduleClient.tsx - Part 1

"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "../../../contexts/AuthContext";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScheduleChatBot from '../../../components/FloatingChatBot';

interface Video {
  title: string;
  duration: string;
  link: string;
  thumbnail: string;
  completed: boolean;
}

interface DaySchedule {
  day: string;
  date: string;
  videos: Video[];
}

interface Schedule {
  _id: string;
  title: string;
  playlist_url: string;
  schedule_type: 'daily' | 'target';
  settings: {
    daily_hours?: number;
    target_days?: number;
  };
  schedule_data: DaySchedule[];
  summary: {
    totalVideos: number;
    totalDays: number;
    totalDuration: string;
    averageDailyDuration: string;
  };
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  addEventListener(event: string, listener: (event: any) => void): void;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AdjustScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDailyHours: number;
  onAdjust: (newDailyHours: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

const AdjustScheduleModal: React.FC<AdjustScheduleModalProps> = ({
  isOpen,
  onClose,
  currentDailyHours,
  onAdjust,
}) => {
  const [newDailyHours, setNewDailyHours] = useState(currentDailyHours);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-4">Adjust Daily Study Hours</h3>
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            Hours per day: {newDailyHours}
          </label>
          <input
            type="range"
            min="0.5"
            max="12"
            step="0.5"
            value={newDailyHours}
            onChange={(e) => setNewDailyHours(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onAdjust(newDailyHours);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700"
          >
            Apply Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function ViewScheduleClient({ scheduleId }: { scheduleId: string }) {
    // State management
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [expandedDays, setExpandedDays] = useState<string[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustedDailyHours, setAdjustedDailyHours] = useState(
      schedule?.settings?.daily_hours || 2
    );
    const videoContainerRef = useRef<HTMLDivElement>(null);
  
    // Utility Functions
    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, 3000);
    };
  
    const formatDuration = (duration: string) => {
      const [hours, minutes, seconds] = duration.split(':').map(Number);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m ${seconds}s`;
    };
  
    const calculateProgress = () => {
      if (!schedule) return 0;
      const totalVideos = schedule.summary.totalVideos;
      const completedVideos = schedule.schedule_data.reduce(
        (acc, day) => acc + day.videos.filter(v => v.completed).length,
        0
      );
      return Math.round((completedVideos / totalVideos) * 100);
    };
  
    const adjustSchedule = async (newDailyHours: number) => {
      try {
        if (!schedule || !user) return;
  
        // Get completed videos
        const completedVideos: string[] = [];
        const completedVideoDetails: any[] = [];
        
        schedule.schedule_data.forEach(day => {
          day.videos.forEach(video => {
            if (video.completed) {
              completedVideos.push(video.link);
              completedVideoDetails.push(video);
            }
          });
        });
  
        // Find the last day number with completed videos
        let lastDayNumber = 0;
        for (let i = schedule.schedule_data.length - 1; i >= 0; i--) {
          if (schedule.schedule_data[i].videos.some(v => v.completed)) {
            lastDayNumber = i + 1;
            break;
          }
        }
  
        const scheduleData = {
          userId: user._id,
          playlistUrl: schedule.playlist_url,
          scheduleType: 'daily',
          dailyHours: newDailyHours,
          title: schedule.title,
          completedVideos,
          lastDayNumber,
          completedVideoDetails
        };
  
        setIsLoading(true);
        const response = await fetch('https://python-backend-9i5a.onrender.com/api/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(scheduleData)
        });
  
        if (!response.ok) {
          throw new Error('Failed to adjust schedule');
        }
  
        const data = await response.json();
        
        // Delete old schedule
        await fetch(`https://python-backend-9i5a.onrender.com/api/schedules/${scheduleId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
  
        router.push(`/schedule/${data.scheduleId}`);
        addToast('Schedule adjusted successfully', 'success');
      } catch (error: any) {
        addToast(error.message, 'error');
        setIsLoading(false);
      }
    };
  
    // Effect Hooks
    useEffect(() => {
      // Load YouTube IFrame API
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API Ready');
      };
    }, []);
  
    useEffect(() => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      fetchSchedule();
    }, [isAuthenticated, scheduleId]);
    const fetchSchedule = async () => {
      try {
          const token = localStorage.getItem('token');
          // Update the URL to match the backend endpoint
          const response = await fetch(`https://python-backend-9i5a.onrender.com/api/schedules/detail/${scheduleId}`, {
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              }
          });
  
          if (!response.ok) {
              throw new Error('Failed to fetch schedule');
          }
  
          const data = await response.json();
          if (!data.schedule) {
              throw new Error('Schedule not found');
          }
  
          setSchedule(data.schedule);
          setAdjustedDailyHours(data.schedule?.settings?.daily_hours || 2);
          if (data.schedule?.schedule_data?.[0]?.day) {
              setExpandedDays([data.schedule.schedule_data[0].day]);
          }
      } catch (error: any) {
          setError(error.message);
          addToast(error.message, 'error');
      } finally {
          setIsLoading(false);
      }
  };    const handleVideoStateChange = (event: any) => {
      if (event.data === 0 && selectedVideo && schedule) {
        const dayIndex = schedule.schedule_data.findIndex(day => 
          day.videos.some(v => v.link === selectedVideo.link)
        );
        
        if (dayIndex !== -1) {
          const videoIndex = schedule.schedule_data[dayIndex].videos.findIndex(
            v => v.link === selectedVideo.link
          );
          
          if (videoIndex !== -1) {
            handleVideoStatusChange(dayIndex, videoIndex, true);
          }
        }
      }
    };
  
    const toggleDayExpansion = (day: string) => {
      setExpandedDays(prev => 
        prev.includes(day) 
          ? prev.filter(d => d !== day)
          : [...prev, day]
      );
    };
  
    const handleVideoStatusChange = async (dayIndex: number, videoIndex: number, completed: boolean) => {
      if (!schedule) return;
  
      try {
        const video = schedule.schedule_data[dayIndex].videos[videoIndex];
        
        if (video.completed === completed) return;
  
        const response = await fetch(`https://python-backend-9i5a.onrender.com/api/schedules/${scheduleId}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            videoId: video.link,
            completed
          })
        });
  
        if (!response.ok) {
          throw new Error('Failed to update video status');
        }
  
        const updatedSchedule = { ...schedule };
        updatedSchedule.schedule_data[dayIndex].videos[videoIndex].completed = completed;
        setSchedule(updatedSchedule);
  
        if (completed && selectedVideo?.link === video.link) {
          addToast('Video marked as completed!', 'success');
        }
      } catch (error: any) {
        setError(error.message);
        addToast(error.message, 'error');
      }
    };
  
    const refreshSchedule = async () => {
      setIsRefreshing(true);
      try {
        await fetchSchedule();
        addToast('Schedule refreshed successfully', 'success');
      } catch (error: any) {
        addToast('Failed to refresh schedule', 'error');
      } finally {
        setIsRefreshing(false);
      }
    };
  
    const filterVideos = (videos: Video[]) => {
      return videos.filter(video => {
        const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCompletion = filterCompleted === null || video.completed === filterCompleted;
        return matchesSearch && matchesCompletion;
      });
    };
  
    // Loading State
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Icons.Loader2 className="animate-spin mx-auto mb-4" size={32} />
            <p className="text-gray-500">Loading your schedule...</p>
          </motion.div>
        </div>
      );
    }
  
    // Error State
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Icons.AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <p className="text-red-500 font-medium mb-4">{error}</p>
            <button
              onClick={() => router.push('/my-schedules')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      );
    }
  
    // Not Found State
    if (!schedule) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Icons.FileQuestion className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 mb-4">Schedule not found</p>
            <button
              onClick={() => router.push('/my-schedules')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      );
    }
    return (
      <div className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0B1026] text-gray-200' : 'bg-[#F8FAFF] text-gray-800'
      }`}>
        {/* Navigation */}
        <nav className="sticky top-0 z-20 backdrop-blur-lg bg-opacity-70 border-b border-gray-700/20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">
                  <span className="text-indigo-500">Learn</span>Fast
                </span>
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => router.push('/my-schedules')}
                  className="p-2 hover:bg-gray-700/50 rounded-full"
                  title="Back to Schedules"
                >
                  <Icons.ArrowLeft size={20} />
                </button>
                <button
                  onClick={() => setIsAdjustModalOpen(true)}
                  className="p-2 hover:bg-gray-700/50 rounded-full"
                  title="Adjust Schedule"
                >
                  <Icons.Settings size={20} />
                </button>
                <button
                  onClick={refreshSchedule}
                  className={`p-2 hover:bg-gray-700/50 rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                  disabled={isRefreshing}
                  title="Refresh Schedule"
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
              </div>
            </div>
          </div>
        </nav>
  
        {/* Main Content */}
        <motion.div 
          className="container mx-auto px-4 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="max-w-4xl mx-auto">
            {/* Schedule Header */}
            <motion.div 
              className="mb-8"
              variants={itemVariants}
            >
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{schedule.title}</h1>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  schedule.status === 'completed'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {schedule.status === 'completed' ? 'Completed' : 'In Progress'}
                </div>
              </div>
  
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Overall Progress</span>
                  <span className="text-sm font-medium">{calculateProgress()}%</span>
                </div>
                <div className="h-2 bg-gray-700/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${calculateProgress()}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
  
              {/* Schedule Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'}`}>
                  <div className="text-sm text-gray-500">Total Videos</div>
                  <div className="text-xl font-semibold">{schedule.summary.totalVideos}</div>
                </div>
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'}`}>
                  <div className="text-sm text-gray-500">Total Days</div>
                  <div className="text-xl font-semibold">{schedule.summary.totalDays}</div>
                </div>
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'}`}>
                  <div className="text-sm text-gray-500">Total Duration</div>
                  <div className="text-xl font-semibold">{schedule.summary.totalDuration}</div>
                </div>
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'}`}>
                  <div className="text-sm text-gray-500">Daily Average</div>
                  <div className="text-xl font-semibold">{schedule.summary.averageDailyDuration}</div>
                </div>
              </div>
            </motion.div>
  
            {/* Search and Filters */}
            <motion.div 
              className="mb-6 space-y-4"
              variants={itemVariants}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'
                    } border border-gray-700/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                  />
                </div>
                <select
                  value={filterCompleted === null ? 'all' : filterCompleted.toString()}
                  onChange={(e) => setFilterCompleted(e.target.value === 'all' ? null : e.target.value === 'true')}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'
                  } border border-gray-700/20`}
                >
                  <option value="all">All Videos</option>
                  <option value="true">Completed</option>
                  <option value="false">Incomplete</option>
                </select>
              </div>
            </motion.div>
  
            {/* Schedule Days */}
            <div className="space-y-4" ref={videoContainerRef}>
              {schedule.schedule_data.map((day, dayIndex) => {
                const filteredVideos = filterVideos(day.videos);
                if (filteredVideos.length === 0) return null;
  
                return (
                  <motion.div
                    key={day.day}
                    variants={itemVariants}
                    className={`rounded-xl overflow-hidden ${
                      isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'
                    }`}
                  >
                    <button
                      onClick={() => toggleDayExpansion(day.day)}
                      className="w-full px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold">{day.day}</h3>
                        <p className="text-sm text-gray-500">{day.date}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-500">
                          {day.videos.filter(v => v.completed).length} / {day.videos.length} completed
                        </div>
                        <motion.div
                          animate={{ rotate: expandedDays.includes(day.day) ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icons.ChevronDown size={20} />
                        </motion.div>
                      </div>
                    </button>
  
                    <AnimatePresence>
                      {expandedDays.includes(day.day) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-6 pb-4 space-y-4"
                        >
                          {filteredVideos.map((video, videoIndex) => (
                            <motion.div
                              key={video.link}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              onClick={() => setSelectedVideo(video)}
                              className={`p-4 rounded-lg ${
                                isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                              } cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                                isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-white'
                              }`}
                            >
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 relative group">
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-32 h-18 object-cover rounded-lg"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg">
                                    <Icons.Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                                  </div>
                                </div>
  
                                <div className="flex-grow">
                                  <h4 className="font-medium mb-2">{video.title}</h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span className="flex items-center">
                                      <Icons.Clock className="mr-1" size={16} />
                                      {formatDuration(video.duration)}
                                    </span>
                                    <span className="flex items-center text-indigo-500">
                                      <Icons.PlayCircle className="mr-1" size={16} />
                                      Watch Video
                                    </span>
                                  </div>
                                </div>
  
                                <div className="flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVideoStatusChange(dayIndex, videoIndex, !video.completed);
                                    }}
                                    className={`p-2 rounded-full ${
                                      video.completed
                                        ? 'bg-green-500/10 text-green-500'
                                        : isDarkMode
                                        ? 'bg-gray-700 text-gray-400'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}
                                  >
                                    {video.completed ? (
                                      <Icons.CheckCircle size={24} />
                                    ) : (
                                      <Icons.Circle size={24} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
  
            {/* Video Popup Modal */}
            <AnimatePresence>
              {selectedVideo && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm"
                  onClick={() => setSelectedVideo(null)}
                >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                    >
                      <Icons.X size={24} />
                    </button>
                    
                    <div className="relative pt-[56.25%]">
                      <iframe
                        src={`${selectedVideo.link.replace('watch?v=', 'embed/')}?enablejsapi=1`}
                        title={selectedVideo.title}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        onLoad={(e) => {
                          // @ts-ignore
                          const player = new window.YT.Player(e.target, {
                            events: {
                              onStateChange: handleVideoStateChange
                            }
                          });
                          setPlayer(player);
                        }}
                      />
                    </div>
                    
                    <div className="p-4 bg-gray-900">
                      <h3 className="text-lg font-medium text-white mb-2">
                        {selectedVideo.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-400">
                        <Icons.Clock className="mr-1" size={16} />
                        {formatDuration(selectedVideo.duration)}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
  
            {/* Adjust Schedule Modal */}
            <AnimatePresence>
              {isAdjustModalOpen && (
                <AdjustScheduleModal
                  isOpen={isAdjustModalOpen}
                  onClose={() => setIsAdjustModalOpen(false)}
                  currentDailyHours={schedule.settings.daily_hours || 2}
                  onAdjust={adjustSchedule}
                />
              )}
            </AnimatePresence>
  
            {/* Toast Notifications */}
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
              <AnimatePresence>
                {toasts.map((toast) => (
                  <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className={`px-4 py-2 rounded-lg shadow-lg ${
                      toast.type === 'success' ? 'bg-green-500' :
                      toast.type === 'error' ? 'bg-red-500' :
                      'bg-blue-500'
                    } text-white`}
                  >
                    {toast.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
  
            {/* Chat Bot */}
            <ScheduleChatBot schedule={schedule} />
          </div>
        </motion.div>
      </div>
    );
  }