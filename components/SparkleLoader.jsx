'use client';

import { useEffect, useRef } from 'react';

const PI = Math.PI;
const TAU = PI * 2;

class Particle {
  constructor(opt) {
    this.x = opt.x;
    this.y = opt.y;
    this.angle = opt.angle;
    this.speed = opt.speed;
    this.accel = opt.accel;
    this.radius = 7;
    this.decay = 0.01;
    this.life = 1;
  }

  step() {
    this.speed += this.accel;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.angle += PI / 64;
    this.accel *= 1.01;
    this.life -= this.decay;
  }

  draw(ctx, tick, prev) {
    // Tuned for a white background: solid saturated hue at ~50% lightness
    // (the original 60%-lightness + 'lighter' blend was designed for black).
    ctx.fillStyle = `hsla(${tick + this.life * 120}, 90%, 50%, ${this.life})`;
    ctx.strokeStyle = `hsla(${tick + this.life * 120}, 90%, 50%, ${this.life})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (prev) {
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(prev.x, prev.y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.001, this.life * this.radius), 0, TAU);
    ctx.fill();

    const size = Math.random() * 1.5;
    ctx.fillRect(
      ~~(this.x + (Math.random() - 0.5) * 35 * this.life),
      ~~(this.y + (Math.random() - 0.5) * 35 * this.life),
      size,
      size
    );
  }
}

export default function SparkleLoader({ size = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = size;
    const height = size;
    const min = width * 0.5;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    // No 'lighter' blend here — that mode only adds brightness, which is
    // invisible against a white canvas. Plain source-over works on white.

    let particles = [];
    let globalAngle = 0;
    let tick = 0;
    let lastFrame = 0;
    let rafId;
    let alive = true;

    function step() {
      particles.push(
        new Particle({
          x: width / 2 + (Math.cos(tick / 20) * min) / 2,
          y: height / 2 + (Math.sin(tick / 20) * min) / 2,
          angle: globalAngle,
          speed: 0,
          accel: 0.01
        })
      );

      particles.forEach((p) => p.step());
      particles = particles.filter((p) => p.life > 0);

      globalAngle += PI / 3;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => p.draw(ctx, tick, particles[i - 1]));
    }

    function loop() {
      if (!alive) return;
      rafId = window.requestAnimationFrame(loop);
      const now = Date.now();
      const diff = now - lastFrame;
      if (diff >= 1000 / 60) {
        lastFrame = now;
        step();
        draw();
        tick++;
      }
    }

    loop();

    return () => {
      alive = false;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [size]);

  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
