import { useState, useEffect } from 'react';

export const useWebGLFingerprint = () => {
  const [fingerprint, setFingerprint] = useState('');

  useEffect(() => {
    const getWebGLFingerprint = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl-support';
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
        
        const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision || 0;
        
        // Render a small scene
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}');
        gl.compileShader(vs);
        
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, 'void main(){gl_FragColor=vec4(0.5,0.1,0.9,1.0);}');
        gl.compileShader(fs);
        
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        
        const pLoc = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(pLoc);
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        const pixels = new Uint8Array(16);
        gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        
        // Hash the combination of vendor, renderer, shader precision, and rendered pixels
        const rawData = `${vendor}_${renderer}_${precision}_${pixels.join(',')}`;
        let hash = 0;
        for (let i = 0; i < rawData.length; i++) {
          hash = (hash << 5) - hash + rawData.charCodeAt(i);
          hash |= 0;
        }
        return `gpu_${Math.abs(hash).toString(16)}`;
      } catch (e) {
        return `webgl-exception-${Math.random().toString(36).substring(2, 6)}`;
      }
    };
    
    setFingerprint(getWebGLFingerprint());
  }, []);

  return fingerprint;
};
