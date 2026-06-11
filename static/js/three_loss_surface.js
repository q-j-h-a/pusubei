// Three.js renderer for the 3D loss surface card.

(function () {
  const SURFACE_COLOR = 0x7fb3ff;
  const PLANE_W_COLOR = 0xf59e0b;
  const PLANE_B_COLOR = 0x8b5cf6;
  const DW_TANGENT_COLOR = 0xef4444;
  const DB_TANGENT_COLOR = 0x0f9f78;
  const GRADIENT_DIR_COLOR = 0x2563eb;

  function createThreeLossSurfaceChart(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 0);
    container.innerHTML = "";
    container.classList.add("three-loss-surface");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    const root = new THREE.Group();
    scene.add(root);

    const state = {
      option: null,
      objects: [],
      beta: -0.62,
      alpha: 0.42,
      distance: 9.4,
      dragging: false,
      lastX: 0,
      lastY: 0,
    };

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(4, 8, 6);
    scene.add(light);

    const note = document.createElement("div");
    note.className = "three-loss-note";
    note.textContent = "蓝色箭头：梯度下降方向；紫色切面：固定 b；橙色切面：固定 w";
    container.appendChild(note);

    function clearObjects() {
      state.objects.forEach(obj => {
        root.remove(obj);
        obj.traverse?.(child => {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose?.());
          else child.material?.dispose?.();
        });
      });
      state.objects = [];
    }

    function add(obj) {
      root.add(obj);
      state.objects.push(obj);
      return obj;
    }

    function setOption(option) {
      state.option = option;
      renderOption(option);
    }

    function getOption() {
      return state.option || { series: [] };
    }

    function dispose() {
      clearObjects();
      renderer.dispose();
      renderer.domElement.remove();
      note.remove();
    }

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateCamera();
      renderer.render(scene, camera);
    }

    function updateCamera() {
      const x = state.distance * Math.cos(state.alpha) * Math.sin(state.beta);
      const y = state.distance * Math.sin(state.alpha);
      const z = state.distance * Math.cos(state.alpha) * Math.cos(state.beta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    }

    function animateOnce() {
      resize();
      requestAnimationFrame(() => renderer.render(scene, camera));
    }

    function bindPointer() {
      renderer.domElement.addEventListener("pointerdown", event => {
        state.dragging = true;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        renderer.domElement.setPointerCapture?.(event.pointerId);
      });
      renderer.domElement.addEventListener("pointermove", event => {
        if (!state.dragging) return;
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.beta -= dx * 0.008;
        state.alpha = Math.max(-0.15, Math.min(1.12, state.alpha - dy * 0.006));
        animateOnce();
      });
      renderer.domElement.addEventListener("pointerup", event => {
        state.dragging = false;
        renderer.domElement.releasePointerCapture?.(event.pointerId);
      });
      renderer.domElement.addEventListener("wheel", event => {
        event.preventDefault();
        state.distance = Math.max(5.5, Math.min(15, state.distance + Math.sign(event.deltaY) * 0.55));
        animateOnce();
      }, { passive: false });
    }

    function renderOption(option) {
      clearObjects();
      const parsed = parseLossOption(option);
      if (!parsed.surface.length) return;

      const bounds = computeBounds(parsed);
      const project = pointProjector(bounds);
      addAxes(bounds, project);
      addSurface(parsed.surface, bounds, project);
      addCutPlane("b", parsed.current?.[1] ?? bounds.bMid, parsed.surface, bounds, project);
      addCutPlane("w", parsed.current?.[0] ?? bounds.wMid, parsed.surface, bounds, project);
      addLine(parsed.path, project, 0x111827, 0.045);
      addLine(parsed.wTangent, project, DW_TANGENT_COLOR, 0.05);
      addLine(parsed.bTangent, project, DB_TANGENT_COLOR, 0.05);
      addGradientDescentArrow(parsed.current, parsed.wTangent, parsed.bTangent, bounds, project);
      if (parsed.current) addPoint(parsed.current, project, 0x5b35f5, 0.14);
      if (parsed.best) addPoint(parsed.best, project, 0x0f9f78, 0.105);

      animateOnce();
    }

    function parseLossOption(option) {
      const series = Array.isArray(option?.series) ? option.series : [];
      const byName = name => series.find(item => item.name === name);
      return {
        surface: byName("Loss surface")?.data || [],
        path: byName("parameter path")?.data || [],
        current: byName("current params")?.data?.[0] || null,
        best: byName("best params")?.data?.[0] || null,
        wTangent: byName("dJ/dw tangent")?.data || [],
        bTangent: byName("dJ/db tangent")?.data || [],
      };
    }

    function computeBounds(parsed) {
      const all = [
        ...parsed.surface,
        ...parsed.path,
        parsed.current,
        parsed.best,
      ].filter(Boolean);
      const ws = all.map(p => Number(p[0])).filter(Number.isFinite);
      const bs = all.map(p => Number(p[1])).filter(Number.isFinite);
      const zs = all.map(p => Number(p[2])).filter(Number.isFinite);
      const wMin = Math.min(...ws);
      const wMax = Math.max(...ws);
      const bMin = Math.min(...bs);
      const bMax = Math.max(...bs);
      const zMin = Math.min(...zs);
      const zMax = Math.max(...zs);
      return {
        wMin, wMax, bMin, bMax, zMin, zMax,
        wMid: (wMin + wMax) / 2,
        bMid: (bMin + bMax) / 2,
        zMid: (zMin + zMax) / 2,
      };
    }

    function pointProjector(bounds) {
      const wSpan = bounds.wMax - bounds.wMin || 1;
      const bSpan = bounds.bMax - bounds.bMin || 1;
      const zSpan = bounds.zMax - bounds.zMin || 1;
      return p => new THREE.Vector3(
        ((Number(p[0]) - bounds.wMid) / wSpan) * 6.4,
        ((Number(p[2]) - bounds.zMid) / zSpan) * 3.35,
        -((Number(p[1]) - bounds.bMid) / bSpan) * 5.2
      );
    }

    function addAxes(bounds, project) {
      const group = new THREE.Group();
      const material = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.78 });
      const axes = [
        [[bounds.wMin, bounds.bMin, bounds.zMin], [bounds.wMax, bounds.bMin, bounds.zMin]],
        [[bounds.wMin, bounds.bMin, bounds.zMin], [bounds.wMin, bounds.bMax, bounds.zMin]],
        [[bounds.wMin, bounds.bMin, bounds.zMin], [bounds.wMin, bounds.bMin, bounds.zMax]],
      ];
      axes.forEach(axis => {
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(axis.map(project)), material));
      });
      add(group);
    }

    function addSurface(points, bounds, project) {
      const wAxis = uniqueSorted(points.map(p => Number(p[0])));
      const bAxis = uniqueSorted(points.map(p => Number(p[1])));
      const zMap = new Map(points.map(p => [`${p[0]}|${p[1]}`, Number(p[2])]));
      const vertices = [];
      const indices = [];
      bAxis.forEach(b => {
        wAxis.forEach(w => {
          const z = zMap.get(`${w}|${b}`) ?? bounds.zMin;
          const v = project([w, b, z]);
          vertices.push(v.x, v.y, v.z);
        });
      });
      for (let y = 0; y < bAxis.length - 1; y += 1) {
        for (let x = 0; x < wAxis.length - 1; x += 1) {
          const a = y * wAxis.length + x;
          indices.push(a, a + 1, a + wAxis.length, a + 1, a + wAxis.length + 1, a + wAxis.length);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshLambertMaterial({
          color: SURFACE_COLOR,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
        })
      );
      add(mesh);

      const wire = new THREE.WireframeGeometry(geometry);
      add(new THREE.LineSegments(wire, new THREE.LineBasicMaterial({ color: 0x315a91, transparent: true, opacity: 0.16 })));
    }

    function addCutPlane(axis, fixedValue, surface, bounds, project) {
      const isW = axis === "w";
      const color = isW ? PLANE_W_COLOR : PLANE_B_COLOR;
      const fixed = Number(fixedValue);
      const corners = isW
        ? [
            [fixed, bounds.bMin, bounds.zMin],
            [fixed, bounds.bMax, bounds.zMin],
            [fixed, bounds.bMax, bounds.zMax],
            [fixed, bounds.bMin, bounds.zMax],
          ]
        : [
            [bounds.wMin, fixed, bounds.zMin],
            [bounds.wMax, fixed, bounds.zMin],
            [bounds.wMax, fixed, bounds.zMax],
            [bounds.wMin, fixed, bounds.zMax],
          ];
      const verts = corners.map(project);
      const geometry = new THREE.BufferGeometry().setFromPoints(verts);
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      })));
      add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(verts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })));
      const section = sectionLine(axis, fixed, surface);
      addLine(section, project, color, 0.065);
    }

    function sectionLine(axis, fixed, surface) {
      const rows = surface
        .filter(p => Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])) && Number.isFinite(Number(p[2])));
      const keyIndex = axis === "w" ? 0 : 1;
      const freeIndex = axis === "w" ? 1 : 0;
      const levels = uniqueSorted(rows.map(p => Number(p[keyIndex])));
      const nearest = levels.reduce((best, value) => Math.abs(value - fixed) < Math.abs(best - fixed) ? value : best, levels[0] ?? fixed);
      return rows
        .filter(p => Math.abs(Number(p[keyIndex]) - nearest) < 1e-9)
        .sort((a, b) => Number(a[freeIndex]) - Number(b[freeIndex]));
    }

    function addLine(points, project, color, radius = 0.035) {
      if (!Array.isArray(points) || points.length < 2) return;
      const valid = points.filter(p => p && p.length >= 3).map(project);
      if (valid.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(valid);
      const geometry = new THREE.TubeGeometry(curve, Math.max(8, valid.length * 3), radius, 8, false);
      add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color })));
    }

    function addGradientDescentArrow(current, wTangent, bTangent, bounds, project) {
      if (!current || !wTangent?.length || !bTangent?.length) return;
      const dw = slopeFromTangent(wTangent, 0);
      const db = slopeFromTangent(bTangent, 1);
      if (!Number.isFinite(dw) || !Number.isFinite(db)) return;
      const length = Math.hypot(dw, db);
      if (!length) return;

      const wSpan = bounds.wMax - bounds.wMin || 1;
      const bSpan = bounds.bMax - bounds.bMin || 1;
      const step = Math.min(wSpan, bSpan) * 0.16;
      const next = [
        Number(current[0]) - (dw / length) * step,
        Number(current[1]) - (db / length) * step,
        Number(current[2]) - step * length,
      ];
      next[2] = Math.max(bounds.zMin, Math.min(bounds.zMax, next[2]));

      const start = project(current);
      const end = project(next);
      const direction = end.clone().sub(start);
      const visualLength = direction.length();
      if (!visualLength) return;
      const arrow = new THREE.ArrowHelper(
        direction.clone().normalize(),
        start,
        visualLength,
        GRADIENT_DIR_COLOR,
        Math.min(0.42, visualLength * 0.28),
        Math.min(0.24, visualLength * 0.16)
      );
      add(arrow);
    }

    function slopeFromTangent(points, axisIndex) {
      const a = points[0];
      const b = points[points.length - 1];
      const run = Number(b?.[axisIndex]) - Number(a?.[axisIndex]);
      const rise = Number(b?.[2]) - Number(a?.[2]);
      return run ? rise / run : NaN;
    }

    function addPoint(point, project, color, size) {
      const geometry = new THREE.SphereGeometry(size, 24, 16);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(project(point));
      add(mesh);
    }

    function uniqueSorted(values) {
      return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    }

    bindPointer();
    resize();

    return {
      setOption,
      getOption,
      resize,
      dispose,
      dispatchAction() {},
    };
  }

  window.createThreeLossSurfaceChart = createThreeLossSurfaceChart;
})();
