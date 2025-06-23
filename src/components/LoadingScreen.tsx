import { useEffect, useRef } from 'react';
import lottieWeb from 'lottie-web';

interface Props {
  onFinish: () => void;
  duration?: number; // ms
}

export default function LoadingScreen({ onFinish, duration = 2000 }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<HTMLDivElement | null>(null);

  // fade-out control
  useEffect(() => {
    const timer = setTimeout(() => {
      if (wrapperRef.current) {
        wrapperRef.current.style.opacity = '0';
      }
      // wait for css transition
      setTimeout(onFinish, 500);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onFinish]);

  // init lottie once
  useEffect(() => {
    if (!animRef.current) return;
    const anim = lottieWeb.loadAnimation({
      container: animRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/Animation - loading.json',
    });
    return () => anim.destroy();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-white transition-opacity duration-500 z-50"
      style={{ opacity: 1 }}
    >
      <div ref={animRef} className="w-48 h-48" />
      <img src="/swishmint-logo.png" alt="logo" className="h-44 w-auto" />
    </div>
  );
}
