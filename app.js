// カリキュラムMarkdown ビューアー（ビルド不要・クライアントサイドSPA）
// index.json を読み込み、chapters/*.md を fetch して marked で描画する。

(function () {
  "use strict";

  // index.json の chapters[].items[] をフラット化した配列（表示順）
  var items = [];
  // id -> index の対応
  var idToIndex = {};

  var els = {
    topbarTitle: document.getElementById("topbar-title"),
    courseTitle: document.getElementById("course-title"),
    courseDesc: document.getElementById("course-desc"),
    nav: document.getElementById("nav"),
    article: document.getElementById("article"),
    pager: document.getElementById("pager"),
    menuToggle: document.getElementById("menu-toggle"),
    backdrop: document.getElementById("sidebar-backdrop"),
  };

  // marked の設定（GFM: テーブル・改行などに対応）
  if (window.marked && typeof window.marked.setOptions === "function") {
    window.marked.setOptions({ gfm: true, breaks: false });
  }

  function setState(target, message, isError) {
    target.innerHTML =
      '<p class="state' + (isError ? " error" : "") + '"></p>';
    target.firstChild.textContent = message;
  }

  function metaLabel(item) {
    var parts = [];
    if (typeof item.estimatedMinutes === "number") {
      parts.push("約" + item.estimatedMinutes + "分");
    }
    if (item.hasAssignment) parts.push("課題あり");
    return parts.join(" ・ ");
  }

  // ===== 起動 =====
  fetch("./index.json")
    .then(function (res) {
      if (!res.ok) throw new Error("index.json (" + res.status + ")");
      return res.json();
    })
    .then(init)
    .catch(function (err) {
      setState(els.article, "index.json の読み込みに失敗しました: " + err.message, true);
    });

  function init(data) {
    document.title = data.title || "カリキュラム";
    els.topbarTitle.textContent = data.title || "";
    els.courseTitle.textContent = data.title || "";
    els.courseDesc.textContent = data.description || "";

    // chapters[].items[] を順番にフラット化
    (data.chapters || []).forEach(function (chapter) {
      (chapter.items || []).forEach(function (item) {
        idToIndex[item.id] = items.length;
        items.push(item);
      });
    });

    buildNav();
    window.addEventListener("hashchange", route);
    route();
  }

  function buildNav() {
    var frag = document.createDocumentFragment();
    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.className = "nav-item";
      btn.id = "nav-" + item.id;
      btn.type = "button";

      var title = document.createElement("span");
      title.textContent = item.title;
      btn.appendChild(title);

      var meta = metaLabel(item);
      if (meta) {
        var m = document.createElement("span");
        m.className = "nav-meta";
        m.textContent = meta;
        btn.appendChild(m);
      }

      btn.addEventListener("click", function () {
        location.hash = "#" + item.id;
        closeNav();
      });
      frag.appendChild(btn);
    });
    els.nav.appendChild(frag);
  }

  // ===== ルーティング =====
  function route() {
    if (!items.length) return;
    var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    var idx = idToIndex.hasOwnProperty(id) ? idToIndex[id] : 0;
    showChapter(idx);
  }

  function showChapter(idx) {
    var item = items[idx];
    if (!item) return;

    // ナビのアクティブ表示
    var active = els.nav.querySelector(".nav-item.active");
    if (active) active.classList.remove("active");
    var current = document.getElementById("nav-" + item.id);
    if (current) {
      current.classList.add("active");
      current.scrollIntoView({ block: "nearest" });
    }

    els.topbarTitle.textContent = item.title;
    setState(els.article, "読み込み中…", false);
    els.pager.innerHTML = "";

    fetch("./" + item.path)
      .then(function (res) {
        if (!res.ok) throw new Error(item.path + " (" + res.status + ")");
        return res.text();
      })
      .then(function (md) {
        var metaHtml = "";
        var meta = metaLabel(item);
        if (meta) {
          metaHtml = '<div class="meta-bar">';
          if (typeof item.estimatedMinutes === "number") {
            metaHtml += '<span class="badge">約' + item.estimatedMinutes + "分</span>";
          }
          if (item.hasAssignment) {
            metaHtml += '<span class="badge assignment">課題あり</span>';
          }
          metaHtml += "</div>";
        }
        els.article.innerHTML = metaHtml + window.marked.parse(md);
        buildPager(idx);
        window.scrollTo(0, 0);
      })
      .catch(function (err) {
        setState(els.article, "本文の読み込みに失敗しました: " + err.message, true);
      });
  }

  function buildPager(idx) {
    var prev = items[idx - 1];
    var next = items[idx + 1];
    var html = "";

    if (prev) {
      html += link(prev, "prev", "← 前の章");
    } else {
      html += '<span class="spacer"></span>';
    }
    if (next) {
      html += link(next, "next", "次の章 →");
    } else {
      html += '<span class="spacer"></span>';
    }
    els.pager.innerHTML = html;
  }

  function link(item, cls, label) {
    return (
      '<a class="' + cls + '" href="#' + encodeURIComponent(item.id) + '">' +
      '<span class="pager-label">' + label + "</span>" +
      '<span class="pager-title">' + escapeHtml(item.title) + "</span></a>"
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ===== モバイル メニュー =====
  function openNav() {
    document.body.classList.add("nav-open");
    els.menuToggle.setAttribute("aria-expanded", "true");
  }
  function closeNav() {
    document.body.classList.remove("nav-open");
    els.menuToggle.setAttribute("aria-expanded", "false");
  }
  els.menuToggle.addEventListener("click", function () {
    if (document.body.classList.contains("nav-open")) closeNav();
    else openNav();
  });
  els.backdrop.addEventListener("click", closeNav);
})();
