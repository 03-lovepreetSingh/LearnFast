"use client";
import Image from "next/image";
import React, { useState } from "react";
import {
  Sparkles,
  Brain,
  Calendar,
  Youtube,
  BookOpen,
  Clock,
  ArrowRight,
  Moon,
  Sun,
  Rocket,
} from "lucide-react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode
        ? 'bg-[#0B1026] bg-[url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072")] bg-fixed bg-cover bg-center bg-blend-overlay'
        : 'bg-[#F8FAFF] bg-[url("https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2070")] bg-fixed bg-cover bg-center bg-blend-soft-light'
        }`}
    >
      {/* Navigation */}
      <nav
        className={`container mx-auto px-4 py-6 ${isDarkMode ? "text-white" : ""
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`${isDarkMode
                ? "bg-gradient-to-r from-purple-600 to-blue-400"
                : "bg-gradient-to-r from-indigo-500 to-purple-500"
                } text-white px-3 py-2 rounded-lg`}
            >
              <span className="font-bold text-xl tracking-tight flex items-center">
                <Rocket className="mr-2" size={20} /> LF
              </span>
            </div>
            <span
              className={`text-xl font-bold ${isDarkMode
                ? "bg-gradient-to-r from-purple-400 to-blue-400"
                : "bg-gradient-to-r from-indigo-500 to-purple-500"
                } bg-clip-text text-transparent`}
            >
              LearnFast
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg ${isDarkMode
                ? "text-yellow-400 hover:bg-gray-800"
                : "text-indigo-600 hover:bg-indigo-50"
                }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <a
              href="#features"
              className={`${isDarkMode
                ? "text-gray-300 hover:text-white"
                : "text-indigo-600 hover:text-indigo-800"
                }`}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className={`${isDarkMode
                ? "text-gray-300 hover:text-white"
                : "text-indigo-600 hover:text-indigo-800"
                }`}
            >
              How it works
            </a>
            <button
              className={`${isDarkMode
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-indigo-600 hover:bg-indigo-700"
                } text-white px-6 py-2 rounded-lg transition-colors`}
              onClick={() => window.location.href = '/my-schedules'}
            >
              Get Started
            </button>

          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`inline-flex items-center space-x-2 ${isDarkMode ? "bg-blue-900/50" : "bg-indigo-100/80"
              } px-4 py-2 rounded-full mb-8 backdrop-blur-sm`}
          >
            <Sparkles
              className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
              size={20}
            />
            <span className={isDarkMode ? "text-blue-400" : "text-indigo-600"}>
              Your personalized learning companion
            </span>
          </div>
          <h1
            className={`text-6xl font-bold mb-8 ${isDarkMode
              ? "bg-gradient-to-r from-purple-400 to-blue-400"
              : "bg-gradient-to-r from-indigo-600 to-purple-600"
              } bg-clip-text text-transparent`}
          >
            Master Any Skill with a Structured Learning Path
          </h1>
          <p
            className={`text-xl mb-12 max-w-2xl mx-auto ${isDarkMode ? "text-gray-300" : "text-indigo-900"
              }`}
          >
            LearnFast creates personalized daily learning schedules with curated
            resources, helping you achieve your learning goals efficiently and
            effectively.
          </p>
          <button
            onClick={() => window.location.href = '/my-schedules'}
            className={`${isDarkMode
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-indigo-600 hover:bg-indigo-700"
              } text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-flex items-center`}
          >
            Start Learning Now
            <ArrowRight className="ml-2" size={20} />
          </button>

        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2
            className={`text-4xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-indigo-900"
              }`}
          >
            Why Choose LearnFast?
          </h2>
          <p
            className={`text-xl ${isDarkMode ? "text-gray-300" : "text-indigo-700"
              }`}
          >
            Everything you need to accelerate your learning journey
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            isDarkMode={isDarkMode}
            icon={
              <Brain
                className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
                size={32}
              />
            }
            title="AI-Powered Learning Paths"
            description="Our intelligent system creates customized learning paths based on your goals and available time."
          />
          <FeatureCard
            isDarkMode={isDarkMode}
            icon={
              <Calendar
                className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
                size={32}
              />
            }
            title="Daily Task Breakdown"
            description="Get a structured day-by-day schedule that keeps you focused and on track to achieve your goals."
          />
          <FeatureCard
            isDarkMode={isDarkMode}
            icon={
              <Youtube
                className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
                size={32}
              />
            }
            title="Curated Resources"
            description="Access hand-picked video tutorials, articles, and documentation for effective learning."
          />
          <FeatureCard
            isDarkMode={isDarkMode}
            icon={
              <BookOpen
                className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
                size={32}
              />
            }
            title="Comprehensive Topics"
            description="Learn anything from programming and design to business and personal development."
          />
          <FeatureCard
            isDarkMode={isDarkMode}
            icon={
              <Clock
                className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
                size={32}
              />
            }
            title="Flexible Scheduling"
            description="Adapt your learning schedule to fit your lifestyle and availability."
          />
          <FeatureCard
            isDarkMode={isDarkMode}
            icon={
              <Sparkles
                className={isDarkMode ? "text-blue-400" : "text-indigo-600"}
                size={32}
              />
            }
            title="Progress Tracking"
            description="Monitor your learning progress and stay motivated with achievement milestones."
          />
        </div>
      </div>

      {/* How It Works */}
      <div
        id="how-it-works"
        className={`container mx-auto px-4 py-20 ${isDarkMode
          ? "bg-gray-900/50 backdrop-blur-lg"
          : "bg-white/70 backdrop-blur-lg"
          } rounded-3xl shadow-lg`}
      >
        <div className="text-center mb-16">
          <h2
            className={`text-4xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-indigo-900"
              }`}
          >
            How It Works
          </h2>
          <p
            className={`text-xl ${isDarkMode ? "text-gray-300" : "text-indigo-700"
              }`}
          >
            Three simple steps to start your learning journey
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <StepCard
            isDarkMode={isDarkMode}
            number="1"
            title="Choose Your Topic"
            description="Select what you want to learn and tell us how much time you can dedicate daily."
          />
          <StepCard
            isDarkMode={isDarkMode}
            number="2"
            title="Get Your Schedule"
            description="Receive a personalized learning path with daily tasks and curated resources."
          />
          <StepCard
            isDarkMode={isDarkMode}
            number="3"
            title="Start Learning"
            description="Follow your daily schedule and track your progress as you master new skills."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div
          className={`${isDarkMode
            ? "bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-lg"
            : "bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-lg"
            } rounded-3xl p-12 text-center text-white`}
        >
          <h2 className="text-4xl font-bold mb-6">
            Ready to Accelerate Your Learning?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are achieving their goals faster with
            LearnFast's personalized learning paths.
          </p>
          <button
            onClick={() => window.location.href = '/my-schedules'}
            className={`${isDarkMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-indigo-600 hover:bg-indigo-50"
              } px-8 py-4 rounded-lg text-lg font-medium transition-colors`}
          >
            Get Started for Free
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  isDarkMode,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={`${isDarkMode
        ? "bg-gray-900/50 backdrop-blur-lg hover:bg-gray-800/50"
        : "bg-white/70 backdrop-blur-lg hover:bg-white/80"
        } p-8 rounded-xl shadow-lg transition-all duration-300`}
    >
      <div className="mb-4">{icon}</div>
      <h3
        className={`text-xl font-semibold mb-3 ${isDarkMode ? "text-white" : "text-indigo-900"
          }`}
      >
        {title}
      </h3>
      <p className={isDarkMode ? "text-gray-300" : "text-indigo-700"}>
        {description}
      </p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  isDarkMode,
}: {
  number: string;
  title: string;
  description: string;
  isDarkMode: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`w-12 h-12 ${isDarkMode ? "bg-blue-500" : "bg-indigo-600"
          } text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6`}
      >
        {number}
      </div>
      <h3
        className={`text-xl font-semibold mb-3 ${isDarkMode ? "text-white" : "text-indigo-900"
          }`}
      >
        {title}
      </h3>
      <p className={isDarkMode ? "text-gray-300" : "text-indigo-700"}>
        {description}
      </p>
    </div>
  );
}
