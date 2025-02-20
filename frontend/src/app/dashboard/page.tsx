"use client";
import { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Youtube,
  Settings,
  User,
  Bell,
  BookOpenCheck,
  BarChart,
  ChevronRight,
  Sun,
  Moon,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
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

export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [scheduleType, setScheduleType] = useState<"daily" | "target">("daily");
  const [dailyHours, setDailyHours] = useState(2);
  const [targetDate, setTargetDate] = useState("");
  const [schedule, setSchedule] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState("");

  // Sample data - replace with actual data from your API
  const mockSchedule = [
    {
      day: 1,
      date: "2024-03-20",
      videos: [
        { title: "Introduction to React", duration: 32, completed: true },
        { title: "Component Basics", duration: 45, completed: true },
        { title: "State Management", duration: 28, completed: false },
      ],
    },
    {
      day: 2,
      date: "2024-03-21",
      videos: [
        { title: "Hooks in Depth", duration: 55, completed: false },
        { title: "Context API", duration: 38, completed: false },
      ],
    },
  ];

  const analyticsData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Watch Time (hours)',
        data: [2, 1.5, 2.2, 1.8, 2.5, 0, 0],
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
      },
    ],
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-[#0B1026] text-gray-200'
        : 'bg-[#F8FAFF] text-gray-800'
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
              <Bell size={20} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-700/50 rounded-full"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center space-x-2">
              <User className="text-gray-400" size={20} />
              <span>SAHU SIR</span>
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
              isDarkMode 
                ? 'bg-gray-900/50 backdrop-blur-lg' 
                : 'bg-white/70 backdrop-blur-lg'
            }`}>
              <h2 className="text-2xl font-semibold mb-6">Create New Schedule</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2">YouTube Playlist URL</label>
                  <input
                    type="text"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className={`w-full p-3 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-gray-700' 
                        : 'bg-white border-gray-200'
                    } border focus:ring-2 focus:ring-indigo-500`}
                    placeholder="https://youtube.com/playlist?list=..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setScheduleType("daily")}
                      className={`flex-1 p-3 rounded-lg ${
                        scheduleType === "daily" 
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode 
                            ? 'bg-gray-800/50' 
                            : 'bg-gray-100'
                      }`}
                    >
                      <Clock size={20} className="mr-2 inline" />
                      Daily Time
                    </button>
                    <button
                      onClick={() => setScheduleType("target")}
                      className={`flex-1 p-3 rounded-lg ${
                        scheduleType === "target" 
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode 
                            ? 'bg-gray-800/50' 
                            : 'bg-gray-100'
                      }`}
                    >
                      <Calendar size={20} className="mr-2 inline" />
                      Target Date
                    </button>
                  </div>

                  {scheduleType === "daily" ? (
                    <div>
                      <label className="block mb-2">Daily Learning Time</label>
                      <input
                        type="range"
                        min="0.5"
                        max="8"
                        step="0.5"
                        value={dailyHours}
                        onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-xl font-semibold">
                        {dailyHours} hours/day
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block mb-2">Target Completion Date</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className={`w-full p-3 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-800/50 border-gray-700' 
                            : 'bg-white border-gray-200'
                        } border focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                  )}
                </div>

                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors">
                  Generate Schedule
                </button>
              </div>
            </div>

            {/* Schedule Display */}
            <div className="mt-8 space-y-4">
              {mockSchedule.map((day) => (
                <div
                  key={day.day}
                  className={`p-6 rounded-xl ${
                    isDarkMode
                      ? 'bg-gray-900/50 backdrop-blur-lg'
                      : 'bg-white/70 backdrop-blur-lg'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Day {day.day}</h3>
                    <span className="text-gray-400">{day.date}</span>
                  </div>
                  <div className="space-y-2">
                    {day.videos.map((video, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg flex items-center justify-between ${
                          isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setCurrentVideo(video.title)}
                            className="text-indigo-500 hover:text-indigo-400"
                          >
                            <PlayCircle size={20} />
                          </button>
                          <span>{video.title}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-400">{video.duration} min</span>
                          {video.completed ? (
                            <CheckCircle2 className="text-green-500" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                          )}
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
              isDarkMode
                ? 'bg-gray-900/50 backdrop-blur-lg'
                : 'bg-white/70 backdrop-blur-lg'
            }`}>
              <h3 className="text-xl font-semibold mb-4">Progress Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpenCheck size={20} />
                    <span>Total Videos</span>
                  </div>
                  <span className="font-semibold">24/50</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock size={20} />
                    <span>Daily Average</span>
                  </div>
                  <span className="font-semibold">1.8h</span>
                </div>
                <div className="h-32">
                  <Line data={analyticsData} options={{ 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: { grid: { color: isDarkMode ? '#374151' : '#e5e7eb' } },
                      y: { grid: { color: isDarkMode ? '#374151' : '#e5e7eb' } }
                    }
                  }} />
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl ${
              isDarkMode
                ? 'bg-gray-900/50 backdrop-blur-lg'
                : 'bg-white/70 backdrop-blur-lg'
            }`}>
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className={`w-full p-3 text-left rounded-lg flex items-center justify-between ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
                }`}>
                  <span>Adjust Schedule</span>
                  <ChevronRight size={20} />
                </button>
                <button className={`w-full p-3 text-left rounded-lg flex items-center justify-between ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
                }`}>
                  <span>View Completed</span>
                  <ChevronRight size={20} />
                </button>
                <button className={`w-full p-3 text-left rounded-lg flex items-center justify-between ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
                }`}>
                  <span>Export Schedule</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {currentVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-4xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{currentVideo}</h3>
              <button
                onClick={() => setCurrentVideo("")}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="aspect-video bg-gray-800 rounded-lg">
              {/* YouTube Player Integration Here */}
              <div className="w-full h-full flex items-center justify-center">
                <Youtube size={48} className="text-red-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}