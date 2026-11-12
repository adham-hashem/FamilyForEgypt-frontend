import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Check, Users } from 'lucide-react';
import { Badge, Button, LinkButton, useToast } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatNumber } from '../lib/format';
import type { AttendanceState, PostDetail } from '../lib/types';

// ---------- "I will attend" ----------

export function AttendBox({ post }: { post: PostDetail }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const ended = new Date(post.eventEndsAt ?? post.eventStartsAt ?? 0) < new Date();
  const toggle = useMutation({
    mutationFn: () => api<AttendanceState>(`/api/posts/${post.id}/attend`, { method: post.isAttending ? 'DELETE' : 'POST' }),
    onSuccess: (state) => {
      queryClient.setQueryData<PostDetail>(['post', String(post.id)], (current) => (current ? { ...current, ...state } : current));
      toast(state.isAttending ? 'سجّلنا حضورك. نراك هناك!' : 'تم إلغاء تسجيل الحضور.');
    },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="flex items-center gap-2 font-bold text-ink-700">
        <Users className="size-5 text-brand-600" />
        {post.attendeesCount > 0 ? `${formatNumber(post.attendeesCount)} سجّلوا حضورهم` : 'كن أول من يسجّل حضوره'}
      </p>
      {post.checkedIn ? (
        <Badge tone="green"><Check className="size-3.5" /> تم تسجيل حضورك في الفعالية</Badge>
      ) : ended ? null : !user ? (
        <LinkButton to={`/login?next=${encodeURIComponent(`/activities/${post.id}`)}`} variant="primary" size="sm">سجّل الدخول لتأكيد حضورك</LinkButton>
      ) : (
        <Button variant={post.isAttending ? 'outline' : 'gold'} size="sm" loading={toggle.isPending} onClick={() => toggle.mutate()}>
          <CalendarCheck className="size-4" /> {post.isAttending ? 'مسجَّل — إلغاء الحضور' : 'سأحضر'}
        </Button>
      )}
    </div>
  );
}
