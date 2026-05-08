'use client';

import React from 'react';

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'card' | 'button' | 'primary-btn' | 'icon' | 'custom';
  showEffect?: boolean;
  showShine?: boolean;
  as?: keyof JSX.IntrinsicElements;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * LiquidGlass — 四层液体玻璃架构
 *
 * Layer 1 (.liquid-effect): SVG feTurbulence 动态扭曲
 * Layer 2 (.liquid-tint):   backdrop-filter 模糊 + 着色
 * Layer 3 (.liquid-shine):  镜面高光渐变叠加
 * Layer 4 (.liquid-content): 内容层
 */
export function LiquidGlass({
  children,
  className = '',
  variant = 'card',
  showEffect = true,
  showShine = true,
  as: Component = 'div',
  onClick,
  style,
}: LiquidGlassProps) {
  const variantClass =
    variant === 'card' ? 'glass-card-lg' :
    variant === 'button' ? 'glass-btn-lg' :
    variant === 'primary-btn' ? 'glass-btn-lg glass-btn-primary' :
    variant === 'icon' ? 'community-icon-lg' : '';

  return (
    <Component
      className={`${variantClass} ${className}`}
      onClick={onClick}
      style={style}
    >
      {showEffect && <div className="liquid-effect" aria-hidden="true" />}
      <div className="liquid-tint" aria-hidden="true" />
      {showShine && <div className="liquid-shine" aria-hidden="true" />}
      <div className="liquid-content">{children}</div>
    </Component>
  );
}

/**
 * GlassBadge — 玻璃标签
 */
export function GlassBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`glass-badge-lg ${className}`}>
      <div className="liquid-tint" aria-hidden="true" />
      <div className="liquid-shine" aria-hidden="true" />
      <span className="liquid-content" style={{ position: 'relative', zIndex: 4 }}>
        {children}
      </span>
    </span>
  );
}
