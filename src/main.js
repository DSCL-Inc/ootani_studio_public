/**
 * カスタムJavaScript — サイトの表現を豊かにする
 * --------------------------------------------------
 * 1) スクロールでフェードイン（IntersectionObserver）
 * 2) 背景に物理で転がるオブジェクト（Matter.js / CDN動的読込）
 *
 * STUDIO側ではこの1ファイルを <script src="..." defer> で読み込むだけ。
 * 動作確認はローカル（npm run dev → http://localhost:3000）または公開サイトで。
 * ※ STUDIOエディタ・プレビューでは動きません（公開サイトのみ）。
 */

(() => {
  "use strict";

  /* ============================================================
   * 設定（ここだけ触れば調整できます）
   * ========================================================== */
  const CONFIG = {
    fade: {
      // 明示指定したい要素のセレクタ。
      // STUDIOで対象要素に class「js-fade」を付ければ確実に対象になります。
      selector: ".js-fade, [data-fade]",
      // STUDIOのセクションを自動検出してフェード対象にする（推奨: true）。
      // STUDIOは全要素が .sd クラスのdiv構造なので、ページの主要ブロックを
      // 高さヒューリスティックで自動抽出します。
      autoStudio: true,
      autoMinHeight: 120, // 自動対象とみなす最小の高さ(px)
      threshold: 0.12, // 何割見えたら発火するか
      distance: 28, // 立ち上がりの移動量(px)
      duration: 700, // アニメ時間(ms)
      once: true, // 一度きり（falseで再入時に再生）
    },
    physics: {
      enabled: true,
      maxBodies: 18, // 同時に存在する最大数（多いほど重い）
      spawnIntervalMs: 1400, // 生成間隔
      // オブジェクトの色（キャンプらしいアースカラー）
      colors: ["#8d6e63", "#a1887f", "#6d8c5a", "#c9a86a", "#5d4037"],
      sizeRange: [16, 40], // 半径(px)
      opacity: 0.5, // 背景なので控えめに
      zIndex: 0, // コンテンツより奥に。必要なら -1
    },
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ============================================================
   * 1) スクロールでフェードイン
   * ========================================================== */
  // STUDIOの「セクション」を自動検出する。
  // 仕組み: メインキャンバスから下って、"高さのある子を複数持つ階層" を探し、
  // その直下の子（＝各セクション）を対象にする。
  function detectStudioSections(minH) {
    const start =
      document.querySelector("#__nuxt .StudioCanvas") ||
      document.querySelector("#__nuxt .render-canvas") ||
      document.querySelector("#__nuxt");
    if (!start) return [];

    const h = (el) => el.getBoundingClientRect().height;
    let node = start;
    for (let i = 0; i < 12; i++) {
      const nodeH = h(node) || 1;
      const kids = [...node.children].filter((k) => h(k) > minH);
      if (kids.length === 0) return [];
      const tallest = kids.reduce((a, b) => (h(a) >= h(b) ? a : b));
      // 同格のブロックが2つ以上 かつ 単独でほぼ全体(>80%)を占める子がない
      // ＝ ここが「セクションが並ぶ階層」。それ以外はラッパーなので降りる。
      if (kids.length >= 2 && h(tallest) < nodeH * 0.8) return kids;
      node = tallest;
    }
    return [];
  }

  function collectFadeTargets(c) {
    const targets = new Set();
    document.querySelectorAll(c.selector).forEach((el) => targets.add(el));
    if (c.autoStudio) {
      detectStudioSections(c.autoMinHeight).forEach((el) => targets.add(el));
    }
    return [...targets];
  }

  function initFadeIn() {
    const c = CONFIG.fade;

    const targets = collectFadeTargets(c);
    if (targets.length === 0) return;

    // reduced-motion の人にはアニメ無しで即表示
    if (prefersReducedMotion) {
      targets.forEach((el) => (el.style.opacity = "1"));
      return;
    }

    // 初期スタイルを付与
    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = `translateY(${c.distance}px)`;
      el.style.transition = `opacity ${c.duration}ms ease-out, transform ${c.duration}ms ease-out`;
      el.style.willChange = "opacity, transform";
    });

    const reveal = (el) => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    };
    const hide = (el) => {
      el.style.opacity = "0";
      el.style.transform = `translateY(${c.distance}px)`;
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            if (c.once) io.unobserve(entry.target);
          } else if (!c.once) {
            hide(entry.target);
          }
        });
      },
      { threshold: c.threshold }
    );

    targets.forEach((el) => io.observe(el));
  }

  /* ============================================================
   * 2) 背景に物理で転がるオブジェクト
   * ========================================================== */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initPhysics() {
    const p = CONFIG.physics;
    if (!p.enabled || prefersReducedMotion) return;

    // Matter.js を CDN から読込
    try {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"
      );
    } catch (e) {
      console.warn("Matter.js の読み込みに失敗しました", e);
      return;
    }

    const { Engine, Render, Runner, World, Bodies, Body, Composite } =
      window.Matter;

    // 背景用キャンバスを生成（クリックを邪魔しないよう pointer-events:none）
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position: "fixed",
      inset: "0",
      zIndex: String(p.zIndex),
      pointerEvents: "none",
      opacity: String(p.opacity),
    });
    document.body.appendChild(wrap);

    let W = window.innerWidth;
    let H = window.innerHeight;

    const engine = Engine.create();
    engine.gravity.y = 0.6; // ゆっくり落下

    const render = Render.create({
      element: wrap,
      engine: engine,
      options: {
        width: W,
        height: H,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);

    // 床と左右の壁（見えない）
    const wallOpts = { isStatic: true, render: { visible: false } };
    let ground = Bodies.rectangle(W / 2, H + 30, W * 2, 60, wallOpts);
    let leftWall = Bodies.rectangle(-30, H / 2, 60, H * 2, wallOpts);
    let rightWall = Bodies.rectangle(W + 30, H / 2, 60, H * 2, wallOpts);
    World.add(engine.world, [ground, leftWall, rightWall]);

    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    function spawn() {
      const dynamicCount = Composite.allBodies(engine.world).filter(
        (b) => !b.isStatic
      ).length;
      if (dynamicCount >= p.maxBodies) {
        // 上限なら一番古いものを消してから足す
        const dyn = Composite.allBodies(engine.world).filter((b) => !b.isStatic);
        if (dyn[0]) World.remove(engine.world, dyn[0]);
      }

      const r = rand(p.sizeRange[0], p.sizeRange[1]);
      const x = rand(r, W - r);
      const color = pick(p.colors);

      // 形をランダムに（円＝転がる / ポリゴン）
      let body;
      const shape = Math.random();
      const opts = {
        restitution: 0.4, // 弾み
        friction: 0.05,
        render: { fillStyle: color },
      };
      if (shape < 0.6) {
        body = Bodies.circle(x, -r, r, opts); // 円：よく転がる
      } else {
        const sides = Math.floor(rand(3, 6));
        body = Bodies.polygon(x, -r, sides, r, opts);
      }
      // 初速で横に転がす
      Body.setAngularVelocity(body, rand(-0.2, 0.2));
      Body.setVelocity(body, { x: rand(-2, 2), y: 0 });
      World.add(engine.world, body);
    }

    // 一定間隔で生成。タブが非表示の間は止める
    const timer = setInterval(() => {
      if (document.hidden) return;
      spawn();
    }, p.spawnIntervalMs);

    // 最初に少しだけ撒く
    for (let i = 0; i < 5; i++) setTimeout(spawn, i * 250);

    // リサイズ対応：壁とキャンバスを作り直す
    let resizeRAF;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(() => {
        W = window.innerWidth;
        H = window.innerHeight;
        render.canvas.width = W;
        render.canvas.height = H;
        render.options.width = W;
        render.options.height = H;
        World.remove(engine.world, [ground, leftWall, rightWall]);
        ground = Bodies.rectangle(W / 2, H + 30, W * 2, 60, wallOpts);
        leftWall = Bodies.rectangle(-30, H / 2, 60, H * 2, wallOpts);
        rightWall = Bodies.rectangle(W + 30, H / 2, 60, H * 2, wallOpts);
        World.add(engine.world, [ground, leftWall, rightWall]);
      });
    });

    // 後始末用（必要なら window.__campPhysics.stop() で停止）
    window.__campPhysics = {
      stop() {
        clearInterval(timer);
        Render.stop(render);
        Runner.stop(runner);
        World.clear(engine.world, false);
        Engine.clear(engine);
        wrap.remove();
      },
    };
  }

  /* ============================================================
   * 【DEBUG】読み込み確認用ブロック（確認できたらこのブロックごと削除）
   * - 背景を赤くする
   * - 右下に小さくデバッグ表示を出す
   * ========================================================== */
  function initDebug() {
    // 背景を赤に
    document.documentElement.style.background = "#e53935";
    document.body.style.background = "transparent";

    // 右下のデバッグバッジ
    const badge = document.createElement("div");
    badge.textContent = "main.js OK / " + new Date().toLocaleTimeString();
    Object.assign(badge.style, {
      position: "fixed",
      right: "8px",
      bottom: "8px",
      zIndex: "999999",
      padding: "4px 8px",
      font: "12px/1.4 monospace",
      color: "#fff",
      background: "rgba(0,0,0,0.75)",
      borderRadius: "4px",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(badge);
  }

  /* ============================================================
   * 起動
   * ========================================================== */
  // STUDIO(Nuxt)はハイドレーション後にコンテンツを描画するため、
  // フェード対象が現れるまで少し待ってから初期化する。
  function startFadeWhenReady(tries = 0) {
    const found = collectFadeTargets(CONFIG.fade).length > 0;
    if (found || tries >= 20) {
      initFadeIn(); // 見つかれば初期化（見つからなければ諦める）
      return;
    }
    setTimeout(() => startFadeWhenReady(tries + 1), 200); // 最大約4秒待つ
  }

  function start() {
    initDebug(); // 【DEBUG】読み込み確認（確認後この行も削除）
    startFadeWhenReady();
    initPhysics();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
