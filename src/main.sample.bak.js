/**
 * カスタムJavaScript
 * このファイルはindex.htmlから読み込まれ、ページの機能を拡張します
 */

// DOMが読み込まれたときに実行
document.addEventListener("DOMContentLoaded", () => {
  console.log("カスタムJSが読み込まれました");

  // ここにカスタム機能を追加できます
  // 例: ページ内の要素を取得して操作する
  const textElement = document.querySelector(
    "[data-s-23ea848c-0b53-48e9-90da-b9169171e52f]"
  );

  if (textElement) {
    // クリックイベントを追加
    textElement.addEventListener("click", () => {
      alert("テキストがクリックされました！");
    });

    // スタイルを少し変更
    textElement.style.cursor = "pointer";
    console.log("テキスト要素にイベントリスナーを追加しました");
  }
});
