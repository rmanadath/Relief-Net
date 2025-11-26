"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@supabase/supabase-js";

type FormData = {
  name: string;
  contact: string;
  aid_type: string;
  priority: string;
  description: string;
  location: string;
};

export default function PostRequest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(true); // Start with loading to check auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnon) {
      return null;
    }
    return createClient(supabaseUrl, supabaseAnon);
  }, [supabaseUrl, supabaseAnon]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/post-request&message=Please sign in or create an account to post a request`);
        return;
      }

      setIsAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

  const onSubmit = async (data: FormData) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/post-request&message=Please sign in or create an account to post a request`);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!supabase) {
      setErrorMsg("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    // Get current user (should be authenticated at this point)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setErrorMsg("You must be logged in to post a request.");
      setLoading(false);
      router.push(`/login?redirect=/post-request&message=Please sign in or create an account to post a request`);
      return;
    }
    
    const { error } = await supabase.from("requests").insert([
      {
        name: data.name,
        contact: data.contact,
        aid_type: data.aid_type.toLowerCase(),
        priority: data.priority || 'medium',
        description: data.description,
        location: data.location,
        user_id: session.user.id,
        status: 'open',
      },
    ]);

    if (error) {
      console.error(error);
      setErrorMsg("Something went wrong while submitting your request.");
    } else {
      setSuccessMsg("✅ Request submitted successfully!");
      reset();
      // Redirect to dashboard after successful submission
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
    setLoading(false);
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, this should redirect, but show a message just in case
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-indigo-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in or create an account to post a request.</p>
          <a
            href="/login?redirect=/post-request"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign In / Sign Up
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold text-center mb-4 text-gray-800">
          Post a New Relief Request
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              {...register("name", { required: "Name is required" })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Your full name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact</label>
            <input
              type="text"
              {...register("contact", { required: "Contact is required" })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Phone or Email"
            />
            {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Aid Type</label>
            <select
              {...register("aid_type", { required: "Please select an aid type" })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Aid Type</option>
              <option value="food">Food</option>
              <option value="medicine">Medicine</option>
              <option value="shelter">Shelter</option>
              <option value="clothing">Clothing</option>
              <option value="other">Other</option>
            </select>
            {errors.aid_type && <p className="text-red-500 text-sm mt-1">{errors.aid_type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              {...register("priority", { required: "Please select a priority" })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              defaultValue="medium"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register("description", { required: "Description is required" })}
            rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the type of aid needed"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              {...register("location", { required: "Location is required" })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="City or Address"
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md text-white font-semibold ${loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>

          {successMsg && <p className="text-green-600 text-center font-medium mt-3">{successMsg}</p>}
          {errorMsg && <p className="text-red-600 text-center font-medium mt-3">{errorMsg}</p>}
        </form>
      </div>
    </div>
  );
}
