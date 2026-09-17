import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2, BellOff } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import type { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const { organization, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifs(); }, [organization]);

  async function loadNotifs() {
    if (!organization) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('org_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }

  async function markRead(n: Notification) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    if (!error) loadNotifs();
  }

  async function markAllRead() {
    if (!organization) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('org_id', organization.id).eq('is_read', false);
    if (!error) loadNotifs();
  }

  async function deleteNotif(n: Notification) {
    const { error } = await supabase.from('notifications').delete().eq('id', n.id);
    if (!error) loadNotifs();
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread of ${notifications.length} total.`}
        actions={unreadCount > 0 && <Button variant="outline" onClick={markAllRead}><Check className="mr-2 h-4 w-4" /> Mark all read</Button>}
      />

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      {!loading && notifications.length === 0 && (
        <Card><CardContent className="py-12 text-center"><BellOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><div className="text-sm text-muted-foreground">No notifications.</div></CardContent></Card>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id} className={n.is_read ? 'opacity-70' : ''}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-md ${n.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                <Bell className={`h-4 w-4 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{n.title}</span>
                  {!n.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                </div>
                {n.body && <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-xs text-muted-foreground">{relativeTime(n.created_at)}</div>
              </div>
              <div className="flex items-center gap-1">
                {!n.is_read && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(n)}><Check className="h-3.5 w-3.5" /></Button>}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteNotif(n)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
