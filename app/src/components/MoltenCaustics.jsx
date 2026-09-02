import React, { useRef, useEffect } from 'react';

const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 vUv;
  
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_time;
  uniform float u_scale;
  uniform float u_glow;
  uniform float u_coreSize;
  uniform float u_swirl;
  uniform float u_fold;
  uniform float u_blackPoint;
  uniform float u_brightness;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  
  // Noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 p = (vUv - 0.5) * u_scale;
    p.x *= u_resolution.x / u_resolution.y;
    
    // Add mouse drift
    p -= u_mouse * 0.5;

    // Add swirl
    float r = length(p);
    float a = atan(p.y, p.x) + u_swirl * r + u_time * 0.1;
    p = r * vec2(cos(a), sin(a));

    float f = 0.0;
    float time = u_time * 0.5;
    
    // Iterative domain folding
    for (int i = 0; i < 5; i++) {
        p += vec2(snoise(p + time), snoise(p.yx - time)) * u_fold;
        f += abs(snoise(p));
        p *= 1.5;
        time *= 1.2;
    }
    
    // Dark background baseline
    vec3 bg = vec3(0.02, 0.02, 0.05); // Very dark blue/black
    
    float filament = pow(1.0 - f * 0.15, u_glow * 2.0);
    float core = pow(filament, 1.0 / max(u_coreSize, 0.01));
    
    vec3 color = mix(u_color1, u_color2, filament);
    color = mix(color, u_color3, core);
    
    color = max(color - u_blackPoint, 0.0) * u_brightness;
    
    // Add deep background
    color = mix(bg, color, clamp(filament + core, 0.0, 1.0));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [0, 0, 0];
};

export default function MoltenCaustics({
  color1 = '#5227FF',
  color2 = '#FF9FFC',
  color3 = '#FFFFFF',
  speed = 0.35,
  scale = 4,
  detail = 3,
  glow = 1.6,
  coreSize = 0.1,
  swirl = 1,
  fold = -0.2,
  blackPoint = 0.05,
  brightness = 1.3,
  colorMode = 'molten',
  grain = true,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseStrength = 0.3,
  opacity = 1.0,
  className = ''
}) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    
    if (!gl) return;
    
    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    gl.useProgram(program);
    
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    const uniforms = {
      u_color1: gl.getUniformLocation(program, 'u_color1'),
      u_color2: gl.getUniformLocation(program, 'u_color2'),
      u_color3: gl.getUniformLocation(program, 'u_color3'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_scale: gl.getUniformLocation(program, 'u_scale'),
      u_glow: gl.getUniformLocation(program, 'u_glow'),
      u_coreSize: gl.getUniformLocation(program, 'u_coreSize'),
      u_swirl: gl.getUniformLocation(program, 'u_swirl'),
      u_fold: gl.getUniformLocation(program, 'u_fold'),
      u_blackPoint: gl.getUniformLocation(program, 'u_blackPoint'),
      u_brightness: gl.getUniformLocation(program, 'u_brightness'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_mouse: gl.getUniformLocation(program, 'u_mouse'),
    };
    
    let animationFrameId;
    let startTime = performance.now();
    
    let targetMouse = { x: 0, y: 0 };
    let currentMouse = { x: 0, y: 0 };
    
    const handleMouseMove = (e) => {
      if (mouseInteraction) {
        const rect = canvas.getBoundingClientRect();
        targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        targetMouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    const render = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.05;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.05;
      
      const currentTime = performance.now();
      const elapsedTime = (currentTime - startTime) * 0.001 * speed;
      
      gl.uniform3fv(uniforms.u_color1, hexToRgb(color1));
      gl.uniform3fv(uniforms.u_color2, hexToRgb(color2));
      gl.uniform3fv(uniforms.u_color3, hexToRgb(color3));
      gl.uniform1f(uniforms.u_time, elapsedTime);
      gl.uniform1f(uniforms.u_scale, scale);
      gl.uniform1f(uniforms.u_glow, glow);
      gl.uniform1f(uniforms.u_coreSize, coreSize);
      gl.uniform1f(uniforms.u_swirl, swirl);
      gl.uniform1f(uniforms.u_fold, fold);
      gl.uniform1f(uniforms.u_blackPoint, blackPoint);
      gl.uniform1f(uniforms.u_brightness, brightness);
      gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.u_mouse, currentMouse.x * mouseStrength, currentMouse.y * mouseStrength);
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [color1, color2, color3, speed, scale, detail, glow, coreSize, swirl, fold, blackPoint, brightness]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      style={{ 
        opacity,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: mouseInteraction ? 'auto' : 'none' 
      }} 
    />
  );
}
