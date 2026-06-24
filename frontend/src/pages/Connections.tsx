import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FloatingParticles } from "@/components/FloatingParticles";
import { Search, UserPlus, Users } from "lucide-react";
import { connectionApi } from "@/api/connectionApi";

interface Friend {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: "accepted" | "pending_sent" | "pending_received";
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

const Connections = () => {
  const [connections, setConnections] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);

  const loadConnections = async () => {
    const data = await connectionApi.getConnections() as Friend[];
    setConnections(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void loadConnections();
  }, []);

  useEffect(() => {
    const lookup = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      const data = await connectionApi.searchUsers(searchQuery.trim()) as UserSearchResult[];
      setSearchResults(Array.isArray(data) ? data : []);
    };
    const t = setTimeout(() => void lookup(), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const incomingRequests = useMemo(
    () => connections.filter((c) => c.status === "pending_received"),
    [connections]
  );

  const acceptedFriends = useMemo(
    () => connections.filter((c) => c.status === "accepted"),
    [connections]
  );

  const connectionByUserId = useMemo(() => {
    const map = new Map<string, Friend>();
    connections.forEach((connection) => {
      if (connection.userId) map.set(connection.userId, connection);
    });
    return map;
  }, [connections]);

  const sendRequest = async (userId: string) => {
    await connectionApi.requestConnection(userId);
    await loadConnections();
  };

  const accept = async (connectionId: string) => {
    await connectionApi.acceptConnection(connectionId);
    await loadConnections();
  };

  const ignore = async (connectionId: string) => {
    await connectionApi.declineConnection(connectionId);
    await loadConnections();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <FloatingParticles count={6} colors={["calm", "primary"]} />
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          <span className="text-gradient-hero">Find Friends</span>
        </h1>
        <p className="text-muted-foreground mt-1 font-handwritten text-lg">
          Search users and send friend requests
        </p>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="pl-10 rounded-xl bg-card/50 border-border/40 backdrop-blur-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {searchResults.length > 0 && (
        <Card className="rounded-2xl border-border/30 glass-card">
          <CardContent className="p-4 space-y-3">
            {searchResults.map((result) => {
              const relation = connectionByUserId.get(result.id);

              return (
                <div key={result.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{result.name}</p>
                    <p className="text-xs text-muted-foreground">{result.email}</p>
                  </div>

                  {!relation && (
                    <Button size="sm" onClick={() => void sendRequest(result.id)} className="rounded-xl">
                      <UserPlus className="mr-1 h-3 w-3" />
                      Add Friend
                    </Button>
                  )}

                  {relation?.status === "pending_sent" && (
                    <Button size="sm" variant="outline" disabled className="rounded-xl">
                      Requested
                    </Button>
                  )}

                  {relation?.status === "accepted" && (
                    <Button size="sm" variant="outline" disabled className="rounded-xl">
                      Friends
                    </Button>
                  )}

                  {relation?.status === "pending_received" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void accept(relation.id)} className="rounded-xl">
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void ignore(relation.id)} className="rounded-xl">
                        Ignore
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {incomingRequests.length > 0 && (
        <Card className="rounded-2xl border-border/30 glass-card">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-display text-xl font-semibold">Friend Requests</h2>
            {incomingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{request.name}</p>
                  <p className="text-xs text-muted-foreground">{request.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void accept(request.id)} className="rounded-xl">Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => void ignore(request.id)} className="rounded-xl">Ignore</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {acceptedFriends.length > 0 ? (
        <Card className="rounded-2xl border-border/30 glass-card">
          <CardContent className="p-5">
            <h2 className="font-display text-xl font-semibold mb-4">Friends</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {acceptedFriends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 rounded-xl border border-border/30 p-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10">{friend.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div className="glass-card p-10 text-center">
          <Users className="h-16 w-16 mx-auto text-calm/40" strokeWidth={1} />
          <h2 className="font-display text-3xl font-bold">No friends yet</h2>
        </motion.div>
      )}
    </div>
  );
};

export default Connections;
