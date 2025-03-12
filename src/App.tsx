import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface RobloxUser {
  previousUsernames: string[];
  hasVerifiedBadge: boolean;
  id: number;
  name: string;
  displayName: string;
}

interface SearchResponse {
  data: RobloxUser[];
}

interface ThumbnailResponse {
  data: Array<{
    targetId: number;
    state: string;
    imageUrl: string;
  }>;
}

function App() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<RobloxUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RobloxUser | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<number, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAvatarUrls = async (userIds: number[]) => {
    try {
      const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(',')}&size=150x150&format=Png`);
      if (!response.ok) throw new Error('Failed to fetch avatars');
      const data: ThumbnailResponse = await response.json();
      const newUrls = data.data.reduce((acc, item) => ({
        ...acc,
        [item.targetId]: item.imageUrl
      }), {});
      setAvatarUrls(prev => ({ ...prev, ...newUrls }));
    } catch (error) {
      console.error('Error fetching avatars:', error);
    }
  };

  const handleUserClick = (user: RobloxUser) => {
    setSelectedUser(user);
    setShowDropdown(false);
    setQuery('');
  };

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setUsers([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: SearchResponse = await response.json();
        setUsers(data.data || []);
        if (data.data?.length > 0) {
          fetchAvatarUrls(data.data.map(user => user.id));
        }
        setShowDropdown(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setError(errorMessage);
        setUsers([]);
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative" ref={dropdownRef}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-gray-800 text-gray-100 px-4 py-3 pr-12 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <button 
              className="absolute right-2 p-2 text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => setShowDropdown(true)}
            >
              <Search size={20} />
            </button>
          </div>

          {showDropdown && (query.length > 0) && (
            <div className="absolute w-full mt-2 bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden z-40">
              {isLoading ? (
                <div className="p-4 text-gray-400 text-center">Loading...</div>
              ) : error ? (
                <div className="p-4 text-red-400 text-center">{error}</div>
              ) : users.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-0"
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={avatarUrls[user.id] || 'https://tr.rbxcdn.com/53eb9b17fe1432a809c73a13889b5006/150/150/Image/Png'}
                          alt={`${user.displayName}'s avatar`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-gray-200 font-medium">{user.displayName}</div>
                              <div className="text-gray-400 text-sm">@{user.name}</div>
                            </div>
                            {user.hasVerifiedBadge && (
                              <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-1 rounded">
                                Verified
                              </span>
                            )}
                          </div>
                          {user.previousUsernames && user.previousUsernames.length > 0 && (
                            <div className="text-gray-500 text-xs mt-1">
                              Previous: {user.previousUsernames.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-gray-400 text-center">No users found</div>
              )}
            </div>
          )}
        </div>

        <Dialog.Root open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 z-50">
              {selectedUser && (
                <>
                  <Dialog.Title className="sr-only">
                    User Profile - {selectedUser.displayName}
                  </Dialog.Title>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={avatarUrls[selectedUser.id] || 'https://tr.rbxcdn.com/53eb9b17fe1432a809c73a13889b5006/150/150/Image/Png'}
                        alt={`${selectedUser.displayName}'s avatar`}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <div>
                        <h2 className="text-2xl font-bold text-gray-100">{selectedUser.displayName}</h2>
                        <p className="text-gray-400">@{selectedUser.name}</p>
                        {selectedUser.hasVerifiedBadge && (
                          <span className="inline-block mt-2 text-blue-400 text-sm bg-blue-400/10 px-3 py-1 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <Dialog.Close className="text-gray-400 hover:text-gray-200">
                      <X size={24} />
                    </Dialog.Close>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-gray-300 font-semibold mb-2">User ID</h3>
                      <p className="text-gray-400">{selectedUser.id}</p>
                    </div>
                    
                    {selectedUser.previousUsernames && selectedUser.previousUsernames.length > 0 && (
                      <div>
                        <h3 className="text-gray-300 font-semibold mb-2">Previous Usernames</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedUser.previousUsernames.map((username, index) => (
                            <span
                              key={index}
                              className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm"
                            >
                              {username}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <a
                        href={`https://www.roblox.com/users/${selectedUser.id}/profile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        View Full Profile
                      </a>
                    </div>
                  </div>
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

export default App;