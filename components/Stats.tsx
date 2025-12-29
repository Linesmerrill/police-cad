'use client';

import { useState, useEffect, useRef } from 'react';

const stats = [
  { label: 'Active Communities', value: '10K+', description: 'Role-play communities worldwide' },
  { label: 'Users', value: '500K+', description: 'Active users across all platforms' },
  { label: 'Free Forever', value: '100%', description: 'Premium tiers available but completely optional' },
  { label: 'Uptime', value: '99.9%', description: 'Reliable service you can count on' },
];

// Calculate page views based on linear growth from Jan 2015
// Uses a known reference point (46,987,700 views on Dec 29, 2024) to calculate growth rate
// Then applies that rate to current timestamp to get real-time count
// This ensures the counter continues to increase forever based on time elapsed
function calculatePageViews(): number {
  try {
    const startDate = new Date('2015-01-01T00:00:00Z');
    const currentDate = new Date();
    
    // Known reference point: 46,987,700 views on December 29, 2024
    const referenceDate = new Date('2024-12-29T00:00:00Z');
    const referenceViews = 46987700;
    
    // Calculate total milliseconds between start and reference date
    const referenceTimeMs = referenceDate.getTime() - startDate.getTime();
    
    // Prevent division by zero
    if (referenceTimeMs <= 0) {
      return referenceViews;
    }
    
    // Calculate views per millisecond based on reference point
    const viewsPerMs = referenceViews / referenceTimeMs;
    
    // Calculate current views based on elapsed time from start date
    const elapsedTimeMs = currentDate.getTime() - startDate.getTime();
    
    // Ensure elapsed time is valid
    if (elapsedTimeMs < 0 || !isFinite(elapsedTimeMs)) {
      return referenceViews;
    }
    
    const currentViews = elapsedTimeMs * viewsPerMs;
    
    // Ensure it's always increasing (never goes backwards) and is a valid number
    const result = Math.max(Math.floor(currentViews), referenceViews);
    return isFinite(result) ? result : referenceViews;
  } catch (error) {
    // Return reference value on any error
    return 46987700;
  }
}


function formatNumberWithCommas(num: number): string {
  return num.toLocaleString('en-US');
}

function getCurrentDateString(): string {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();
  return `Live as of ${month} ${day}, ${year}`;
}

// Simple confetti effect using canvas
function triggerConfetti() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  try {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (canvas.parentNode) {
        document.body.removeChild(canvas);
      }
      return;
    }

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
      createdAt: number;
    }> = [];

    const colors = ['#fbbf24', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const startTime = Date.now();
    const pourDuration = 2000; // Pour for 2 seconds
    const totalParticles = 300; // More particles total

    let animationFrame: number | null = null;
    let particleCreationInterval: NodeJS.Timeout | null = null;

    // Create particles over time (pour effect)
    const createParticleBatch = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < pourDuration) {
        // Create a batch of particles
        const batchSize = 15;
        for (let i = 0; i < batchSize && confetti.length < totalParticles; i++) {
          confetti.push({
            x: Math.random() * canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2 + 1.5, // Slower initial velocity
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            createdAt: Date.now()
          });
        }
      } else {
        // Stop creating particles after pour duration
        if (particleCreationInterval) {
          clearInterval(particleCreationInterval);
          particleCreationInterval = null;
        }
      }
    };

    // Start pouring particles
    createParticleBatch();
    particleCreationInterval = setInterval(createParticleBatch, 50); // Create particles every 50ms

    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = confetti.length - 1; i >= 0; i--) {
        const particle = confetti[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;
        particle.vy += 0.08; // Slower gravity for longer fall

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        ctx.restore();

        // Remove particles that are well off screen (give them more room)
        if (particle.y > canvas.height + 100) {
          confetti.splice(i, 1);
        }
      }

      // Continue animation if there are particles or still pouring
      if (confetti.length > 0 || Date.now() - startTime < pourDuration + 1000) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Clean up
        window.removeEventListener('resize', handleResize);
        if (particleCreationInterval) {
          clearInterval(particleCreationInterval);
          particleCreationInterval = null;
        }
        if (canvas.parentNode) {
          document.body.removeChild(canvas);
        }
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
      }
    };

    animate();
  } catch (error) {
    // Silently fail if confetti can't be created (e.g., in test environments)
    // No need to log as this is a non-critical visual effect
  }
}

export default function Stats() {
  const [displayViews, setDisplayViews] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const lastMillionRef = useRef<number>(0);

  useEffect(() => {
    setIsMounted(true);
    
    try {
      const initialViews = calculatePageViews();
      setDisplayViews(initialViews);
      lastMillionRef.current = Math.floor(initialViews / 1000000);
      
      const interval = setInterval(() => {
        try {
          const newViews = calculatePageViews();
          setDisplayViews(newViews);
          
          // Check if we've crossed a new million milestone
          const currentMillion = Math.floor(newViews / 1000000);
          if (currentMillion > lastMillionRef.current) {
            lastMillionRef.current = currentMillion;
            triggerConfetti();
          }
        } catch (error) {
          // Silently handle calculation errors to prevent breaking the UI
        }
      }, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      // Fallback to default value if calculation fails
      setDisplayViews(46987700);
    }
  }, []);

  return (
    <div 
      style={{
        backgroundColor: 'transparent',
        paddingTop: '4rem',
        paddingBottom: '4rem',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        borderTop: '1px solid rgba(59, 130, 246, 0.1)',
        width: '100%',
        maxWidth: '100vw',
        display: 'block',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1
      }}
    >
      <div 
        style={{
          maxWidth: 'min(100%, 80rem)',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 1.5rem)',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        {/* Full-width Page Views Card */}
        <div
          style={{
            width: '100%',
            marginTop: '1rem',
            marginBottom: '2rem',
            padding: '2rem',
            borderRadius: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            textAlign: 'center',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease',
            position: 'relative',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.zIndex = '10';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.zIndex = '1';
          }}
        >
          <div style={{
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontWeight: '700',
            color: '#fbbf24',
            lineHeight: '1.2',
            marginBottom: '0.5rem',
            textShadow: '0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.4)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            transition: 'all 0.1s ease',
            letterSpacing: '0.02em'
          }}>
            {isMounted ? formatNumberWithCommas(displayViews) : '47,000,000'}
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '0.25rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Page Views
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontStyle: 'italic'
          }}>
            {getCurrentDateString()}
          </div>
        </div>

        {/* Other Stats Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                borderRadius: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                transition: 'all 0.3s ease',
                opacity: 1,
                boxSizing: 'border-box',
                minWidth: 0,
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.zIndex = '1';
              }}
            >
              <div style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: '#fbbf24',
                lineHeight: '1',
                marginBottom: '0.5rem',
                textShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.25rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

