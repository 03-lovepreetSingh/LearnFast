// src/app/schedule/[id]/ViewScheduleClient.tsx

"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "../../../contexts/AuthContext";
import * as Icons from "lucide-react";

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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function ViewScheduleClient({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);

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
      const response = await fetch(`http://localhost:5000/api/schedules/detail/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      setSchedule(data.schedule);
      if (data.schedule?.schedule_data?.[0]?.day) {
        setExpandedDays([data.schedule.schedule_data[0].day]);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoStateChange = (event: any) => {
    // State 0 means video ended
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
      
      // Don't send request if video is already in desired state
      if (video.completed === completed) return;

      const response = await fetch(`http://localhost:5000/api/schedules/${scheduleId}/progress`, {
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

      // Show completion message
      if (completed && selectedVideo?.link === video.link) {
        console.log('Video completed!');
        // You can add a toast notification here
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const formatDuration = (duration: string) => {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">
          <Icons.AlertCircle className="mx-auto mb-4" size={48} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icons.FileQuestion className="mx-auto mb-4" size={48} />
          <p>Schedule not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0B1026] text-gray-200' : 'bg-[#F8FAFF] text-gray-800'
    }`}>
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-4">
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
            >
              <Icons.ArrowLeft size={20} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-700/50 rounded-full"
            >
              {isDarkMode ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Schedule Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-4">{schedule.title}</h1>
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
          </div>

          {/* Schedule Days */}
          <div className="space-y-4">
            {schedule.schedule_data.map((day, dayIndex) => (
              <div
                key={day.day}
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
                    <Icons.ChevronDown
                      size={20}
                      className={`transform transition-transform ${
                        expandedDays.includes(day.day) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {expandedDays.includes(day.day) && (
                  <div className="px-6 pb-4 space-y-4">
                    {day.videos.map((video, videoIndex) => (
                      <div
                        key={video.link}
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Popup Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
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
          </div>
        </div>
      )}
    </div>
  );
}