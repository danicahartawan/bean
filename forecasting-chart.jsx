import React, { useLayoutEffect, useRef } from 'react';

// The plot can fill its card without stretching the letters on its axes.
export function ReadableChart({children, ...props}) {
  const ref = useRef(null);
  useLayoutEffect(()=>{
    const svg = ref.current;
    function sizeLabels() {
      const matrix = svg.getScreenCTM?.();
      if(!matrix) return;
      const scaleX = Math.hypot(matrix.a,matrix.b);
      const scaleY = Math.hypot(matrix.c,matrix.d);
      if(!scaleX || !scaleY) return;
      svg.querySelectorAll('text').forEach(text=>{
        const x = Number(text.getAttribute('x') || 0);
        const y = Number(text.getAttribute('y') || 0);
        text.setAttribute('transform',`translate(${x} ${y}) scale(${1/scaleX} ${1/scaleY}) translate(${-x} ${-y})`);
      });
    }
    sizeLabels();
    if(typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sizeLabels);
    observer.observe(svg);
    return ()=>observer.disconnect();
  });
  return <svg ref={ref} {...props}>{children}</svg>;
}
