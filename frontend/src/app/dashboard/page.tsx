"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "../../contexts/AuthContext";
import Image from 'next/image';
import * as Icons from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface VideoDetails {
  title: string;
  duration: string;
  link: string;
  thumbnail: string;
}

interface DaySchedule {
  day: number;
  date: string;
  videos: VideoDetails[];
}

interface ScheduleSummary {
  totalVideos: number;
  totalDays: number;
  totalDuration: string;
  averageDailyDuration: string;
}

interface ScheduleResponse {
  schedule: { [key: string]: VideoDetails[] };
  summary: ScheduleSummary;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [state, setState] = useState({
    isDarkMode: true,
    playlistUrl: "",
    scheduleType: "daily" as "daily" | "target",
    dailyHours: 2,
    targetDate: "",
    schedule: [] as DaySchedule[],
    currentVideo: "",
    isLoading: false,
    error: "",
    completedVideos: new Set<string>(),
    isAdjustModalOpen: false,
    showCompletedOnly: false,
    watchTimeData: Array(7).fill(0),
    scheduleSummary: null as ScheduleSummary | null,
  });

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      watchTimeData: calculateWatchTimeData()
    }));
  }, [state.completedVideos]);

  const updateState = (updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const calculateWatchTimeData = () => {
    const last7Days = Array(7).fill(0);
    const today = new Date();
    
    state.completedVideos.forEach(videoUrl => {
      state.schedule.forEach(day => {
        const dayDate = new Date(day.date);
        const diffDays = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < 7) {
          const video = day.videos.find(v => v.link === videoUrl);
          if (video) {
            const [hours, minutes, seconds] = video.duration.split(':').map(Number);
            const durationHours = hours + minutes/60 + (seconds || 0)/3600;
            last7Days[diffDays] += durationHours;
          }
        }
      });
    });
    
    return last7Days.reverse();
  };

  const toggleVideoCompletion = (videoLink: string) => {
    setState(prev => {
      const newSet = new Set(prev.completedVideos);
      if (newSet.has(videoLink)) {
        newSet.delete(videoLink);
      } else {
        newSet.add(videoLink);
      }
      return { ...prev, completedVideos: newSet };
    });
  };

  const handleExportSchedule = () => {
    const scheduleData = state.schedule.map(day => ({
      day: `Day ${day.day}`,
      date: day.date,
      videos: day.videos.map(video => ({
        ...video,
        completed: state.completedVideos.has(video.link)
      }))
    }));

    const blob = new Blob([JSON.stringify(scheduleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learning-schedule.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSchedule = async () => {
    updateState({ isLoading: true, error: "" });

    try {
      const token = localStorage.getItem('token');
      const targetDays = state.scheduleType === "target" 
        ? Math.ceil((new Date(state.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Get the last day number from existing schedule for completed videos
      let lastDayNumber = 0;
      if (state.schedule.length > 0 && state.completedVideos.size > 0) {
        const completedDays = state.schedule
          .filter(day => day.videos.some(video => state.completedVideos.has(video.link)));
        if (completedDays.length > 0) {
          lastDayNumber = Math.max(...completedDays.map(day => day.day));
        }
      }

      // Get existing completed videos with their details
      const completedVideoDetails = state.schedule
        .flatMap(day => day.videos)
        .filter(video => state.completedVideos.has(video.link));

      const response = await fetch('http://localhost:5000/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          playlistUrl: state.playlistUrl,
          scheduleType: state.scheduleType,
          dailyHours: state.scheduleType === "daily" ? state.dailyHours : null,
          targetDays: state.scheduleType === "target" ? targetDays : null,
          completedVideos: Array.from(state.completedVideos),
          lastDayNumber,
          completedVideoDetails
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          router.push('/login');
          return;
        }
        throw new Error('Failed to generate schedule');
      }

      const data: ScheduleResponse = await response.json();
      
      // Format and update the schedule
      const formattedSchedule = Object.entries(data.schedule).map(([day, videos]) => ({
        day: parseInt(day.split(' ')[1]),
        date: new Date(Date.now() + (parseInt(day.split(' ')[1]) - 1) * 86400000).toISOString().split('T')[0],
        videos
      }));

      updateState({ 
        schedule: formattedSchedule,
        scheduleSummary: data.summary
      });
    } catch (error: any) {
      updateState({ error: error.message || 'Failed to generate schedule' });
    } finally {
      updateState({ isLoading: false });
    }
  };

  if (!isAuthenticated) return null;

  const analyticsData = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [{
      label: 'Watch Time (hours)',
      data: state.watchTimeData,
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      tension: 0.4,
    }],
  };
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      state.isDarkMode ? 'bg-[#0B1026] text-gray-200' : 'bg-[#F8FAFF] text-gray-800'
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
            <button className="p-2 hover:bg-gray-700/50 rounded-full">
              <Icons.Bell size={20} />
            </button>
            <button
              onClick={() => updateState({ isDarkMode: !state.isDarkMode })}
              className="p-2 hover:bg-gray-700/50 rounded-full"
            >
              {state.isDarkMode ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Icons.User className="text-gray-400" size={20} />
                <span className="font-medium">{user?.fullName}</span>
              </div>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Icons.LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Playlist Input Section */}
          <div className="lg:col-span-2">
            <div className={`p-6 rounded-xl ${
              state.isDarkMode ? 'bg-gray-900/50 backdrop-blur-lg' : 'bg-white/70 backdrop-blur-lg'
            }`}>
              <h2 className="text-2xl font-semibold mb-6">Create New Schedule</h2>
              {state.error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500 flex items-center">
                  <Icons.AlertCircle className="mr-2" size={20} />
                  {state.error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block mb-2">YouTube Playlist URL</label>
                  <input
                    type="text"
                    value={state.playlistUrl}
                    onChange={(e) => updateState({ playlistUrl: e.target.value })}
                    className={`w-full p-3 rounded-lg ${
                      state.isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
                    } border focus:ring-2 focus:ring-indigo-500`}
                    placeholder="https://youtube.com/playlist?list=..."
                  />
                </div>

                <div className="flex gap-4">
                  {[
                    { type: 'daily', icon: Icons.Clock, label: 'Daily Time' },
                    { type: 'target', icon: Icons.Calendar, label: 'Target Date' }
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => updateState({ scheduleType: type as "daily" | "target" })}
                      className={`flex-1 p-3 rounded-lg flex items-center justify-center space-x-2 ${
                        state.scheduleType === type 
                          ? 'bg-indigo-600 text-white'
                          : state.isDarkMode 
                            ? 'bg-gray-800/50' 
                            : 'bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {state.scheduleType === "daily" ? (
                  <div>
                    <label className="block mb-2">Daily Learning Time</label>
                    <input
                      type="range"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={state.dailyHours}
                      onChange={(e) => updateState({ dailyHours: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-center text-xl font-semibold">
                      {state.dailyHours} hours/day
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block mb-2">Target Completion Date</label>
                    <input
                      type="date"
                      value={state.targetDate}
                      onChange={(e) => updateState({ targetDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full p-3 rounded-lg ${
                        state.isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
                      } border focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                )}

                <button
                  onClick={generateSchedule}
                  disabled={state.isLoading || !state.playlistUrl}
                  className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors flex items-center justify-center ${
                    (state.isLoading || !state.playlistUrl) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {state.isLoading ? (
                    <>
                      <Icons.Loader2 className="animate-spin mr-2" size={20} />
                      Generating...
                    </>
                  ) : (
                    'Generate Schedule'
                  )}
                </button>
              </div>
            </div>

            {/* Schedule Display */}
            <div className="mt-8 space-y-4">
              {state.schedule.map((day) => (
                <div
                  key={day.day}
                  className={`p-6 rounded-xl ${
                    state.isDarkMode ? 'bg-gray-900/50 backdrop-blur-lg' : 'bg-white/70 backdrop-blur-lg'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Day {day.day}</h3>
                    <span className="text-gray-400">{day.date}</span>
                  </div>
                  <div className="space-y-2">
                    {day.videos
                      .filter(video => !state.showCompletedOnly || state.completedVideos.has(video.link))
                      .map((video, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg flex items-center justify-between ${
                            state.isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center space-x-4 flex-1 min-w-0">
                            <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              {video.thumbnail ? (
                                <>
                                  <Image
                                    src={video.thumbnail}
                                    alt={video.title}
                                    fill
                                    className="object-cover"
                                  />
                                  <button
                                    onClick={() => updateState({ currentVideo: video.link })}
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                                  >
                                    <Icons.PlayCircle className="text-white" size={24} />
                                  </button>
                                </>
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                  <Icons.Video size={24} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <span className="truncate">{video.title}</span>
                          </div>
                          <div className="flex items-center space-x-4 flex-shrink-0">
                            <span className="text-gray-400">{video.duration}</span>
                            <button
                              onClick={() => toggleVideoCompletion(video.link)}
                              className="focus:outline-none"
                            >
                              {state.completedVideos.has(video.link) ? (
                                <Icons.CheckCircle2 className="text-green-500" />
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Sidebar */}
          <div className="space-y-8">
            <div className={`p-6 rounded-xl ${
              state.isDarkMode ? 'bg-gray-900/50 backdrop-blur-lg' : 'bg-white/70 backdrop-blur-lg'
            }`}>
              <h3 className="text-xl font-semibold mb-4">Progress Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icons.BookOpenCheck size={20} />
                    <span>Completed Videos</span>
                  </div>
                  <span className="font-semibold">
                    {state.completedVideos.size}/{state.schedule.reduce((acc, day) => acc + day.videos.length, 0)}
                  </span>
                </div>
                {state.scheduleSummary && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icons.Clock size={20} />
                        <span>Total Duration</span>
                      </div>
                      <span className="font-semibold">{state.scheduleSummary.totalDuration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icons.Calendar size={20} />
                        <span>Daily Average</span>
                      </div>
                      <span className="font-semibold">{state.scheduleSummary.averageDailyDuration}</span>
                    </div>
                  </>
                )}
                <div className="h-32">
                  <Line data={analyticsData} options={{ 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: { 
                        grid: { color: state.isDarkMode ? '#374151' : '#e5e7eb' },
                        ticks: { color: state.isDarkMode ? '#9CA3AF' : '#4B5563' }
                      },
                      y: { 
                        grid: { color: state.isDarkMode ? '#374151' : '#e5e7eb' },
                        ticks: { color: state.isDarkMode ? '#9CA3AF' : '#4B5563' }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl ${
              state.isDarkMode ? 'bg-gray-900/50 backdrop-blur-lg' : 'bg-white/70 backdrop-blur-lg'
            }`}>
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Adjust Schedule', icon: Icons.Settings, action: () => updateState({ isAdjustModalOpen: true }) },
                  { label: 'View Completed', icon: Icons.Filter, action: () => updateState({ showCompletedOnly: !state.showCompletedOnly }), active: state.showCompletedOnly },
                  { label: 'Export Schedule', icon: Icons.Download, action: handleExportSchedule }
                ].map(({ label, icon: Icon, action, active }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`w-full p-3 text-left rounded-lg flex items-center justify-between ${
                      active ? 'bg-indigo-600 text-white' : 
                      state.isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon size={20} />
                      <span>{label}</span>
                    </div>
                    <Icons.ChevronRight size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {state.currentVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl w-full max-w-4xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Now Playing</h3>
              <button
                onClick={() => updateState({ currentVideo: "" })}
                className="text-gray-400 hover:text-white"
              >
                <Icons.X size={20} />
              </button>
            </div>
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${state.currentVideo.split('v=')[1]}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {state.isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className={`${
            state.isDarkMode ? 'bg-gray-900' : 'bg-white'
          } rounded-xl w-full max-w-md p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Adjust Schedule</h3>
              <button
                onClick={() => updateState({ isAdjustModalOpen: false })}
                className="text-gray-400 hover:text-gray-300"
              >
                <Icons.X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Daily Learning Time</label>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={state.dailyHours}
                  onChange={(e) => updateState({ dailyHours: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-center mt-2">{state.dailyHours} hours/day</div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => updateState({ isAdjustModalOpen: false })}
                  className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    generateSchedule();
                    updateState({ isAdjustModalOpen: false });
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}