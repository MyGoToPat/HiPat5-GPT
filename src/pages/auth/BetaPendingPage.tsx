import { Link } from "react-router-dom";

export default function BetaPendingPage() {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-semibold mb-3">Thanks for signing up</h1>
      <p className="mb-2">You're being considered for <span className="font-medium">Beta access</span>.</p>
      <p className="mb-6">We'll review your request and respond within <span className="font-medium">72 hours</span>.</p>
      <Link to="/login" className="inline-block rounded-md px-4 py-2 border border-gray-300 hover:bg-gray-50">
        Back to Login
      </Link>
    </div>
  );
}