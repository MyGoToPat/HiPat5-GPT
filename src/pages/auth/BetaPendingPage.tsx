import { Link } from "react-router-dom";

export default function BetaPendingPage() {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-semibold mb-3">Access Under Review</h1>
      <p className="mb-6">Your application to be accepted as a Beta Tester is still under review.</p>
      <Link to="/login" className="inline-block rounded-md px-4 py-2 border border-gray-300 hover:bg-gray-50">
        Back to Login
      </Link>
    </div>
  );
}