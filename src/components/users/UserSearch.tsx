import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { Input } from "@/components/ui/input";
import { Search, User, Send } from 'lucide-react';
import { searchUsers, type User as UserType } from '../../utils/supabase';
import { EmptyState, ErrorState } from '../amixof/states';

interface UserSearchProps {
  onUserSelect?: (user: UserType) => void;
  showPayButton?: boolean;
}

const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect, showPayButton = false }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const searchUsersDebounced = async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }

      if (query.length < 2) {
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const results = await searchUsers(query.trim());
        setUsers(results);
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search users');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsersDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [query, retryKey]);

  const handleUserSelect = (user: UserType) => {
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="search"
          aria-label="Search users by username or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name..."
          className="pl-10"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-input border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <ErrorState
          title="Couldn't search users"
          description="Check your connection and try again."
          onRetry={() => setRetryKey((k) => k + 1)}
          retrying={isLoading}
          className="py-6"
        />
      )}

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="space-y-2">
          {users.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground font-medium">
                {users.length} user{users.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card transition-colors hover:bg-surface-hover active:bg-surface-active"
                  >
                    {/* the whole identity block is the button, so keyboard and screen-reader users can pick a person too */}
                    <button type="button" onClick={() => handleUserSelect(user)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-4 text-left">
                      <ProfileAvatar src={user.avatar_url} name={user.display_name || user.username || "U"} />
                      <span className="min-w-0">
                        <span className="type-author block truncate text-foreground">{user.display_name || user.username}</span>
                        <span className="type-meta block truncate">@{user.username}</span>
                      </span>
                    </button>
                    {showPayButton && (
                      <Button size="sm" className="mr-4 shrink-0" onClick={() => handleUserSelect(user)}><Send aria-hidden /> Pay</Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : !isLoading && query.length >= 2 ? (
            <EmptyState icon={User} title="No users found" description="Try a different username or name." className="py-6" />
          ) : null}
        </div>
      )}

      {/* Help Text */}
      {query.length === 0 && (
        <EmptyState icon={Search} title="Search for users to pay" description="Enter at least 2 characters to start searching." className="py-6" />
      )}

      {query.length === 1 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Keep typing to search for users...
          </p>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
