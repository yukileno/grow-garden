# こもれび農園

作物を育てる3D農園ゲームです。社会教室で正解すると、ゲーム内通貨と農園で遊べる時間が増えます。問題を開いてから30秒で答えが表示されます。

[こもれび農園を遊ぶ](https://yukileno.github.io/grow-garden/)

## ファイルの場所

| 変更したいもの | ファイル |
| --- | --- |
| 社会の問題文、正答、ヒント、資料 | [dist/social-questions.mjs](dist/social-questions.mjs) |
| 出題、制限時間、報酬 | [dist/study.mjs](dist/study.mjs) |
| 解答の採点 | [dist/grade-answer.mjs](dist/grade-answer.mjs) |
| 画面操作とブラウザ内保存 | [dist/app.js](dist/app.js) |
| 栽培や天候、アイテム | [dist/garden.js](dist/garden.js)、[dist/catalog.js](dist/catalog.js) |
| 3D表示 | [dist/world.mjs](dist/world.mjs) |

## 確認と公開

ローカルで確認するには、リポジトリのルートから次を実行し、ブラウザで `http://localhost:8000` を開きます。

```sh
python -m http.server 8000 --directory dist
```

`dist/` のファイルがGitHub Pagesに配信されます。`main` にプッシュすると [Deploy GitHub Pages](https://github.com/yukileno/grow-garden/actions/workflows/pages.yml) が実行され、配信の成否を確認できます。
