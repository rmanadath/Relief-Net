"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { createClient } from "@supabase/supabase-js";

type FormData = {
  name: string;
  contact: string;
  aid_type: string;
  description: string;
  location: string;
};

export default function PostRequest() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!supabase) {
      setErrorMsg("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("requests").insert([
      {
        name: data.name,
        contact: data.contact,
        aid_type: data.aid_type,
        description: data.description,
        location: data.location,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error(error);
      setErrorMsg("Something went wrong while submitting your request.");
    } else {
      setSuccessMsg("✅ Request submitted successfully!");
      reset();
    }
    setLoading(false);
  };

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
              <option value="Food">Food</option>
              <option value="Medical">Medical</option>
              <option value="Shelter">Shelter</option>
              <option value="Other">Other</option>
            </select>
            {errors.aid_type && <p className="text-red-500 text-sm mt-1">{errors.aid_type.message}</p>}
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
