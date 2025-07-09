import { useAuth0 } from '@auth0/auth0-react';

export default function AuthButtons() {
  const { loginWithRedirect, logout, isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading) return null;

  return isAuthenticated ? (
    <div className="flex items-center gap-2 text-sm">
      <span>{user?.email}</span>
      <button
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      >
        Logout
      </button>
    </div>
  ) : (
    <button
      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      onClick={() => loginWithRedirect()}
    >
      Login / Register
    </button>
  );
}
