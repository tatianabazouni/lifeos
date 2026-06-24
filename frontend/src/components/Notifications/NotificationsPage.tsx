import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Trash2, X } from "lucide-react";
import { notificationApi } from "@/api/notificationApi";
import { FloatingParticles } from "@/components/FloatingParticles";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  readAt: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

const typeIcons = {
  connection_request: Bell,
  connection_accepted: CheckCircle,
  connection_declined: X,
  vision_board_shared: Bell,
  ai_reminder: Bell,
} as const;

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getNotifications();
      setNotifications(data || []);
      setUnreadCount(data.filter((n: Notification) => !n.readAt).length);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(nots => nots.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark as read", variant: "destructive" });
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(nots => nots.map(n => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark all read", variant: "destructive" });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(nots => nots.filter(n => n.id !== id));
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const unreadNotifications = notifications.filter(n => !n.readAt);
  const readNotifications = notifications.filter(n => n.readAt);

  const Icon = typeIcons[notifications[0]?.type as keyof typeof typeIcons] || Bell;

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="absolute inset-0 -z-10">
        <FloatingParticles count={4} colors={["calm"]} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Icon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount} unread</p>
        </div>
      </motion.div>

      {unreadNotifications.length > 0 && (
        <Card className="rounded-2xl border-primary/20 glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              Unread ({unreadNotifications.length})
              <Button variant="outline" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-4 rounded-xl border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {notification.type.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{notification.message}</p>
                    {notification.actor && (
                      <p className="text-xs text-muted-foreground mt-1">From {notification.actor.name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => markRead(notification.id)}
                      >
                        Read
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-destructive hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {readNotifications.length > 0 && (
        <Card className="rounded-2xl border-border/30 glass-card">
          <CardHeader>
            <CardTitle>Read ({readNotifications.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {readNotifications.slice(0, 20).map((notification) => (
              <div key={notification.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="outline" className="text-xs">{notification.type.replace(/_/g, ' ').toUpperCase()}</Badge>
                  <span className="text-sm font-medium">{notification.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(notification.createdAt).toLocaleDateString()}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteNotification(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {notifications.length === 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="text-center py-20 glass-card rounded-2xl"
        >
          <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">No notifications</h2>
          <p className="text-muted-foreground">You'll see updates here when friends connect or share boards</p>
        </motion.div>
      )}

      {loading && (
        <div className="grid place-items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

