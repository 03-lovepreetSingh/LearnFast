"use client";
import React, { useState } from "react";
import {
  Sparkles, Brain, Calendar, Youtube, BookOpen,
  Clock, ArrowRight, Moon, Sun, Rocket,
} from "lucide-react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <div
      className={`min-h-screen transition-all duration-500 ease-in-out ${
        isDarkMode
          ? 'bg-[#0B1026] bg-[url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072")]'
          : 'bg-[#F8FAFF] bg-[url("https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2070")]'
      } bg-fixed bg-cover bg-center bg-blend-overlay`}
    >
      {/* Navbar */}
      <nav className={`max-w-7xl mx-auto px-6 py-6 flex justify-between items-center ${isDarkMode ? "text-white" : ""}`}>
        <div className="flex items-center space-x-3">
          <div
            className={`rounded-xl px-3 py-2 text-white font-bold text-xl flex items-center shadow-md ${
              isDarkMode
                ? "bg-gradient-to-r from-purple-600 to-blue-400"
                : "bg-gradient-to-r from-indigo-500 to-purple-500"
            }`}
          >
            <Rocket className="mr-2" size={20} />
            LF
          </div>
          <span
            className={`text-2xl font-extrabold bg-clip-text text-transparent ${
              isDarkMode
                ? "bg-gradient-to-r from-purple-400 to-blue-400"
                : "bg-gradient-to-r from-indigo-500 to-purple-600"
            }`}
          >
            LearnFast
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="transition-all duration-300 p-2 rounded-full hover:scale-110"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun size={22} className="text-yellow-400" /> : <Moon size={22} className="text-indigo-700" />}
          </button>
          <a href="#features" className={`${isDarkMode ? "text-gray-300 hover:text-white" : "text-indigo-600 hover:text-indigo-800"} font-medium`}>
            Features
          </a>
          <a href="#how-it-works" className={`${isDarkMode ? "text-gray-300 hover:text-white" : "text-indigo-600 hover:text-indigo-800"} font-medium`}>
            How it works
          </a>
          <button
            onClick={() => window.location.href = '/my-schedules'}
            className={`rounded-2xl px-6 py-2 font-semibold shadow-md transition transform hover:scale-105 ${
              isDarkMode ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center px-6 py-24">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 mb-6 rounded-full backdrop-blur-md ${isDarkMode ? "bg-blue-900/50" : "bg-indigo-100/80"}`}>
          <Sparkles className={`${isDarkMode ? "text-blue-400" : "text-indigo-600"}`} size={20} />
          <span className={`${isDarkMode ? "text-blue-400" : "text-indigo-600"} font-medium`}>
            Your personalized learning companion
          </span>
        </div>
        <h1 className={`text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight tracking-tight bg-clip-text text-transparent ${
          isDarkMode ? "bg-gradient-to-r from-purple-400 to-blue-400" : "bg-gradient-to-r from-indigo-600 to-purple-600"
        }`}>
          Master Any Skill with a Structured Learning Path
        </h1>
        <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 ${isDarkMode ? "text-gray-300" : "text-indigo-900"}`}>
          LearnFast creates personalized daily learning schedules with curated resources to help you reach your goals efficiently.
        </p>
        <button
          onClick={() => window.location.href = '/my-schedules'}
          className={`rounded-2xl px-8 py-4 text-lg font-semibold inline-flex items-center gap-2 transition hover:scale-105 ${
            isDarkMode ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          Start Learning Now
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </button>
      </section>
    </div>
  );
}
