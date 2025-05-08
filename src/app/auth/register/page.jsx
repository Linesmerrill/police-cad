"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  checkEmailExists,
  sendVerificationCode,
  verifyCode,
  createAccount,
  resendVerificationCode,
} from "@/services/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleNext = async () => {
    setError("");
    setLoading(true);

    try {
      if (step === 1) {
        if (!isValidEmail(email)) {
          throw new Error("Please enter a valid email address.");
        }

        const result = await checkEmailExists(email);
        if (!result.success || result.data?.user) {
          throw new Error("Email already in use.");
        }

        await sendVerificationCode(email);
        setStep(2);
      } else if (step === 2) {
        const result = await verifyCode(code, email);
        if (!result.success) throw new Error(result.message);
        setStep(3);
      } else if (step === 3) {
        setStep(4);
      } else if (step === 4) {
        const result = await createAccount(email, password, username);
        if (!result.success) throw new Error(result.message);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCodeSubmit = async (enteredCode) => {
    setError("");
    setLoading(true);
    try {
      const result = await verifyCode(enteredCode, email);
      if (!result.success) throw new Error(result.message);
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center text-blue-600 mb-4">
            Create Account
          </h2>
          <div className="text-sm text-gray-500 text-center mb-6">
            Step {step} of 4
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {step === 1 && (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailTouched(false); // reset warning while typing
                  }}
                  onBlur={() => setEmailTouched(true)}
                  className="w-full px-4 py-2 border rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {emailTouched && email && !isValidEmail(email) && (
                  <p className="text-sm text-red-500 mt-1">
                    Invalid email format
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Enter 6-digit Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ""); // strip non-digits
                    setCode(val);

                    // Auto-submit if 6 digits entered
                    if (val.length === 6) {
                      handleAutoCodeSubmit(val);
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <div className="text-right mt-2">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || resendLoading}
                    onClick={async () => {
                      setError("");
                      setResendLoading(true);
                      try {
                        const res = await resendVerificationCode(email);
                        if (!res.success) throw new Error(res.message);
                        setResendCooldown(60); // lock for 60 seconds
                      } catch (err) {
                        setError(err.message || "Unable to resend code");
                      } finally {
                        setResendLoading(false);
                      }
                    }}
                    className={`text-sm ${
                      resendCooldown > 0 || resendLoading
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:underline"
                    }`}
                  >
                    {resendLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-blue-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        Sending...
                      </span>
                    ) : resendCooldown > 0 ? (
                      `Resend available in ${resendCooldown}s`
                    ) : (
                      "Resend code"
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </>
            )}

            {step === 4 && (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-sm text-gray-600 hover:text-blue-600"
                >
                  ← Back
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={
                  loading ||
                  (step === 1 && emailTouched && email && !isValidEmail(email))
                }
                className={`ml-auto px-6 py-2 rounded-md font-semibold transition ${
                  loading ||
                  (step === 1 && emailTouched && email && !isValidEmail(email))
                    ? "bg-blue-300 cursor-not-allowed opacity-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {step < 4 ? "Next" : "Create Account"}
              </button>
            </div>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600">
            Already have an account?{" "}
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
