// WebGL fluid: neon ink that follows the pointer (compact Navier-Stokes solver).
(() => {
  const canvas = document.getElementById("fluid");
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) { canvas.style.background = "radial-gradient(circle at 30% 40%, #3b0d6b, #000 60%)"; return; }
  const SIM = 192, DYE = 768, VEL_DISS = 0.7, DYE_DISS = 0.55, PRESSURE = 0.8, ITER = 16, CURL = 8, SPLAT = 0.035;
  const vs = `#version 300 es
precision highp float; in vec2 aPos; out vec2 vUv, vL, vR, vT, vB; uniform vec2 texel;
void main(){ vUv = aPos*.5+.5; vL = vUv - vec2(texel.x,0.); vR = vUv + vec2(texel.x,0.); vT = vUv + vec2(0.,texel.y); vB = vUv - vec2(0.,texel.y); gl_Position = vec4(aPos,0.,1.); }`;
  const fs = (body) => `#version 300 es
precision highp float; precision highp sampler2D; in vec2 vUv, vL, vR, vT, vB; out vec4 o; ${body}`;
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const program = (frag) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs(frag))); gl.bindAttribLocation(p, 0, "aPos"); gl.linkProgram(p); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); } return { p, u }; };
  const P = {
    splat: program(`uniform sampler2D uT; uniform float ar, r; uniform vec3 col; uniform vec2 pt; void main(){ vec2 d = vUv - pt; d.x *= ar; vec3 b = texture(uT,vUv).xyz; o = vec4(b + exp(-dot(d,d)/r)*col, 1.); }`),
    adv: program(`uniform sampler2D uV, uS; uniform vec2 dt2, sTexel; uniform float dt, diss; void main(){ vec2 c = vUv - dt*texture(uV,vUv).xy*sTexel; vec4 r = texture(uS,c); o = r/(1.+diss*dt); }`),
    div: program(`uniform sampler2D uV; void main(){ float L=texture(uV,vL).x, R=texture(uV,vR).x, T=texture(uV,vT).y, B=texture(uV,vB).y; vec2 c = texture(uV,vUv).xy; if(vL.x<0.) L=-c.x; if(vR.x>1.) R=-c.x; if(vT.y>1.) T=-c.y; if(vB.y<0.) B=-c.y; o = vec4(.5*(R-L+T-B),0.,0.,1.); }`),
    curl: program(`uniform sampler2D uV; void main(){ float L=texture(uV,vL).y, R=texture(uV,vR).y, T=texture(uV,vT).x, B=texture(uV,vB).x; o = vec4(.5*(R-L-T+B),0.,0.,1.); }`),
    vort: program(`uniform sampler2D uV, uC; uniform float curl, dt; void main(){ float L=texture(uC,vL).x, R=texture(uC,vR).x, T=texture(uC,vT).x, B=texture(uC,vB).x, C=texture(uC,vUv).x; vec2 f = .5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+.0001; f *= curl*C; f.y *= -1.; vec2 v = texture(uV,vUv).xy + f*dt; o = vec4(clamp(v,-1000.,1000.),0.,1.); }`),
    press: program(`uniform sampler2D uP, uD; void main(){ float L=texture(uP,vL).x, R=texture(uP,vR).x, T=texture(uP,vT).x, B=texture(uP,vB).x; float d = texture(uD,vUv).x; o = vec4((L+R+B+T-d)*.25,0.,0.,1.); }`),
    clear: program(`uniform sampler2D uT; uniform float v; void main(){ o = v*texture(uT,vUv); }`),
    grad: program(`uniform sampler2D uP, uV; void main(){ float L=texture(uP,vL).x, R=texture(uP,vR).x, T=texture(uP,vT).x, B=texture(uP,vB).x; vec2 v = texture(uV,vUv).xy - vec2(R-L,T-B); o = vec4(v,0.,1.); }`),
    show: program(`uniform sampler2D uT; uniform vec2 texel; void main(){ vec3 c = texture(uT,vUv).rgb*.4; vec2 t = texel*2.; c += .075*(texture(uT,vUv+vec2(t.x,0.)).rgb+texture(uT,vUv-vec2(t.x,0.)).rgb+texture(uT,vUv+vec2(0.,t.y)).rgb+texture(uT,vUv-vec2(0.,t.y)).rgb+texture(uT,vUv+t).rgb+texture(uT,vUv-t).rgb+texture(uT,vUv+vec2(t.x,-t.y)).rgb+texture(uT,vUv+vec2(-t.x,t.y)).rgb); vec3 g = vec3(0.); for(int i=0;i<8;i++){ float a = float(i)*.785398; g += texture(uT,vUv+vec2(cos(a),sin(a))*texel*9.).rgb; } c += g*.05; c = c/(1.+max(max(c.r,c.g),c.b)*.2); o = vec4(c*1.5,1.); }`),
  };
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
  const idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
  const res = (base) => { const ar = gl.drawingBufferWidth / gl.drawingBufferHeight; const a = ar < 1 ? 1 / ar : ar; const mn = Math.round(base), mx = Math.round(base * a); return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: mx, h: mn } : { w: mn, h: mx }; };
  const fbo = (w, h, fmt, type, filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, gl.RGBA, type, null); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.viewport(0, 0, w, h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); return { t, f, w, h, tx: 1 / w, ty: 1 / h, bind(n) { gl.activeTexture(gl.TEXTURE0 + n); gl.bindTexture(gl.TEXTURE_2D, t); return n; } }; };
  const dbl = (w, h, fmt, type, filter) => { let a = fbo(w, h, fmt, type, filter), b = fbo(w, h, fmt, type, filter); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; } }; };
  let vel, dye, dvg, crl, prs;
  const init = () => { canvas.width = innerWidth * Math.min(devicePixelRatio, 1.5); canvas.height = innerHeight * Math.min(devicePixelRatio, 1.5); const s = res(SIM), d = res(DYE); vel = dbl(s.w, s.h, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR); dye = dbl(d.w, d.h, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR); dvg = fbo(s.w, s.h, gl.RGBA16F, gl.HALF_FLOAT, gl.NEAREST); crl = fbo(s.w, s.h, gl.RGBA16F, gl.HALF_FLOAT, gl.NEAREST); prs = dbl(s.w, s.h, gl.RGBA16F, gl.HALF_FLOAT, gl.NEAREST); };
  const blit = (target) => { if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); } else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); } gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); };
  const use = (pr, texel) => { gl.useProgram(pr.p); if (pr.u.texel) gl.uniform2f(pr.u.texel, texel.tx, texel.ty); };
  const splat = (x, y, dx, dy, col) => {
    use(P.splat, vel.r); gl.uniform1i(P.splat.u.uT, vel.r.bind(0)); gl.uniform1f(P.splat.u.ar, canvas.width / canvas.height); gl.uniform2f(P.splat.u.pt, x, y); gl.uniform3f(P.splat.u.col, dx, dy, 0); gl.uniform1f(P.splat.u.r, SPLAT / 100 * (canvas.width > canvas.height ? 1 : canvas.height / canvas.width)); blit(vel.w); vel.swap();
    use(P.splat, dye.r); gl.uniform1i(P.splat.u.uT, dye.r.bind(0)); gl.uniform3f(P.splat.u.col, col[0], col[1], col[2]); blit(dye.w); dye.swap();
  };
  const hsv = (h, s, v) => { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); return [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6]; };
  const color = () => { const c = hsv(Math.random(), 1, 1); return c.map((x) => x * 0.9); };
  const step = (dt) => {
    gl.disable(gl.BLEND);
    use(P.curl, vel.r); gl.uniform1i(P.curl.u.uV, vel.r.bind(0)); blit(crl);
    use(P.vort, vel.r); gl.uniform1i(P.vort.u.uV, vel.r.bind(0)); gl.uniform1i(P.vort.u.uC, crl.bind(1)); gl.uniform1f(P.vort.u.curl, CURL); gl.uniform1f(P.vort.u.dt, dt); blit(vel.w); vel.swap();
    use(P.div, vel.r); gl.uniform1i(P.div.u.uV, vel.r.bind(0)); blit(dvg);
    use(P.clear, prs.r); gl.uniform1i(P.clear.u.uT, prs.r.bind(0)); gl.uniform1f(P.clear.u.v, PRESSURE); blit(prs.w); prs.swap();
    use(P.press, vel.r); gl.uniform1i(P.press.u.uD, dvg.bind(1)); for (let i = 0; i < ITER; i++) { gl.uniform1i(P.press.u.uP, prs.r.bind(0)); blit(prs.w); prs.swap(); }
    use(P.grad, vel.r); gl.uniform1i(P.grad.u.uP, prs.r.bind(0)); gl.uniform1i(P.grad.u.uV, vel.r.bind(1)); blit(vel.w); vel.swap();
    use(P.adv, vel.r); gl.uniform2f(P.adv.u.sTexel, vel.r.tx, vel.r.ty); gl.uniform1i(P.adv.u.uV, vel.r.bind(0)); gl.uniform1i(P.adv.u.uS, vel.r.bind(0)); gl.uniform1f(P.adv.u.dt, dt); gl.uniform1f(P.adv.u.diss, VEL_DISS); blit(vel.w); vel.swap();
    use(P.adv, dye.r); gl.uniform2f(P.adv.u.sTexel, vel.r.tx, vel.r.ty); gl.uniform1i(P.adv.u.uV, vel.r.bind(0)); gl.uniform1i(P.adv.u.uS, dye.r.bind(1)); gl.uniform1f(P.adv.u.diss, DYE_DISS); blit(dye.w); dye.swap();
  };
  const draw = () => { use(P.show, dye.r); gl.uniform1i(P.show.u.uT, dye.r.bind(0)); blit(null); };
  init(); addEventListener("resize", init);
  for (let i = 0; i < 9; i++) splat(Math.random(), Math.random(), (Math.random() - .5) * 1200, (Math.random() - .5) * 1200, color());
  let last = null, hue = 0;
  const move = (x, y) => { const nx = x / innerWidth, ny = 1 - y / innerHeight; if (last) { const dx = (nx - last.x) * 2200, dy = (ny - last.y) * 2200; if (Math.abs(dx) + Math.abs(dy) > 0) { hue = (hue + .004) % 1; splat(nx, ny, dx, dy, hsv(hue, 1, 1).map((c) => c * 0.9)); } } last = { x: nx, y: ny }; };
  addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  addEventListener("touchmove", (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
  addEventListener("touchstart", () => { last = null; }, { passive: true });
  let prev = performance.now();
  const frame = (now) => { const dt = Math.min((now - prev) / 1000, 0.016666); prev = now; step(dt); draw(); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
})();

document.querySelectorAll('a[href^="../new"]').forEach((a) => a.addEventListener("click", () => { try { sessionStorage.setItem("bean-hello", "1"); } catch (e) {} }));

// Click to spawn a bean.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("a")) return;
    const size = 70 + Math.random() * 60, rot = (Math.random() - 0.5) * 80;
    const wrap = document.createElement("div");
    wrap.className = "bean-spawn";
    wrap.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${size}px;--r:${rot}deg;--dx:${(Math.random() - 0.5) * 120}px`;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 90");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M22 66C-2 44 14 8 56 8c34 0 62 18 52 48-8 22-32 22-42 8-7-10-20-8-22 4-2 14-10 14-22 2z");
    path.setAttribute("transform", "rotate(-8 60 45)");
    path.setAttribute("fill", ["#2f6f52", "#3f8f68", "#1f5a40"][Math.floor(Math.random() * 3)]);
    svg.appendChild(path); wrap.appendChild(svg); document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 5200);
  });
})();
