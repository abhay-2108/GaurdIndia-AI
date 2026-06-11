import { useEffect, useRef } from 'react';

export const useBehavioralTracker = () => {
  const telemetry = useRef({
    clickDurations: [],
    scrollDepth: 0,
    totalDistance: 0,
    keystrokes: 0,
    clickTimes: [],
    trajectory: [],
    startTime: Date.now()
  });

  const lastPos = useRef({ x: null, y: null });
  const lastMouseUpTime = useRef(null);
  const clickStart = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const t = (Date.now() - telemetry.current.startTime) / 1000.0;
      
      // Store in trajectory
      if (telemetry.current.trajectory.length < 150) {
        telemetry.current.trajectory.push([x, y, t]);
      }
      
      // Calculate total distance
      if (lastPos.current.x !== null) {
        const dx = x - lastPos.current.x;
        const dy = y - lastPos.current.y;
        telemetry.current.totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
      lastPos.current = { x, y };
    };

    const handleMouseDown = () => {
      clickStart.current = Date.now();
      
      if (lastMouseUpTime.current !== null) {
        const diff = (Date.now() - lastMouseUpTime.current) / 1000.0;
        telemetry.current.clickTimes.push(diff);
      }
    };

    const handleMouseUp = () => {
      if (clickStart.current !== null) {
        const duration = (Date.now() - clickStart.current) / 1000.0;
        telemetry.current.clickDurations.push(duration);
        clickStart.current = null;
      }
      lastMouseUpTime.current = Date.now();
    };

    const handleKeyDown = () => {
      telemetry.current.keystrokes += 1;
    };

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > telemetry.current.scrollDepth) {
        telemetry.current.scrollDepth = currentScroll;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const getPayload = () => {
    const data = telemetry.current;
    
    const avgClickDuration = data.clickDurations.length > 0 
      ? data.clickDurations.reduce((a, b) => a + b, 0) / data.clickDurations.length 
      : 0.25;
      
    const clickFreq = data.clickDurations.length;
    const timeSinceLastClick = data.clickTimes.length > 0 
      ? data.clickTimes[data.clickTimes.length - 1] 
      : 1.5;

    return {
      click_duration: parseFloat(avgClickDuration.toFixed(3)),
      scroll_depth: parseFloat(data.scrollDepth.toFixed(1)),
      mouse_movement: parseFloat(data.totalDistance.toFixed(1)),
      keystrokes_detected: parseFloat(data.keystrokes.toFixed(1)),
      click_frequency: parseFloat(clickFreq.toFixed(1)),
      time_since_last_click: parseFloat(timeSinceLastClick.toFixed(3)),
      mouse_trajectory: data.trajectory.length > 0 ? data.trajectory : [[100.0, 200.0, 0.0], [105.0, 205.0, 0.05], [110.0, 210.0, 0.1]]
    };
  };

  const reset = () => {
    telemetry.current = {
      clickDurations: [],
      scrollDepth: 0,
      totalDistance: 0,
      keystrokes: 0,
      clickTimes: [],
      trajectory: [],
      startTime: Date.now()
    };
    lastPos.current = { x: null, y: null };
    lastMouseUpTime.current = null;
    clickStart.current = null;
  };

  return { getPayload, reset };
};
