"use client";
import React, { useState } from "react";
import { Rocket, Sun, Moon, Mail, Lock, ArrowRight, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "https://learnfast-bwdo.onrender.com/api/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.token) {
        // Use the login function from AuthContext
        login(response.data.user, response.data.token);
        router.push("/my-schedules");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "An error occurred during login"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? 'bg-[#0B1026] bg-[url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072")] bg-fixed bg-cover bg-center bg-blend-overlay'
          : 'bg-[#F8FAFF] bg-[url("https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2070")] bg-fixed bg-cover bg-center bg-blend-soft-light'
      }`}
    >
      {/* Navigation */}
      <nav
        className={`container mx-auto px-4 py-6 ${
          isDarkMode ? "text-white" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div
              className={`${
                isDarkMode
                  ? "bg-gradient-to-r from-purple-600 to-blue-400"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500"
              } text-white px-3 py-2 rounded-lg`}
            >
              <span className="font-bold text-xl tracking-tight flex items-center">
                <Rocket className="mr-2" size={20} /> LF
              </span>
            </div>
            <span
              className={`text-xl font-bold ${
                isDarkMode
                  ? "bg-gradient-to-r from-purple-400 to-blue-400"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500"
              } bg-clip-text text-transparent`}
            >
              LearnFast
            </span>
          </Link>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg ${
              isDarkMode
                ? "text-yellow-400 hover:bg-gray-800"
                : "text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Login Form */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div
            className={`${
              isDarkMode
                ? "bg-gray-900/50 backdrop-blur-lg"
                : "bg-white/70 backdrop-blur-lg"
            } p-8 rounded-2xl shadow-lg`}
          >
            <h2
              className={`text-3xl font-bold mb-6 text-center ${
                isDarkMode
                  ? "bg-gradient-to-r from-purple-400 to-blue-400"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600"
              } bg-clip-text text-transparent`}
            >
              Welcome Back
            </h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-400 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-indigo-900"
                  }`}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      isDarkMode ? "text-gray-400" : "text-indigo-600"
                    }`}
                    size={20}
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg outline-none ${
                      isDarkMode
                        ? "bg-gray-800/50 text-white border-gray-700 focus:border-blue-500"
                        : "bg-white/50 text-indigo-900 border-indigo-200 focus:border-indigo-500"
                    } border-2 transition-colors`}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-indigo-900"
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      isDarkMode ? "text-gray-400" : "text-indigo-600"
                    }`}
                    size={20}
                  />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg outline-none ${
                      isDarkMode
                        ? "bg-gray-800/50 text-white border-gray-700 focus:border-blue-500"
                        : "bg-white/50 text-indigo-900 border-indigo-200 focus:border-indigo-500"
                    } border-2 transition-colors`}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full ${
                  isDarkMode
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2" size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p
                className={`${
                  isDarkMode ? "text-gray-400" : "text-indigo-700"
                }`}
              >
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className={`${
                    isDarkMode
                      ? "text-blue-400 hover:text-blue-300"
                      : "text-indigo-600 hover:text-indigo-500"
                  }`}
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}