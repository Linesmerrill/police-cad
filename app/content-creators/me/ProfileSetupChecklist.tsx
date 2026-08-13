'use client';

import { CheckCircleIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Only the parts of the creator profile this card judges. Kept structural
// rather than importing the page's full interface, so a field added there does
// not drag this along with it.
interface SetupProfile {
  bio?: string;
  profileImage?: string;
  slug?: string;
  entitlements?: {
    communityPlan?: { active?: boolean };
  };
}

interface Props {
  profile: SetupProfile;
  onEditProfile: () => void;
}

interface Task {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  action?: { label: string; onClick: () => void };
}

// A public profile with no bio and no picture is worse than no profile — it
// reads as abandoned to anyone who lands on it. This is the nudge, shown only
// while there is something to nudge about.
export default function ProfileSetupChecklist({ profile, onEditProfile }: Props) {
  const tasks: Task[] = [
    {
      key: 'bio',
      label: 'Write your bio',
      detail: 'A couple of sentences on you and the content you make. This is the first thing people read on your profile.',
      done: !!(profile.bio || '').trim(),
      action: { label: 'Write it', onClick: onEditProfile },
    },
    {
      key: 'image',
      label: 'Add a profile picture',
      detail: 'Your channel avatar works. Profiles with a picture get looked at; ones without get scrolled past.',
      done: !!(profile.profileImage || '').trim(),
      action: { label: 'Upload one', onClick: onEditProfile },
    },
    {
      key: 'community',
      label: 'Pick the community to boost',
      detail: 'Your free community upgrade has to be pointed at one of your communities before it does anything.',
      done: !!profile.entitlements?.communityPlan?.active,
    },
  ];

  const remaining = tasks.filter((t) => !t.done);
  if (remaining.length === 0) return null;

  const done = tasks.length - remaining.length;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.07) 0%, rgba(251, 191, 36, 0.02) 100%)',
        border: '1px solid rgba(251, 191, 36, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <SparklesIcon style={{ width: '20px', height: '20px', color: '#fbbf24', flexShrink: 0 }} />
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
          Finish setting up your profile
        </h3>
      </div>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 18px', lineHeight: 1.6 }}>
        {done === 0
          ? 'Your profile is live. These are the parts we could not fill in for you.'
          : `${done} of ${tasks.length} done. ${remaining.length} left.`}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tasks.map((task) => (
          <div
            key={task.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: task.done ? 'rgba(34, 197, 94, 0.06)' : 'rgba(0, 0, 0, 0.22)',
              border: `1px solid ${task.done ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.07)'}`,
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <CheckCircleIcon
              style={{
                width: '20px',
                height: '20px',
                flexShrink: 0,
                marginTop: '1px',
                color: task.done ? '#4ade80' : 'rgba(255,255,255,0.25)',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: task.done ? 'rgba(255,255,255,0.55)' : '#fff',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}
              >
                {task.label}
              </div>
              {!task.done && (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginTop: '3px', lineHeight: 1.55 }}>
                  {task.detail}
                </div>
              )}
            </div>
            {!task.done && task.action && (
              <button
                onClick={task.action.onClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.action.label}
                <ArrowRightIcon style={{ width: '13px', height: '13px' }} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
