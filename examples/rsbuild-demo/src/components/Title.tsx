import React, { type JSX } from 'react';
import './Title.css';

interface TitleProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'default' | 'gradient' | 'accent' | 'muted';
  size?: 'small' | 'medium' | 'large' | 'xl' | '2xl';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const Title: React.FC<TitleProps> = ({
  children,
  level = 1,
  variant = 'default',
  size = 'large',
  align = 'left',
  className = ''
}) => {
  const baseClasses = 'title';
  const variantClasses = `title--${variant}`;
  const sizeClasses = `title--${size}`;
  const alignClasses = `title--${align}`;
  
  const titleClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    alignClasses,
    className
  ].filter(Boolean).join(' ');

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag className={titleClasses}>
      {children}
    </Tag>
  );
};
