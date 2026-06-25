const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, "public")));

// カスタムJSファイルの提供
app.use("/js", express.static(path.join(__dirname, "src")));

// ルートへのアクセスでindex.htmlを返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
