import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FloatingParticles } from "@/components/FloatingParticles";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { authApi } from "@/api/authApi";
import { dashboardApi } from "@/api/dashboardApi";
import { gamificationApi } from "@/api/gamificationApi";
import { connectionApi } from "@/api/connectionApi";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Globe, Lock, Plus, Settings, Star, Trash2, Trophy, Users, Zap } from "lucide-react";

interface Connection { id: string; status: string; }
interface ProfilePost {
  _id: string;
  title?: string;
  content?: string;
  mediaUrl?: string;
  visibility: "private" | "public";
  createdAt: string;
}

const tabBase = "px-4 py-2 text-sm rounded-xl transition-colors";

const Profile = () => {
  const [activeTab, setActiveTab] = useState<"posts" | "achievements">("posts");
  const [userName, setUserName] = useState("Explorer");
  const [userBio, setUserBio] = useState("Your story begins here.");
  const [userXp, setUserXp] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [friends, setFriends] = useState<Connection[]>([]);
  const [goalRate, setGoalRate] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [nextLevel, setNextLevel] = useState(2);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMediaUrl, setPostMediaUrl] = useState("");
  const [postVisibility, setPostVisibility] = useState<"private" | "public">("private");
  const [posts, setPosts] = useState<ProfilePost[]>([]);

  const loadProfile = async () => {
    const [profileData, dashboard, gamification, connections] = await Promise.all([
      authApi.getProfile() as Promise<any>,
      dashboardApi.getSummary() as Promise<any>,
      gamificationApi.getSnapshot() as Promise<any>,
      connectionApi.getConnections() as Promise<Connection[]>,
    ]);

    setUserName(profileData?.user?.name || "Explorer");
    setUserBio(profileData?.profile?.bio || "Your story begins here.");
    setEditName(profileData?.user?.name || "");
    setEditBio(profileData?.profile?.bio || "");
    setUserXp(Number(gamification?.xp ?? dashboard?.user?.xp ?? 0));
    setLevel(Number(gamification?.level ?? dashboard?.user?.level ?? 1));
    setLevelProgress(Number(gamification?.levelProgress?.progressPercent ?? dashboard?.levelProgress?.progressPercent ?? 0));
    setNextLevel(Number((gamification?.levelProgress?.level ?? dashboard?.levelProgress?.level ?? 1) + 1));
    setBadges(Array.isArray(gamification?.badges) ? gamification.badges.map((b: string) => String(b)) : []);
    setMemoryCount(Number(dashboard?.summary?.memoryCount || dashboard?.memories?.length || 0));
    setFriends(Array.isArray(connections) ? connections : []);
    const completed = Number(dashboard?.goalsCompleted || 0);
    const total = Number(dashboard?.goalsTotal || 0);
    setGoalRate(total > 0 ? Math.round((completed / total) * 100) : 0);
    setPosts(Array.isArray(profileData?.profile?.posts) ? profileData.profile.posts : []);
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const acceptedFriends = useMemo(() => friends.filter((friend) => friend.status === "accepted").length, [friends]);

  const handleSaveProfile = async () => {
    const updated = await authApi.updateProfile({
      name: editName.trim(),
      bio: editBio.trim(),
    }) as any;
    setUserName(updated?.user?.name || editName.trim());
    setUserBio(updated?.profile?.bio || editBio.trim());
    setEditOpen(false);
  };

  const handleCreatePost = async () => {
    await authApi.createProfilePost({
      title: postTitle.trim(),
      content: postContent.trim(),
      mediaUrl: postMediaUrl.trim(),
      visibility: postVisibility,
    });
    setPostTitle("");
    setPostContent("");
    setPostMediaUrl("");
    setPostVisibility("private");
    setCreatePostOpen(false);
    await loadProfile();
  };

  const handleDeletePost = async (postId: string) => {
    await authApi.deleteProfilePost(postId);
    await loadProfile();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <FloatingParticles count={8} colors={["primary", "golden", "calm"]} />
      </div>

      <Card className="rounded-2xl border-border/30 glass-card overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-primary/20 via-calm/10 to-golden/10" />
        <CardContent className="p-6 -mt-14">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <Avatar className="h-28 w-28 border-4 border-card shadow-cinematic">
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-calm/20">{userName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{userName}</h1>
              <p className="text-muted-foreground mt-1">{userBio}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap text-sm">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> <AnimatedCounter value={acceptedFriends} /> friends</span>
                <span className="flex items-center gap-1"><Camera className="h-4 w-4" /> <AnimatedCounter value={memoryCount} /> memories</span>
                <span className="flex items-center gap-1"><AnimatedCounter value={posts.length} /> posts</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCreatePostOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Post
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditOpen(true)}>
                <Settings className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl bg-muted/20 p-3 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-golden" />
              <p className="font-display text-xl font-bold"><AnimatedCounter value={level} /></p>
              <p className="text-xs text-muted-foreground">Level</p>
            </div>
            <div className="rounded-xl bg-muted/20 p-3 text-center">
              <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="font-display text-xl font-bold"><AnimatedCounter value={userXp} /></p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
            <div className="rounded-xl bg-muted/20 p-3 text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-accent" />
              <p className="font-display text-xl font-bold"><AnimatedCounter value={goalRate} suffix="%" /></p>
              <p className="text-xs text-muted-foreground">Goal Rate</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Level {level}</span>
              <span>{Math.round(levelProgress)}% to Level {nextLevel}</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <button className={`${tabBase} ${activeTab === "posts" ? "bg-primary text-primary-foreground" : "bg-muted/30"}`} onClick={() => setActiveTab("posts")}>Posts</button>
        <button className={`${tabBase} ${activeTab === "achievements" ? "bg-primary text-primary-foreground" : "bg-muted/30"}`} onClick={() => setActiveTab("achievements")}>Achievements</button>
      </div>

      {activeTab === "posts" && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">Your Posts</h2>
          {posts.length === 0 ? (
            <Card className="rounded-2xl border-border/30 glass-card">
              <CardContent className="p-6 text-sm text-muted-foreground">No posts yet. Create one when you want.</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post) => (
                <Card key={post._id} className="rounded-2xl border-border/30 glass-card overflow-hidden">
                  {post.mediaUrl && <img src={post.mediaUrl} alt={post.title || "Post"} className="w-full h-44 object-cover" />}
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-display font-semibold">{post.title || "Untitled Post"}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {post.visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {post.visibility}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{post.content || ""}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                      <Button size="sm" variant="outline" onClick={() => void handleDeletePost(post._id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "achievements" && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">Achievement Gallery</h2>
          {badges.length === 0 ? (
            <Card className="rounded-2xl border-border/30 glass-card"><CardContent className="p-6 text-sm text-muted-foreground">No badges yet.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {badges.map((badge, index) => (
                <Card key={`${badge}-${index}`} className="rounded-2xl border-border/30 glass-card">
                  <CardContent className="p-3 text-center">
                    <span className="text-3xl">🏆</span>
                    <p className="text-xs mt-1 font-medium">{badge}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>You choose what to post and whether it is private or public.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm mb-1">Title</p>
              <Input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Post title" />
            </div>
            <div>
              <p className="text-sm mb-1">Content</p>
              <Textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="Write your post..." />
            </div>
            <div>
              <p className="text-sm mb-1">Media URL (optional)</p>
              <Input value={postMediaUrl} onChange={(e) => setPostMediaUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <p className="text-sm mb-1">Visibility</p>
              <Select value={postVisibility} onValueChange={(v) => setPostVisibility(v as "private" | "public")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePostOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreatePost()} disabled={!postTitle.trim() && !postContent.trim() && !postMediaUrl.trim()}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your public profile details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm mb-1">Name</p>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <p className="text-sm mb-1">Bio</p>
              <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveProfile()} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
