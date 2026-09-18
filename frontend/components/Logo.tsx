/**
 * Handle Logo Component
 *
 * A rounded-square badge outline with a bold "@" inside - literal, since a
 * GitHub handle is always written as @username.
 *
 * Variants:
 * - "full": Mark + Wordmark (for desktop/larger spaces)
 * - "mark": Mark only (for mobile/compact spaces)
 * - "wordmark": Wordmark only
 */

import React from 'react';

export type LogoVariant = 'full' | 'mark' | 'wordmark';
export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoTheme = 'light' | 'dark';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
}

const sizeMap = {
  sm: { mark: 'w-6 h-6', text: 'text-base' },
  md: { mark: 'w-8 h-8', text: 'text-xl' },
  lg: { mark: 'w-10 h-10', text: 'text-2xl' },
};

export function Logo({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  className = '',
}: LogoProps) {
  const colorClass = theme === 'dark' ? 'text-foreground' : 'text-background';
  const { mark: markSize, text: textSize } = sizeMap[size];

  const AtMark = () => (
    <div
      className={`${markSize} rounded-[28%] border-[1.6px] flex items-center justify-center font-extrabold shrink-0`}
      style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontSize: '0.62em', fontFamily: 'var(--font-display)' }}
      aria-label="Handle Logo"
    >
      @
    </div>
  );

  const Wordmark = () => (
    <span
      className={`${textSize} font-extrabold ${colorClass} font-[family-name:var(--font-display)] transition-colors`}
      style={{ letterSpacing: '-0.01em' }}
    >
      Handle
    </span>
  );

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <AtMark />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <AtMark />
      <Wordmark />
    </div>
  );
}

export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="full" />;
}

export function LogoMark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="mark" />;
}

export function LogoWordmark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="wordmark" />;
}
